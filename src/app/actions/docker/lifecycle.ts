"use server";

import {
  pollAndBroadcast,
  sendInstallProgress,
  type InstallProgressPayload,
} from "@/app/api/system/stream/route";
import { triggerAppsUpdate } from "@/lib/system-status/websocket-server";
import prisma from "@/lib/prisma";
import fs from "fs/promises";
import path from "path";
import { log, logAction } from "../maintenance/logger";
import { backupComposeFile, cleanupBackup, restoreComposeFile } from "./backup";
import {
  getAppMeta,
  getRecordedContainerName,
  removeInstalledAppRecord,
} from "./db";
import { waitForContainerRunning } from "./health";
import {
  DEFAULT_APP_ICON,
  execAsync,
  findComposeForApp,
  getContainerName,
  getInstalledAppDir,
  removeInstalledAppFiles,
  sanitizeComposeFile,
  validateAppId,
} from "./utils";

const TRASH_ROOT = "/DATA/AppTrash";

/**
 * Resolve compose file for an app, checking installed-apps first, then DB, then filesystem.
 */
async function resolveComposeForLifecycle(
  appId: string,
): Promise<{ appDir: string; composePath: string } | null> {
  // Check installed-apps first (new persistent location)
  const installedApp = await getInstalledAppDir(appId);
  if (installedApp) {
    await log.info("docker:lifecycle:resolve-compose:installed", {
      appId,
      composePath: installedApp.composePath,
    });
    return installedApp;
  }

  // Check DB (InstalledApp.installConfig.composePath) for legacy installs
  const installed = await prisma.installedApp.findFirst({
    where: { appId },
    orderBy: { updatedAt: "desc" },
    select: { installConfig: true },
  });

  const config = installed?.installConfig as Record<string, unknown> | null;
  const dbComposePath = config?.composePath as string | undefined;

  if (dbComposePath) {
    const fullPath = path.isAbsolute(dbComposePath)
      ? dbComposePath
      : path.join(process.cwd(), dbComposePath);
    try {
      await fs.access(fullPath);
      return { appDir: path.dirname(fullPath), composePath: fullPath };
    } catch {
      await log.warn("docker:lifecycle:resolve-compose:db-missing", {
        appId,
        fullPath,
      });
    }
  }

  // Fallback to filesystem search
  return findComposeForApp(appId);
}

/**
 * Run a compose lifecycle command (start/stop/restart) if a compose file exists.
 * Falls back to plain docker command for legacy containers.
 * Uses --project-name to match compose container management patterns.
 */
async function composeLifecycle(
  appId: string,
  action: "start" | "stop" | "restart",
): Promise<boolean> {
  const resolved = await resolveComposeForLifecycle(appId);
  if (resolved) {
    const { sanitizedPath } = await sanitizeComposeFile(resolved.composePath);
    await log.info("docker:lifecycle:compose-action", {
      appId,
      action,
      composePath: sanitizedPath,
    });
    await execAsync(
      `cd "${resolved.appDir}" && docker compose --project-name "${appId}" -f "${sanitizedPath}" ${action}`,
    );
    return true;
  }
  return false;
}

/**
 * Stop an app
 */
export async function stopApp(containerName: string): Promise<boolean> {
  await log.info("docker:stop:start", { containerName });

  try {
    if (!validateAppId(containerName)) {
      await log.warn("docker:stop:invalid-app-id", { containerName });
      return false;
    }

    const usedCompose = await composeLifecycle(containerName, "stop");
    if (!usedCompose) {
      await execAsync(`docker stop ${containerName}`);
    }

    await log.info("docker:stop:success", { containerName });
    void pollAndBroadcast();
    return true;
  } catch (error) {
    await log.error("docker:stop:error", {
      containerName,
      error: (error as Error)?.message || String(error),
    });
    return false;
  }
}

/**
 * Start an app
 */
export async function startApp(containerName: string): Promise<boolean> {
  await log.info("docker:start:start", { containerName });

  try {
    if (!validateAppId(containerName)) {
      await log.warn("docker:start:invalid-app-id", { containerName });
      return false;
    }

    const usedCompose = await composeLifecycle(containerName, "start");
    if (!usedCompose) {
      await execAsync(`docker start ${containerName}`);
    }

    const healthy = await waitForContainerRunning(containerName, 5, 2000);
    if (!healthy) {
      await log.warn("docker:start:container-not-running", { containerName });
      return false;
    }
    await log.info("docker:start:success", { containerName });
    void pollAndBroadcast();
    return true;
  } catch (error) {
    await log.error("docker:start:error", {
      containerName,
      error: (error as Error)?.message || String(error),
    });
    return false;
  }
}

/**
 * Restart an app
 */
export async function restartApp(containerName: string): Promise<boolean> {
  await log.info("docker:restart:start", { containerName });

  try {
    if (!validateAppId(containerName)) {
      await log.warn("docker:restart:invalid-app-id", { containerName });
      return false;
    }

    const usedCompose = await composeLifecycle(containerName, "restart");
    if (!usedCompose) {
      await execAsync(`docker restart ${containerName}`);
    }

    const healthy = await waitForContainerRunning(containerName, 5, 2000);
    if (!healthy) {
      await log.warn("docker:restart:container-not-running", { containerName });
      return false;
    }
    await log.info("docker:restart:success", { containerName });
    void pollAndBroadcast();
    return true;
  } catch (error) {
    await log.error("docker:restart:error", {
      containerName,
      error: (error as Error)?.message || String(error),
    });
    return false;
  }
}

/**
 * Update an app by pulling new images and recreating containers
 */
export async function updateApp(containerName: string): Promise<boolean> {
  if (!validateAppId(containerName)) return false;

  let meta = { name: containerName, icon: DEFAULT_APP_ICON };
  try {
    meta = await getAppMeta(containerName);
  } catch {
    // Use fallback meta
  }

  const emitProgress = (
    progress: number,
    message: string,
    status: InstallProgressPayload["status"] = "running",
  ) =>
    sendInstallProgress({
      type: "install-progress",
      appId: containerName,
      containerName,
      name: meta.name,
      icon: meta.icon,
      progress,
      status,
      message,
    });

  emitProgress(0.05, "Starting update", "starting");

  const resolved = await resolveComposeForLifecycle(containerName);
  if (!resolved) {
    await log.warn("docker:update:compose-not-found", { containerName });
    emitProgress(1, "Compose file not found", "error");
    return false;
  }

  const backupPath = await backupComposeFile(
    resolved.composePath,
    containerName,
  );

  try {
    const { sanitizedPath } = await sanitizeComposeFile(resolved.composePath);
    const envVars: NodeJS.ProcessEnv = {
      ...process.env,
      CONTAINER_NAME: containerName,
    };

    emitProgress(0.2, "Pulling latest images");
    await execAsync(
      `cd "${resolved.appDir}" && docker compose --project-name "${containerName}" -f "${sanitizedPath}" pull`,
      { env: envVars },
    );

    emitProgress(0.6, "Recreating containers");
    await execAsync(
      `cd "${resolved.appDir}" && docker compose --project-name "${containerName}" -f "${sanitizedPath}" up -d`,
      { env: envVars },
    );

    emitProgress(0.85, "Verifying container health");
    const healthy = await waitForContainerRunning(containerName, 5, 2000);
    if (!healthy) {
      await log.warn("docker:update:container-not-healthy", { containerName });

      // Attempt rollback
      if (backupPath) {
        emitProgress(0.9, "Rolling back to previous version");
        await restoreComposeFile(backupPath, resolved.composePath);
        const { sanitizedPath: rollbackSanitized } = await sanitizeComposeFile(
          resolved.composePath,
        );
        await execAsync(
          `cd "${resolved.appDir}" && docker compose --project-name "${containerName}" -f "${rollbackSanitized}" up -d`,
          { env: envVars },
        ).catch(() => null);
      }

      await cleanupBackup(containerName);
      emitProgress(1, "Rolled back after failed update", "error");
      await logAction("update:error", {
        containerName,
        error: "Container not healthy, rolled back",
      });
      return false;
    }

    await cleanupBackup(containerName);
    await triggerAppsUpdate();
    await logAction("update:success", { containerName });
    emitProgress(1, "Update complete", "completed");
    return true;
  } catch (error) {
    await log.error("docker:update:error", {
      containerName,
      error: (error as Error)?.message || String(error),
    });

    // Attempt rollback on exception
    if (backupPath) {
      await restoreComposeFile(backupPath, resolved.composePath).catch(
        () => null,
      );
      const envVars: NodeJS.ProcessEnv = {
        ...process.env,
        CONTAINER_NAME: containerName,
      };
      let rollbackPath = resolved.composePath;
      try {
        const { sanitizedPath } = await sanitizeComposeFile(resolved.composePath);
        rollbackPath = sanitizedPath;
      } catch {
        // Use original
      }
      await execAsync(
        `cd "${resolved.appDir}" && docker compose --project-name "${containerName}" -f "${rollbackPath}" up -d`,
        { env: envVars },
      ).catch(() => null);
    }
    await cleanupBackup(containerName);

    const errorMsg = (error as Error)?.message ?? "unknown";
    await logAction("update:error", { containerName, error: errorMsg });
    emitProgress(1, "Update failed, rolled back", "error");
    return false;
  }
}

type UninstallOptions = {
  removeAppData?: boolean;
};

/**
 * Uninstall an app (remove container and volumes).
 * By default, app data is moved to /DATA/AppTrash. Set removeAppData=true
 * to permanently delete /DATA/AppData/<appId>.
 */
export async function uninstallApp(
  appId: string,
  options?: UninstallOptions,
): Promise<boolean> {
  await log.info("docker:uninstall:start", { appId });

  try {
    if (!validateAppId(appId)) {
      await log.warn("docker:uninstall:invalid-app-id", { appId });
      return false;
    }

    const recordedContainer = await getRecordedContainerName(appId);
    const generatedContainer = getContainerName(appId);
    const containerCandidates = Array.from(
      new Set([recordedContainer, generatedContainer].filter(Boolean)),
    ) as string[];

    // Try docker compose down (covers multiple service names)
    const resolved = await resolveComposeForLifecycle(appId);
    if (resolved) {
      try {
        const { sanitizedPath } = await sanitizeComposeFile(
          resolved.composePath,
        );
        await log.info("docker:uninstall:compose-down", { appId, composePath: sanitizedPath });
        await execAsync(
          `cd "${resolved.appDir}" && docker compose --project-name "${appId}" -f "${sanitizedPath}" down -v --remove-orphans`,
        );
      } catch (composeErr) {
        await log.warn("docker:uninstall:compose-down-failed", {
          appId,
          error: (composeErr as Error)?.message || String(composeErr),
        });
      }
    }

    // Explicitly remove any remaining candidate containers
    for (const name of containerCandidates) {
      try {
        await log.info("docker:uninstall:remove-container", { appId, containerName: name });
        await execAsync(`docker rm -f ${name}`);
      } catch (err) {
        await log.warn("docker:uninstall:remove-container-failed", {
          appId,
          containerName: name,
          error: (err as Error)?.message || String(err),
        });
      }
    }

    const removeAppData = options?.removeAppData === true;
    const appDataPath = path.join("/DATA/AppData", appId);
    if (removeAppData) {
      try {
        await fs.rm(appDataPath, { recursive: true, force: true });
        await log.info("docker:uninstall:removed-data", { appId, appDataPath });
      } catch (cleanupError) {
        await log.warn("docker:uninstall:remove-data-failed", {
          appId,
          appDataPath,
          error: (cleanupError as Error)?.message || String(cleanupError),
        });
      }
    } else {
      try {
        const trashDir = path.join(TRASH_ROOT, `${appId}_${Date.now()}`);
        await fs.mkdir(TRASH_ROOT, { recursive: true });
        await fs.rename(appDataPath, trashDir);
        await log.info("docker:uninstall:moved-to-trash", { appId, trashDir });
      } catch (moveError) {
        await log.warn("docker:uninstall:move-to-trash-failed", {
          appId,
          appDataPath,
          error: (moveError as Error)?.message || String(moveError),
        });
      }
    }

    // Clean up installed-apps directory
    await removeInstalledAppFiles(appId);

    for (const name of containerCandidates) {
      await removeInstalledAppRecord(name);
    }
    await triggerAppsUpdate();
    void pollAndBroadcast();

    await log.info("docker:uninstall:success", { appId });
    return true;
  } catch (error) {
    await log.error("docker:uninstall:error", {
      appId,
      error: (error as Error)?.message || String(error),
    });
    return false;
  }
}

/**
 * Remove an unmanaged container.
 * This only removes the container itself (docker rm -f) and does not touch
 * app data directories managed by Homeio.
 */
export async function removeContainer(containerName: string): Promise<boolean> {
  await log.info("docker:container:remove:start", { containerName });

  try {
    if (!validateAppId(containerName)) {
      await log.warn("docker:container:remove:invalid-name", { containerName });
      return false;
    }

    await execAsync(`docker rm -f ${containerName}`);
    void pollAndBroadcast();
    await triggerAppsUpdate();
    await log.info("docker:container:remove:success", { containerName });
    return true;
  } catch (error) {
    await log.error("docker:container:remove:error", {
      containerName,
      error: (error as Error)?.message || String(error),
    });
    return false;
  }
}

/**
 * List apps in the trash directory.
 */
export async function listTrashedApps(): Promise<
  { appId: string; trashedAt: number; path: string }[]
> {
  try {
    const entries = await fs.readdir(TRASH_ROOT, { withFileTypes: true });
    return entries
      .filter((e) => e.isDirectory())
      .map((e) => {
        const parts = e.name.split("_");
        const timestamp = parseInt(parts[parts.length - 1], 10);
        const appId = parts.slice(0, -1).join("_");
        return {
          appId,
          trashedAt: Number.isFinite(timestamp) ? timestamp : 0,
          path: path.join(TRASH_ROOT, e.name),
        };
      });
  } catch {
    return [];
  }
}

/**
 * Permanently delete a specific trashed app or the entire trash.
 */
export async function emptyTrash(appId?: string): Promise<boolean> {
  try {
    if (appId) {
      const entries = await fs.readdir(TRASH_ROOT).catch(() => [] as string[]);
      for (const entry of entries) {
        if (entry.startsWith(`${appId}_`)) {
          await fs.rm(path.join(TRASH_ROOT, entry), {
            recursive: true,
            force: true,
          });
        }
      }
    } else {
      await fs.rm(TRASH_ROOT, { recursive: true, force: true });
    }
    return true;
  } catch {
    return false;
  }
}
