"use server";

import {
  sendInstallProgress,
  type InstallProgressPayload,
} from "@/app/api/system/stream/route";
import type { InstallConfig } from "@/components/app-store/types";
import { triggerAppsUpdate } from "@/lib/system-status/websocket-server";
import prisma from "@/lib/prisma";
import { spawn } from "child_process";
import fs from "fs/promises";
import path from "path";
import { env } from "process";
import YAML from "yaml";
import { logAction } from "../maintenance/logger";
import { getAppMeta, recordInstalledApp } from "./db";
import { checkDependencies } from "./dependencies";
import {
  CUSTOM_APPS_ROOT,
  DEFAULT_APP_ICON,
  detectAllComposeContainerNames,
  detectComposeContainerName,
  execAsync,
  findComposeForApp,
  getContainerName,
  getContainerNameFromCompose,
  getSystemDefaults,
  guessComposeContainerName,
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
  /** Store slug or "custom" — preserved on redeploy */
  source?: string;
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
        error: "Compose file not found. Provide compose content or ensure the app is in a store.",
      };
    }

    const { appDir, composePath: resolvedComposePath } = resolved;

    // If this is an update/redeploy, tear down old containers first
    if (options.composeContent) {
      await tearDownExisting(appDir, appId);
    }

    // Sanitize compose (temp file for docker, original path for DB)
    const { sanitizedPath, originalPath } =
      await sanitizeComposeFile(resolvedComposePath);

    console.log(
      `[Docker] deployApp: Using compose at ${sanitizedPath} (original: ${originalPath})`,
    );
    emitProgress(0.15, "Configuring deployment");

    // Build environment variables first — we need APP_DATA_DIR for pre-seeding
    const envVars = buildEnvVars(appId, config);

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
      (progress, message) => emitProgress(progress, message ?? "Pulling images"),
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

    // Resolve source (store slug or "custom")
    const source = await resolveSource(appId, options.source);

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
      source,
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
    const composerize = (await import("composerize") as any).default;
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
 */
async function resolveCompose(
  options: DeployOptions,
): Promise<{ appDir: string; composePath: string } | null> {
  const { appId, composeContent, composePath } = options;

  // Case 1: Raw YAML provided — write to custom-apps/{appId}/
  if (composeContent) {
    await fs.mkdir(CUSTOM_APPS_ROOT, { recursive: true });
    const appDir = path.join(CUSTOM_APPS_ROOT, appId);
    await fs.mkdir(appDir, { recursive: true });
    const filePath = path.join(appDir, "docker-compose.yml");
    await fs.writeFile(filePath, composeContent, "utf-8");
    console.log(`[Docker] resolveCompose: Wrote compose to ${filePath}`);
    return { appDir, composePath: filePath };
  }

  // Case 2: Explicit compose path provided (store install)
  if (composePath) {
    let fullPath = composePath;
    if (!path.isAbsolute(composePath)) {
      fullPath = path.join(process.cwd(), composePath);
    }
    try {
      await fs.access(fullPath);
      return { appDir: path.dirname(fullPath), composePath: fullPath };
    } catch {
      console.warn(
        `[Docker] resolveCompose: Provided composePath not found: ${fullPath}`,
      );
      // Fall through to filesystem search
    }
  }

  // Case 3: Look up from App table in DB
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
      return { appDir: path.dirname(dbPath), composePath: dbPath };
    } catch {
      console.warn(
        `[Docker] resolveCompose: DB composePath not found: ${dbPath}`,
      );
    }
  }

  // Case 4: Filesystem search as last fallback
  return findComposeForApp(appId);
}

/**
 * Tear down existing containers before redeploying.
 */
async function tearDownExisting(
  appDir: string,
  appId: string,
): Promise<void> {
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
 * Build environment variables with CasaOS system defaults and user overrides.
 */
function buildEnvVars(
  appId: string,
  config?: InstallConfig,
): NodeJS.ProcessEnv {
  const systemDefaults = getSystemDefaults();
  const envVars: NodeJS.ProcessEnv = { ...env };

  // CasaOS / Umbrel reserved variables
  envVars.PUID = envVars.PUID || systemDefaults.PUID;
  envVars.PGID = envVars.PGID || systemDefaults.PGID;
  envVars.TZ = envVars.TZ || systemDefaults.TZ;
  envVars.AppID = envVars.AppID || appId;
  envVars.APP_ID = envVars.APP_ID || appId;
  envVars.APP_DATA_DIR =
    envVars.APP_DATA_DIR || path.join("/DATA/AppData", appId);
  envVars.UMBREL_ROOT = envVars.UMBREL_ROOT || "/DATA";

  if (config) {
    // Port overrides
    for (const port of config.ports) {
      envVars[`PORT_${port.container}`] = port.published;
    }
    // Volume overrides
    for (const volume of config.volumes) {
      const key = `VOLUME_${volume.container.replace(/\//g, "_").toUpperCase()}`;
      envVars[key] = volume.source;
    }
    // Environment variable overrides
    for (const envVar of config.environment) {
      envVars[envVar.key] = envVar.value;
    }
  }

  return envVars;
}

/**
 * Resolve the source (store slug) for an app.
 * If explicitly provided, use that. Otherwise look up from App table or existing InstalledApp.
 */
async function resolveSource(
  appId: string,
  explicitSource?: string,
): Promise<string | undefined> {
  if (explicitSource) return explicitSource;

  // Check if there's an existing InstalledApp record with a source
  const existing = await prisma.installedApp.findFirst({
    where: { appId },
    select: { source: true },
  });
  if (existing?.source) return existing.source;

  // Look up from App table
  const appRecord = await prisma.app.findFirst({
    where: { appId },
    include: { store: true },
    orderBy: { createdAt: "desc" },
  });
  return appRecord?.store?.slug ?? "custom";
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
          ports?: Array<string | { published?: string | number; target?: string | number }>;
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
    console.warn("[Docker] extractComposeMeta failed:", (error as Error)?.message);
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
