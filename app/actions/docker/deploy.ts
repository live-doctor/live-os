"use server";

import {
  sendInstallProgress,
  type InstallProgressPayload,
} from "@/app/api/system/stream/route";
import type { InstallConfig } from "@/components/app-store/types";
import prisma from "@/lib/prisma";
import { triggerAppsUpdate } from "@/lib/system-status/websocket-server";
import { spawn } from "child_process";
import fs from "fs/promises";
import path from "path";
import YAML from "yaml";
import { logAction } from "../maintenance/logger";
import { getAppMeta, recordInstalledApp } from "./db";
import { checkDependencies } from "./dependencies";
import {
  buildDefaultEnvVars,
  buildUmbrelEnvVars,
  detectStoreType,
  type StoreType,
} from "./env";
import {
  copyAppToInstalledApps,
  DEFAULT_APP_ICON,
  detectAllComposeContainerNames,
  detectComposeContainerName,
  execAsync,
  findComposeForApp,
  getContainerName,
  getContainerNameFromCompose,
  getInstalledAppDir,
  guessComposeContainerName,
  INSTALLED_APPS_ROOT,
  preSeedDataFiles,
  sanitizeComposeFile,
  validateAppId,
  validatePort,
} from "./utils";

export interface DeployOptions {
  appId: string;
  /** Raw compose YAML content (custom deploy, edit/redeploy) */
  composeContent?: string;
  /** Path to existing compose file (store install) */
  composePath?: string;
  /** Port/volume/env overrides */
  config?: InstallConfig;
  /** Display metadata for UI and DB */
  meta?: { name?: string; icon?: string };
  /** Store ID (foreign key) — preserved on redeploy */
  storeId?: string;
  /** Original container metadata from store — preserved on redeploy */
  containerMeta?: Record<string, unknown>;
}

/**
 * Unified deploy pipeline for all app installations.
 * Handles store installs, custom deploys, and edit/redeploy.
 */
export async function deployApp(
  options: DeployOptions,
): Promise<{ success: boolean; error?: string }> {
  const { appId, config, meta: metaOverride, containerMeta } = options;

  await logAction("deploy:start", { appId });
  console.log(`[Docker] deployApp: Starting deployment for "${appId}"`);

  let meta = { name: appId, icon: DEFAULT_APP_ICON };

  try {
    meta = await getAppMeta(appId, metaOverride);

    const emitProgress = (
      progress: number,
      message: string,
      status: InstallProgressPayload["status"] = "running",
    ) =>
      sendInstallProgress({
        type: "install-progress",
        containerName: appId,
        name: meta.name,
        icon: meta.icon,
        progress,
        status,
        message,
      });

    emitProgress(0.05, "Preparing deployment", "starting");

    // Validate inputs
    if (!validateAppId(appId)) {
      emitProgress(1, "Invalid app ID", "error");
      return { success: false, error: "Invalid app ID" };
    }

    if (config) {
      for (const port of config.ports) {
        if (!validatePort(port.published)) {
          emitProgress(1, `Invalid port: ${port.published}`, "error");
          return { success: false, error: `Invalid port: ${port.published}` };
        }
      }
    }

    // Check dependencies (for store apps)
    const depCheck = await checkDependencies(appId);
    if (!depCheck.satisfied) {
      const missingList = depCheck.missing.join(", ");
      emitProgress(1, `Missing dependencies: ${missingList}`, "error");
      return { success: false, error: `Missing dependencies: ${missingList}` };
    }

    // Resolve compose file
    const resolved = await resolveCompose(options);
    if (!resolved) {
      emitProgress(1, "Compose file not found", "error");
      return {
        success: false,
        error:
          "Compose file not found. Provide compose content or ensure the app is in a store.",
      };
    }

    const { appDir, composePath: resolvedComposePath } = resolved;

    // Detect store type for proper environment variable handling
    const storeType = await detectStoreType(options.storeId, resolvedComposePath);
    console.log(`[Docker] deployApp: Detected store type "${storeType}" for "${appId}"`);

    // If this is an update/redeploy, tear down old containers first
    if (options.composeContent) {
      await tearDownExisting(appDir, appId);
    }

    // Sanitize compose (temp file for docker, original path for DB)
    // Pass store type for store-specific sanitization (e.g., Umbrel app_proxy)
    const { sanitizedPath, originalPath } =
      await sanitizeComposeFile(resolvedComposePath, storeType);

    console.log(
      `[Docker] deployApp: Using compose at ${sanitizedPath} (original: ${originalPath})`,
    );
    emitProgress(0.15, "Configuring deployment");

    // Build environment variables based on store type
    // Umbrel and custom stores may expect different env vars
    const envVars = await buildEnvVars(appId, storeType, config);

    // Resolve container name
    const composeContainerName =
      await getContainerNameFromCompose(resolvedComposePath);
    const containerName = composeContainerName || getContainerName(appId);
    envVars.CONTAINER_NAME = containerName;

    // Pre-seed data files from store app directory to APP_DATA_DIR.
    // Umbrel apps include files (entrypoint.sh, default-password, etc.)
    // alongside the compose file, referenced via ${APP_DATA_DIR}/filename.
    // If those files don't exist at mount time, Docker creates directories
    // instead of files, causing "is a directory" errors.
    const appDataDir = envVars.APP_DATA_DIR!;
    await preSeedDataFiles(appDir, appDataDir);

    emitProgress(0.2, "Pre-seeding complete");

    // Pull images with progress streaming
    emitProgress(0.35, "Pulling images");
    await streamComposePull(
      appDir,
      sanitizedPath,
      envVars,
      (progress, message) =>
        emitProgress(progress, message ?? "Pulling images"),
    );

    // Start services
    emitProgress(0.85, "Starting services");
    const { stdout, stderr } = await execAsync(
      `cd "${appDir}" && docker compose -f "${sanitizedPath}" up -d`,
      { env: envVars },
    );

    if (stdout) {
      console.log(`[Docker] deployApp: stdout: ${stdout.substring(0, 200)}`);
    }
    if (stderr && !isComposeNoise(stderr)) {
      console.error("[Docker] deployApp: stderr:", stderr);
    }

    emitProgress(0.9, "Finalizing deployment");

    // Detect container names
    const detectedContainer =
      (await detectComposeContainerName(appDir, sanitizedPath)) ||
      guessComposeContainerName(resolvedComposePath) ||
      containerName;

    const allContainers = await detectAllComposeContainerNames(appDir);

    // Extract web UI port and network mode from compose (best-effort)
    const composeMeta = await extractComposeMeta(sanitizedPath);

    // Resolve store ID (foreign key to Store table)
    const storeId = await resolveStoreId(appId, options.storeId);

    // Resolve container metadata from store if not provided
    const resolvedContainerMeta =
      containerMeta ?? (await resolveContainerMeta(appId));

    // Save to DB — always use originalPath, never the temp sanitized path
    const persistedConfig: Record<string, unknown> = {
      ...(config && {
        ports: config.ports,
        volumes: config.volumes,
        environment: config.environment,
        webUIPort: config.webUIPort ?? composeMeta.webUIPort,
        networkMode: config.networkMode ?? composeMeta.networkMode,
      }),
      composePath: originalPath,
      deployMethod: "compose",
      containers:
        allContainers.length > 0 ? allContainers : [detectedContainer],
    };

    await recordInstalledApp(
      appId,
      detectedContainer,
      metaOverride,
      persistedConfig,
      storeId,
      resolvedContainerMeta,
    );

    await triggerAppsUpdate();
    await logAction("deploy:success", {
      appId,
      containerName: detectedContainer,
    });
    emitProgress(1, "Deployment complete", "completed");
    console.log(`[Docker] deployApp: Successfully deployed "${appId}"`);
    return { success: true };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[Docker] deployApp: Error deploying "${appId}":`, error);
    await logAction("deploy:error", { appId, error: errorMessage }, "error");
    sendInstallProgress({
      type: "install-progress",
      containerName: appId,
      name: meta.name,
      icon: meta.icon,
      progress: 1,
      status: "error",
      message: "Deployment failed",
    });
    return {
      success: false,
      error: errorMessage || "Failed to deploy app",
    };
  }
}

/**
 * Convert a `docker run` command into docker-compose YAML using composerize.
 */
export async function convertDockerRunToCompose(
  command: string,
): Promise<{ success: boolean; yaml?: string; error?: string }> {
  if (!command.trim()) {
    return { success: false, error: "Command is empty" };
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const composerize = ((await import("composerize")) as any).default;
    const yaml = composerize(command.trim());
    return { success: true, yaml };
  } catch (error: unknown) {
    console.error("[Docker] composerize error:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to convert docker run command",
    };
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Resolve where the compose file is, based on DeployOptions.
 *
 * For store apps, we copy the compose file to installed-apps/{appId}/ so the
 * app remains manageable even if the store is deleted or refreshed.
 */
async function resolveCompose(
  options: DeployOptions,
): Promise<{ appDir: string; composePath: string } | null> {
  const { appId, composeContent, composePath } = options;

  // Case 1: Raw YAML provided — write to custom-apps/{appId}/
  if (composeContent) {
    await fs.mkdir(INSTALLED_APPS_ROOT, { recursive: true });
    const appDir = path.join(INSTALLED_APPS_ROOT, appId);
    await fs.mkdir(appDir, { recursive: true });
    const filePath = path.join(appDir, "docker-compose.yml");
    await fs.writeFile(filePath, composeContent, "utf-8");
    console.log(`[Docker] resolveCompose: Wrote compose to ${filePath}`);
    return { appDir, composePath: filePath };
  }

  // Case 2: Check if app is already installed (has files in installed-apps)
  // This handles re-deploys and edits of already-installed apps
  const installedApp = await getInstalledAppDir(appId);
  if (installedApp) {
    console.log(
      `[Docker] resolveCompose: Using existing installed app at ${installedApp.composePath}`,
    );
    return installedApp;
  }

  // Case 3: Explicit compose path provided (store install)
  // Copy to installed-apps for persistence
  if (composePath) {
    let fullPath = composePath;
    if (!path.isAbsolute(composePath)) {
      fullPath = path.join(process.cwd(), composePath);
    }
    try {
      await fs.access(fullPath);
      const storeAppDir = path.dirname(fullPath);
      // Copy store app to installed-apps
      const copied = await copyAppToInstalledApps(storeAppDir, appId);
      console.log(
        `[Docker] resolveCompose: Copied store app to ${copied.composePath}`,
      );
      return copied;
    } catch {
      console.warn(
        `[Docker] resolveCompose: Provided composePath not found: ${fullPath}`,
      );
      // Fall through to DB/filesystem search
    }
  }

  // Case 4: Look up from App table in DB
  const appRecord = await prisma.app.findFirst({
    where: { appId },
    orderBy: { createdAt: "desc" },
    select: { composePath: true },
  });

  if (appRecord?.composePath) {
    const dbPath = path.isAbsolute(appRecord.composePath)
      ? appRecord.composePath
      : path.join(process.cwd(), appRecord.composePath);
    try {
      await fs.access(dbPath);
      const storeAppDir = path.dirname(dbPath);
      // Copy store app to installed-apps
      const copied = await copyAppToInstalledApps(storeAppDir, appId);
      console.log(
        `[Docker] resolveCompose: Copied store app (from DB) to ${copied.composePath}`,
      );
      return copied;
    } catch {
      console.warn(
        `[Docker] resolveCompose: DB composePath not found: ${dbPath}`,
      );
    }
  }

  // Case 5: Filesystem search as last fallback
  const found = await findComposeForApp(appId);
  if (found) {
    // If found in external-apps or internal-apps, copy to installed-apps
    if (
      found.appDir.includes("external-apps") ||
      found.appDir.includes("internal-apps")
    ) {
      const copied = await copyAppToInstalledApps(found.appDir, appId);
      console.log(
        `[Docker] resolveCompose: Copied found app to ${copied.composePath}`,
      );
      return copied;
    }
    return found;
  }

  return null;
}

/**
 * Tear down existing containers before redeploying.
 */
async function tearDownExisting(appDir: string, appId: string): Promise<void> {
  try {
    await execAsync(`cd "${appDir}" && docker compose down`);
    console.log(
      `[Docker] tearDownExisting: Tore down existing containers for "${appId}"`,
    );
  } catch {
    // Fallback: force remove the container directly
    try {
      await execAsync(`docker rm -f "${getContainerName(appId)}"`);
    } catch {
      // No existing containers — that's fine
    }
  }
}

/**
 * Build environment variables based on store type.
 *
 * Umbrel and custom stores may expect different environment variables.
 * This function dispatches to the appropriate builder based on the
 * detected store type.
 */
async function buildEnvVars(
  appId: string,
  storeType: StoreType,
  config?: InstallConfig,
): Promise<NodeJS.ProcessEnv> {
  switch (storeType) {
    case "umbrel":
      console.log(`[Docker] buildEnvVars: Using Umbrel env builder for "${appId}"`);
      return buildUmbrelEnvVars(appId, config);

    case "custom":
    default:
      console.log(`[Docker] buildEnvVars: Using default env builder for "${appId}"`);
      return buildDefaultEnvVars(appId, config);
  }
}

/**
 * Resolve the store ID for an app.
 * If explicitly provided, use that. Otherwise look up from App table or existing InstalledApp.
 * Returns undefined for custom apps (no store association).
 */
async function resolveStoreId(
  appId: string,
  explicitStoreId?: string,
): Promise<string | undefined> {
  if (explicitStoreId) return explicitStoreId;

  // Check if there's an existing InstalledApp record with a storeId
  const existing = await prisma.installedApp.findFirst({
    where: { appId },
    select: { storeId: true },
  });
  if (existing?.storeId) return existing.storeId;

  // Look up from App table
  const appRecord = await prisma.app.findFirst({
    where: { appId },
    select: { storeId: true },
    orderBy: { createdAt: "desc" },
  });
  return appRecord?.storeId ?? undefined;
}

/**
 * Resolve container metadata from store App table.
 */
async function resolveContainerMeta(
  appId: string,
): Promise<Record<string, unknown> | undefined> {
  // Check existing InstalledApp first
  const existing = await prisma.installedApp.findFirst({
    where: { appId },
    select: { container: true },
  });
  if (existing?.container) {
    return existing.container as Record<string, unknown>;
  }

  // Look up from App table
  const appRecord = await prisma.app.findFirst({
    where: { appId },
    orderBy: { createdAt: "desc" },
    select: { container: true },
  });
  return (appRecord?.container as Record<string, unknown>) ?? undefined;
}

/**
 * Stream docker compose pull with progress updates.
 */
function streamComposePull(
  appDir: string,
  composePath: string,
  envVars: NodeJS.ProcessEnv,
  onProgress: (progress: number, message?: string) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const pull = spawn("docker", ["compose", "-f", composePath, "pull"], {
      cwd: appDir,
      env: envVars,
    });

    let events = 0;
    let lastEmit = Date.now();
    const maxProgress = 0.85;
    const minProgress = 0.35;

    const advance = (incMessage?: string) => {
      events += 1;
      const pct = Math.min(
        maxProgress,
        minProgress + (events / 40) * (maxProgress - minProgress),
      );
      const now = Date.now();
      if (now - lastEmit > 200) {
        onProgress(pct, incMessage);
        lastEmit = now;
      }
    };

    pull.stdout.on("data", (data) => {
      const lines = data.toString().split("\n");
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        if (
          /download/i.test(trimmed) ||
          /extract/i.test(trimmed) ||
          /pulling/i.test(trimmed) ||
          /pull complete/i.test(trimmed)
        ) {
          advance(trimmed);
        }
      }
    });

    pull.stderr.on("data", (data) => {
      const lines = data.toString().split("\n");
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        advance(trimmed);
      }
    });

    pull.on("error", (err) => reject(err));
    pull.on("close", (code) => {
      if (code === 0) {
        onProgress(0.85, "Images pulled");
        resolve();
      } else {
        reject(new Error(`docker compose pull exited with code ${code}`));
      }
    });
  });
}

async function extractComposeMeta(
  composePath: string,
): Promise<{ webUIPort?: string; networkMode?: string }> {
  try {
    const raw = await fs.readFile(composePath, "utf-8");
    const doc = YAML.parse(raw) as {
      services?: Record<
        string,
        {
          ports?: Array<
            string | { published?: string | number; target?: string | number }
          >;
          network_mode?: string;
        }
      >;
    };
    const services = doc?.services;
    if (!services) return {};
    const firstService = services[Object.keys(services)[0]];
    if (!firstService) return {};
    let webUIPort: string | undefined;
    const firstPort = firstService.ports?.[0];
    if (typeof firstPort === "string") {
      const [host] = firstPort.split(":");
      webUIPort = host || undefined;
    } else if (firstPort && typeof firstPort === "object") {
      webUIPort =
        (firstPort.published !== undefined && String(firstPort.published)) ||
        (firstPort.target !== undefined && String(firstPort.target)) ||
        undefined;
    }
    const networkMode =
      firstService.network_mode !== undefined
        ? String(firstService.network_mode)
        : undefined;
    return { webUIPort, networkMode };
  } catch (error) {
    console.warn(
      "[Docker] extractComposeMeta failed:",
      (error as Error)?.message,
    );
    return {};
  }
}

function isComposeNoise(stderr: string): boolean {
  const lower = stderr.toLowerCase();
  return (
    lower.includes("creating") ||
    lower.includes("starting") ||
    lower.includes("running") ||
    lower.includes("pulling") ||
    lower.includes("downloaded")
  );
}
