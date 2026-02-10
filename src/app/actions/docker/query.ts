"use server";

import type { InstalledApp } from "@/components/app-store/types";
import prisma from "@/lib/prisma";
import { logAction } from "../maintenance/logger";
import {
  getAllAppMeta,
  getInstallConfig,
  getInstalledAppRecords,
  getRecordedContainerName,
} from "./db";
import {
  CONTAINER_PREFIX,
  DEFAULT_APP_ICON,
  aggregateStatus,
  execAsync,
  getContainerName,
  groupContainersByProject,
  listContainersWithLabels,
  resolveHostPort,
  validateAppId,
  validatePort,
} from "./utils";

/**
 * Get list of installed Homeio apps.
 * Groups containers by compose project so multi-service apps show as one entry.
 */
export async function getInstalledApps(): Promise<InstalledApp[]> {
  console.log("[Docker] getInstalledApps: Fetching installed apps...");

  try {
    const [knownApps, storeApps, containers] = await Promise.all([
      getInstalledAppRecords(),
      getAllAppMeta(),
      listContainersWithLabels(),
    ]);

    const metaByContainer = new Map(
      knownApps.map((app) => [app.containerName, app]),
    );
    const metaByAppId = new Map(knownApps.map((app) => [app.appId, app]));

    const appMetaById = new Map<string, (typeof storeApps)[number][]>();
    for (const app of storeApps) {
      const list = appMetaById.get(app.appId) ?? [];
      list.push(app);
      appMetaById.set(app.appId, list);
    }

    // Group containers by compose project
    const groups = groupContainersByProject(containers);

    console.log(
      `[Docker] getInstalledApps: ${containers.length} containers in ${groups.size} groups`,
    );

    const apps: InstalledApp[] = [];

    for (const [projectKey, groupContainers] of groups) {
      // Primary container is the first one (or the one we have a DB record for)
      const primaryContainer =
        groupContainers.find((c) => metaByContainer.has(c.name)) ||
        groupContainers[0];

      const containerNames = groupContainers.map((c) => c.name);

      // Clean appId (remove prefix if any)
      const rawId = CONTAINER_PREFIX
        ? primaryContainer.name.replace(new RegExp(`^${CONTAINER_PREFIX}`), "")
        : primaryContainer.name;

      const record = metaByContainer.get(primaryContainer.name);
      // Also check if any group container matches a DB record
      const anyRecord =
        record ||
        groupContainers.map((c) => metaByContainer.get(c.name)).find(Boolean) ||
        // Fallback: match by compose project key → appId
        // This handles cases where the DB containerName doesn't match
        // the actual container name, but the compose project does match
        metaByAppId.get(projectKey);

      const resolvedAppId = anyRecord?.appId || projectKey || rawId;
      const storeMetaCandidates = appMetaById.get(resolvedAppId) ?? [];
      const storeMeta = anyRecord?.storeId
        ? storeMetaCandidates.find((m) => m.storeId === anyRecord.storeId) ||
          storeMetaCandidates[0]
        : storeMetaCandidates[0];

      // Aggregate status across all containers in the group
      const status = aggregateStatus(groupContainers);

      // Use stored webUIPort from DB if available, otherwise resolve from Docker
      const storedWebUIPort = (
        anyRecord?.installConfig as Record<string, unknown> | undefined
      )?.webUIPort as string | number | undefined;
      const hostPort = await resolveHostPort(
        primaryContainer.name,
        storedWebUIPort ?? null,
      );
      const webUIPort = hostPort ? parseInt(hostPort, 10) : undefined;

      // Get containers list from DB record if available
      const dbContainers = (anyRecord?.installConfig as Record<string, unknown>)
        ?.containers as string[] | undefined;

      apps.push({
        id: primaryContainer.name,
        appId: resolvedAppId,
        name: anyRecord?.name || storeMeta?.title || storeMeta?.name || rawId,
        icon: anyRecord?.icon || storeMeta?.icon || DEFAULT_APP_ICON,
        status,
        webUIPort,
        containerName: primaryContainer.name,
        containers:
          containerNames.length > 1
            ? containerNames
            : dbContainers || containerNames,
        installedAt: anyRecord?.createdAt?.getTime?.() || Date.now(),
      });
    }

    console.log(
      `[Docker] getInstalledApps: Found ${apps.length} installed apps`,
    );
    return apps;
  } catch (error) {
    console.error("[Docker] getInstalledApps: Error:", error);
    return [];
  }
}

/**
 * Get a single installed app by id
 */
export async function getAppById(appId: string): Promise<InstalledApp | null> {
  if (!validateAppId(appId)) return null;
  const apps = await getInstalledApps();
  const match = apps.find(
    (a) =>
      a.appId.toLowerCase() === appId.toLowerCase() ||
      a.containerName === getContainerName(appId),
  );
  return match ?? null;
}

/**
 * Get status of a specific app.
 * Tries the recorded container name first, then the generated fallback.
 */
export async function getAppStatus(
  appId: string,
): Promise<"running" | "stopped" | "error"> {
  try {
    if (!validateAppId(appId)) {
      return "error";
    }

    const recorded = await getRecordedContainerName(appId);
    const candidates = [
      recorded,
      getContainerName(appId),
    ].filter(Boolean) as string[];

    for (const name of candidates) {
      try {
        const { stdout } = await execAsync(
          `docker inspect -f '{{.State.Status}}' ${name}`,
        );
        const status = stdout.trim();
        if (status === "running") return "running";
        if (status === "exited") return "error";
        return "stopped";
      } catch {
        // Try next candidate
      }
    }

    return "error";
  } catch {
    return "error";
  }
}

/**
 * Get web UI URL for an app
 */
export async function getAppWebUI(appId: string): Promise<string | null> {
  try {
    if (!validateAppId(appId)) {
      await logAction(
        "app:webui:resolve:error",
        { appId, reason: "invalid-app-id" },
        "warn",
      );
      return null;
    }

    await logAction("app:webui:resolve:start", { appId });

    const installRecord = await prisma.installedApp.findFirst({
      where: { appId },
      orderBy: { updatedAt: "desc" },
      select: { storeId: true, installConfig: true, containerName: true },
    });

    const recordedContainer =
      installRecord?.containerName ?? (await getRecordedContainerName(appId));
    const containerCandidates = [
      recordedContainer,
      getContainerName(appId),
    ].filter(Boolean) as string[];
    const host =
      process.env.HOMEIO_DOMAIN ||
      process.env.HOMEIO_HOST ||
      process.env.HOMEIO_HTTP_HOST ||
      process.env.HOSTNAME ||
      "localhost";
    const protocol = process.env.HOMEIO_HTTPS === "true" ? "https" : "http";

    let resolvedUrl: string | null = null;
    let resolutionMethod:
      | "host-port"
      | "metadata-port"
      | "path-only"
      | "unresolved" = "unresolved";

    // 2) Pull app metadata for fallback port/path, preferring the store it was installed from
    const appMeta = await prisma.app.findFirst({
      where: installRecord?.storeId
        ? { appId, storeId: installRecord.storeId }
        : { appId },
      orderBy: { createdAt: "desc" },
      select: { port: true, path: true, storeId: true },
    });

    // 2b) Check installConfig.webUIPort first — this is the user-configured port
    const installConfig =
      (installRecord?.installConfig as Record<string, unknown> | null) ??
      (await getInstallConfig(appId));
    const configWebUIPort = installConfig?.webUIPort as string | undefined;

    // 1) Prefer published host port from Docker (works for bridge mode)
    //    Pass configWebUIPort > appMeta.port as preferred so we pick the right mapping
    //    (e.g. Jellyfin exposes 8096, 8920, 7359, 1900 — we want 8096)
    const preferredPort = configWebUIPort || appMeta?.port || null;
    let hostPort: string | null = null;
    for (const name of containerCandidates) {
      hostPort = await resolveHostPort(name, preferredPort);
      if (hostPort) break;
    }
    const pathSuffix =
      appMeta?.path && appMeta.path.length > 0
        ? appMeta.path.startsWith("/")
          ? appMeta.path
          : `/${appMeta.path}`
        : "";

    if (hostPort) {
      resolvedUrl = `${protocol}://${host}:${hostPort}${pathSuffix}`;
      resolutionMethod = "host-port";
    } else if (configWebUIPort && validatePort(configWebUIPort)) {
      resolvedUrl = `${protocol}://${host}:${configWebUIPort}${pathSuffix}`;
      resolutionMethod = "metadata-port";
    } else if (appMeta?.port && validatePort(appMeta.port)) {
      resolvedUrl = `${protocol}://${host}:${appMeta.port}${pathSuffix}`;
      resolutionMethod = "metadata-port";
    } else if (pathSuffix) {
      resolvedUrl = `${protocol}://${host}${pathSuffix}`;
      resolutionMethod = "path-only";
    }

    if (resolvedUrl) {
      await logAction("app:webui:resolve:success", {
        appId,
        url: resolvedUrl,
        method: resolutionMethod,
      });
      return resolvedUrl;
    }

    await logAction(
      "app:webui:resolve:error",
      { appId, reason: "unresolved" },
      "warn",
    );
    return null;
  } catch (error) {
    await logAction(
      "app:webui:resolve:error",
      {
        appId,
        reason: "exception",
        message: (error as Error)?.message,
      },
      "error",
    );
    console.error(
      `[Docker] getAppWebUI: failed to resolve URL for ${appId}:`,
      error,
    );
    return null;
  }
}

/**
 * Get app logs.
 * Tries the recorded container name first, then the generated fallback.
 */
export async function getAppLogs(
  appId: string,
  lines: number = 100,
): Promise<string> {
  console.log(
    `[Docker] getAppLogs: Getting logs for app "${appId}" (last ${lines} lines)...`,
  );

  try {
    if (!validateAppId(appId)) {
      console.warn(`[Docker] getAppLogs: Invalid app ID: "${appId}"`);
      return "Error: Invalid app ID";
    }

    const recorded = await getRecordedContainerName(appId);
    const candidates = [
      recorded,
      getContainerName(appId),
    ].filter(Boolean) as string[];

    for (const containerName of candidates) {
      try {
        const command = `docker logs --tail ${lines} ${containerName}`;
        const { stdout, stderr } = await execAsync(command);
        const logs = stdout || stderr;
        if (!logs) continue;

        console.log(
          `[Docker] getAppLogs: Retrieved ${logs.split("\n").length} lines from "${containerName}"`,
        );
        return logs;
      } catch {
        // Try next candidate
      }
    }

    console.log(`[Docker] getAppLogs: No logs available for "${appId}"`);
    return "No logs available";
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(
      `[Docker] getAppLogs: Error getting logs for "${appId}":`,
      error,
    );
    return `Error retrieving logs: ${errorMessage}`;
  }
}
