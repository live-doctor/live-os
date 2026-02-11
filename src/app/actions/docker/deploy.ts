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
import { log, logAction } from "../maintenance/logger";
import { getAppMeta, recordInstalledApp } from "./db";
import { checkDependencies } from "./dependencies";
import { buildDefaultEnvVars } from "./env";
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

type DeployError = Error & {
  stage?: string;
  details?: Record<string, unknown>;
  stdout?: unknown;
  stderr?: unknown;
  code?: unknown;
  signal?: unknown;
  cmd?: unknown;
};

function clipText(value: unknown, max = 2000): string | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim();
  if (!normalized) return undefined;
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, max)}…`;
}

function errorDetails(error: unknown): Record<string, unknown> {
  const e = error as DeployError;
  return {
    cmd: clipText(e.cmd),
    code: e.code,
    signal: e.signal,
    stdout: clipText(e.stdout),
    stderr: clipText(e.stderr),
  };
}

function mergeErrorDetails(error: unknown): Record<string, unknown> {
  const e = error as DeployError;
  const nested =
    e.details && typeof e.details === "object"
      ? (e.details as Record<string, unknown>)
      : {};
  return {
    ...nested,
    ...errorDetails(error),
    cause: e.message,
    causeStage: e.stage,
  };
}

function summarizeDeployFailure(
  stage: string,
  fallbackMessage: string,
  details: Record<string, unknown>,
): string {
  const stderr = String(details.stderr || "").toLowerCase();
  const stdout = String(details.stdout || "").toLowerCase();
  const jsonError = String(details.jsonError || "").toLowerCase();
  const combined = `${stderr}\n${stdout}\n${jsonError}`;

  if (stage === "compose:pull") {
    if (combined.includes("toomanyrequests")) {
      return "Docker registry rate limit reached. Try again later or use authenticated pulls.";
    }
    if (
      combined.includes("pull access denied") ||
      combined.includes("requested access to the resource is denied") ||
      combined.includes("unauthorized")
    ) {
      return "Docker image access denied. Check registry visibility or authentication.";
    }
    if (combined.includes("manifest unknown") || combined.includes("not found")) {
      return "Docker image tag/digest not found in registry.";
    }
    if (combined.includes("no matching manifest for")) {
      return "Docker image does not support this CPU architecture.";
    }
    if (combined.includes("i/o timeout") || combined.includes("tls handshake timeout")) {
      return "Docker registry network timeout. Check internet/DNS and retry.";
    }
  }

  if (stage === "compose:up") {
    if (
      combined.includes("is a directory") &&
      combined.includes("entrypoint.sh")
    ) {
      return "Container start failed because /entrypoint.sh was mounted from a directory instead of a file.";
    }
  }

  return fallbackMessage;
}

function stageError(
  stage: string,
  message: string,
  details?: Record<string, unknown>,
): DeployError {
  const error = new Error(message) as DeployError;
  error.stage = stage;
  error.details = details;
  return error;
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
  await log.info("docker:deploy:start", { appId });

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
        appId,
        containerName: appId,
        name: meta.name,
        icon: meta.icon,
        progress,
        status,
        message,
      });

    const fail = async (
      stage: string,
      message: string,
      details: Record<string, unknown> = {},
    ) => {
      await logAction(
        "deploy:failure",
        {
          appId,
          stage,
          message,
          ...details,
        },
        "error",
      );
      emitProgress(1, message, "error");
      return { success: false as const, error: message };
    };

    emitProgress(0.05, "Preparing deployment", "starting");

    // Validate inputs
    if (!validateAppId(appId)) {
      return fail("validation", "Invalid app ID");
    }

    if (config) {
      for (const port of config.ports) {
        if (!validatePort(port.published)) {
          return fail("validation", `Invalid port: ${port.published}`, {
            port: port.published,
          });
        }
      }
    }

    // Check dependencies (for store apps)
    const depCheck = await checkDependencies(appId);
    if (!depCheck.satisfied) {
      const missingList = depCheck.missing.join(", ");
      return fail("dependencies", `Missing dependencies: ${missingList}`, {
        missing: depCheck.missing,
      });
    }

    // Resolve compose file
    const resolved = await resolveCompose(options);
    if (!resolved) {
      return fail(
        "compose:resolve",
        "Compose file not found. Provide compose content or ensure the app is in a store.",
      );
    }

    const { appDir, composePath: resolvedComposePath } = resolved;

    // If this is an update/redeploy, tear down old containers first
    if (options.composeContent) {
      await tearDownExisting(appDir, appId);
    }

    // Sanitize compose (temp file for docker, original path for DB)
    const { sanitizedPath, originalPath } =
      await sanitizeComposeFile(resolvedComposePath);

    await log.info("docker:deploy:compose:selected", {
      appId,
      sanitizedPath,
      originalPath,
    });
    emitProgress(0.15, "Configuring deployment");

    // Build environment variables for the deployment
    const envVars = await buildEnvVars(appId, config);

    // Resolve container name
    const composeContainerName =
      await getContainerNameFromCompose(resolvedComposePath);
    const containerName = composeContainerName || getContainerName(appId);
    envVars.CONTAINER_NAME = containerName;

    // Pre-seed data files from store app directory to APP_DATA_DIR.
    // Some app catalogs include files (entrypoint.sh, default-password, etc.)
    // alongside the compose file, referenced via ${APP_DATA_DIR}/filename.
    // If those files don't exist at mount time, Docker creates directories
    // instead of files, causing "is a directory" errors.
    const appDataDir = envVars.APP_DATA_DIR!;
    await preSeedDataFiles(appDir, appDataDir);
    await ensureComposeVolumeOwnership(sanitizedPath, envVars, appId);

    emitProgress(0.2, "Pre-seeding complete");

    // Pull images with progress streaming
    emitProgress(0.35, "Pulling images");
    try {
      await streamComposePull(
        appDir,
        appId,
        sanitizedPath,
        envVars,
        (progress, message) =>
          emitProgress(progress, message ?? "Pulling images"),
      );
    } catch (error) {
      const details = mergeErrorDetails(error);
      throw stageError("compose:pull", "Failed to pull Docker images", {
        ...details,
      });
    }

    // Start services (--project-name ensures deterministic container naming)
    emitProgress(0.85, "Starting services");
    let stdout = "";
    let stderr = "";
    try {
      const result = await execAsync(
        `cd "${appDir}" && docker compose --project-name "${appId}" -f "${sanitizedPath}" up -d`,
        { env: envVars },
      );
      stdout = result.stdout;
      stderr = result.stderr;
    } catch (error) {
      throw stageError("compose:up", "Failed to start Docker services", {
        ...errorDetails(error),
      });
    }

    if (stdout) {
      await log.info("docker:deploy:compose:up:stdout", {
        appId,
        stdout: stdout.substring(0, 200),
      });
    }
    if (stderr && !isComposeNoise(stderr)) {
      await log.warn("docker:deploy:compose:up:stderr", {
        appId,
        stderr: clipText(stderr),
      });
      await logAction(
        "deploy:compose:stderr",
        {
          appId,
          stage: "compose:up",
          stderr: clipText(stderr),
        },
        "warn",
      );
    }

    emitProgress(0.9, "Finalizing deployment");

    // Detect container names using project-name for reliable matching.
    // Retry up to 3 times with a short delay — containers may not be
    // fully registered immediately after `docker compose up -d`.
    let detectedContainer: string | null = null;
    let allContainers: string[] = [];
    for (let attempt = 0; attempt < 3; attempt++) {
      if (attempt > 0) {
        await new Promise((r) => setTimeout(r, 1000));
      }
      detectedContainer = await detectComposeContainerName(
        appDir,
        sanitizedPath,
        appId,
      );
      allContainers = await detectAllComposeContainerNames(appDir, appId);
      if (detectedContainer) break;
    }

    if (!detectedContainer) {
      // Final fallback: use the generated name
      await log.warn("docker:deploy:container:fallback", { appId, containerName });
      detectedContainer = containerName;
    }

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
    await log.info("docker:deploy:success", {
      appId,
      containerName: detectedContainer,
    });
    return { success: true };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const deployError = error as DeployError;
    const stage = deployError.stage || "unknown";
    const details = (deployError.details as Record<string, unknown>) || errorDetails(error);
    const userMessage = summarizeDeployFailure(stage, errorMessage, details);
    await log.error("docker:deploy:error", {
      appId,
      stage,
      error: errorMessage,
      ...details,
    });
    await logAction(
      "deploy:error",
      {
        appId,
        stage,
        error: userMessage,
        rawError: errorMessage,
        ...details,
        stack: clipText(deployError.stack, 3000),
      },
      "error",
    );
    sendInstallProgress({
      type: "install-progress",
      appId,
      containerName: appId,
      name: meta.name,
      icon: meta.icon,
      progress: 1,
      status: "error",
      message:
        stage && stage !== "unknown"
          ? `Deployment failed at ${stage}: ${userMessage}`
          : `Deployment failed: ${userMessage}`,
    });
    return {
      success: false,
      error: userMessage || "Failed to deploy app",
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
    await log.error("docker:composerize:error", {
      error: error instanceof Error ? error.message : String(error),
    });
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
    await log.info("docker:resolve-compose:wrote", { appId, filePath });
    return { appDir, composePath: filePath };
  }

  // Case 2: Check if app is already installed (has files in installed-apps)
  // This handles re-deploys and edits of already-installed apps
  const installedApp = await getInstalledAppDir(appId);
  if (installedApp) {
    await log.info("docker:resolve-compose:installed", {
      appId,
      composePath: installedApp.composePath,
    });
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
      await log.info("docker:resolve-compose:copied:provided", {
        appId,
        composePath: copied.composePath,
      });
      return copied;
    } catch {
      await log.warn("docker:resolve-compose:missing:provided", { appId, fullPath });
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
      await log.info("docker:resolve-compose:copied:db", {
        appId,
        composePath: copied.composePath,
      });
      return copied;
    } catch {
      await log.warn("docker:resolve-compose:missing:db", { appId, dbPath });
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
      await log.info("docker:resolve-compose:copied:found", {
        appId,
        composePath: copied.composePath,
      });
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
    await log.info("docker:teardown-existing:success", { appId });
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
 * Build environment variables for deployments.
 */
async function buildEnvVars(
  appId: string,
  config?: InstallConfig,
): Promise<NodeJS.ProcessEnv> {
  await log.info("docker:build-env:default", { appId });
  return buildDefaultEnvVars(appId, config);
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
  appId: string,
  composePath: string,
  envVars: NodeJS.ProcessEnv,
  onProgress: (progress: number, message?: string) => void,
): Promise<void> {
  const runPull = (useJsonProgress: boolean): Promise<void> =>
    new Promise((resolve, reject) => {
      const args = useJsonProgress
        ? [
            "compose",
            "--progress",
            "json",
            "--project-name",
            appId,
            "-f",
            composePath,
            "pull",
          ]
        : ["compose", "--project-name", appId, "-f", composePath, "pull"];

      const pull = spawn("docker", args, { cwd: appDir, env: envVars });
      const stdoutLines: string[] = [];
      const stderrLines: string[] = [];
      let jsonError: string | undefined;
      const pushLine = (target: string[], value: string) => {
        target.push(value);
        if (target.length > 60) target.shift();
      };

      let events = 0;
      let lastEmit = 0;
      let lastProgress = 0.35;
      const maxProgress = 0.85;
      const minProgress = 0.35;
      const layers = new Map<string, { current: number; total: number }>();

      const emitProgress = (value: number, incMessage?: string) => {
        const bounded = Math.min(maxProgress, Math.max(minProgress, value));
        if (bounded < lastProgress) return;
        const now = Date.now();
        if (now - lastEmit >= 160 || bounded >= maxProgress) {
          onProgress(bounded, incMessage);
          lastEmit = now;
          lastProgress = bounded;
        }
      };

      const advance = (incMessage?: string) => {
        events += 1;
        const pct = minProgress + (events / 50) * (maxProgress - minProgress);
        emitProgress(pct, incMessage);
      };

      const processJsonProgress = (line: string) => {
        try {
          const payload = JSON.parse(line) as {
            id?: string;
            status?: string;
            error?: string;
            errorDetail?: { message?: string } | string;
            progressDetail?: { current?: number; total?: number };
          };

          if (payload.error) {
            jsonError =
              (typeof payload.errorDetail === "string"
                ? payload.errorDetail
                : payload.errorDetail?.message) || payload.error;
            advance(payload.error);
            return;
          }

          const layerId = payload.id;
          const current = Number(payload.progressDetail?.current ?? 0);
          const total = Number(payload.progressDetail?.total ?? 0);
          if (layerId && Number.isFinite(current) && Number.isFinite(total)) {
            const normalizedTotal = total > 0 ? total : 0;
            const normalizedCurrent =
              normalizedTotal > 0
                ? Math.min(Math.max(current, 0), normalizedTotal)
                : 0;
            layers.set(layerId, {
              current: normalizedCurrent,
              total: normalizedTotal,
            });
          }

          const doneStatus = /pull complete|already exists|download complete/i;
          if (layerId && doneStatus.test(payload.status || "")) {
            const existing = layers.get(layerId);
            if (existing && existing.total > 0) {
              layers.set(layerId, { ...existing, current: existing.total });
            }
          }

          let totalCurrent = 0;
          let totalTotal = 0;
          for (const layer of layers.values()) {
            if (layer.total > 0) {
              totalCurrent += layer.current;
              totalTotal += layer.total;
            }
          }

          if (totalTotal > 0) {
            const ratio = totalCurrent / totalTotal;
            emitProgress(
              minProgress + ratio * (maxProgress - minProgress),
              payload.status,
            );
            return;
          }

          if (payload.status) {
            advance(payload.status);
          }
        } catch {
          if (
            /download|extract|pulling|pull complete|already exists/i.test(line)
          ) {
            advance(line);
          }
        }
      };

      pull.stdout.on("data", (data) => {
        const lines = data.toString().split("\n");
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          pushLine(stdoutLines, trimmed);
          if (useJsonProgress) {
            processJsonProgress(trimmed);
            continue;
          }
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
          pushLine(stderrLines, trimmed);
          if (useJsonProgress) {
            processJsonProgress(trimmed);
            continue;
          }
          advance(trimmed);
        }
      });

      pull.on("error", (err) => {
        const summarizedStdout = clipText(stdoutLines.join("\n"));
        const summarizedStderr =
          clipText(stderrLines.join("\n")) || clipText(jsonError);
        const e = stageError("compose:pull", "docker compose pull failed to start", {
          ...errorDetails(err),
          stdout: summarizedStdout,
          stderr: summarizedStderr,
          jsonError: clipText(jsonError),
          usedJsonProgress: useJsonProgress,
        });
        reject(e);
      });
      pull.on("close", (code) => {
        if (code === 0) {
          onProgress(0.85, "Images pulled");
          resolve();
        } else {
          const summarizedStdout = clipText(stdoutLines.join("\n"));
          const summarizedStderr =
            clipText(stderrLines.join("\n")) || clipText(jsonError);
          reject(
            stageError(
              "compose:pull",
              `docker compose pull exited with code ${code}`,
              {
                code,
                stdout: summarizedStdout,
                stderr: summarizedStderr,
                jsonError: clipText(jsonError),
                usedJsonProgress: useJsonProgress,
              },
            ),
          );
        }
      });
    });

  const shouldFallbackToPlainPull = (error: unknown) => {
    const e = error as DeployError;
    const details = mergeErrorDetails(error);
    const combined = `${String(details.stderr || e.stderr || "")}\n${String(
      details.stdout || e.stdout || "",
    )}\n${String(e.message || "")}`.toLowerCase();
    return (
      combined.includes("unknown flag: --progress") ||
      combined.includes("invalid argument \"json\" for \"--progress\"") ||
      combined.includes("unknown flag: --project-name")
    );
  };

  return runPull(true).catch((error) => {
    if (!shouldFallbackToPlainPull(error)) {
      throw error;
    }
    return runPull(false);
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
    await log.warn("docker:extract-compose-meta:failed", {
      error: (error as Error)?.message,
    });
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

type ComposeService = {
  user?: string | number;
  volumes?: Array<string | { type?: string; source?: string }>;
};

function parseNumericUser(user: unknown): { uid: number; gid: number } | null {
  if (typeof user === "number" && Number.isFinite(user)) {
    const id = Math.trunc(user);
    return id >= 0 ? { uid: id, gid: id } : null;
  }

  if (typeof user !== "string") return null;
  const trimmed = user.trim();
  if (!trimmed) return null;

  const match = trimmed.match(/^(\d+)(?::(\d+))?$/);
  if (!match) return null;

  const uid = Number(match[1]);
  const gid = Number(match[2] ?? match[1]);
  if (!Number.isFinite(uid) || !Number.isFinite(gid)) return null;
  return { uid, gid };
}

function resolveAppDataSource(
  source: string,
  envVars: NodeJS.ProcessEnv,
): string | null {
  const appDataDir = envVars.APP_DATA_DIR;
  if (!appDataDir) return null;
  const normalizedBase = path.resolve(appDataDir);
  const trimmed = source.trim();
  if (!trimmed) return null;

  let resolved: string | null = null;
  if (trimmed.startsWith("${APP_DATA_DIR}")) {
    resolved = path.join(
      appDataDir,
      trimmed.slice("${APP_DATA_DIR}".length).replace(/^\/+/, ""),
    );
  } else if (trimmed.startsWith("$APP_DATA_DIR")) {
    resolved = path.join(
      appDataDir,
      trimmed.slice("$APP_DATA_DIR".length).replace(/^\/+/, ""),
    );
  } else if (trimmed.startsWith(appDataDir)) {
    resolved = trimmed;
  }

  if (!resolved) return null;
  const normalizedResolved = path.resolve(resolved);
  return normalizedResolved.startsWith(normalizedBase) ? normalizedResolved : null;
}

async function ensureComposeVolumeOwnership(
  composePath: string,
  envVars: NodeJS.ProcessEnv,
  appId: string,
): Promise<void> {
  try {
    const raw = await fs.readFile(composePath, "utf-8");
    const parsed = YAML.parse(raw) as { services?: Record<string, ComposeService> };
    const services = parsed.services || {};

    for (const [serviceName, service] of Object.entries(services)) {
      const user = parseNumericUser(service.user);
      if (!user) continue;

      const volumes = Array.isArray(service.volumes) ? service.volumes : [];
      for (const volume of volumes) {
        let source: string | undefined;
        if (typeof volume === "string") {
          source = volume.split(":")[0];
        } else if (volume && typeof volume === "object") {
          source = volume.source;
        }
        if (!source) continue;

        const hostPath = resolveAppDataSource(source, envVars);
        if (!hostPath) continue;

        await fs.mkdir(hostPath, { recursive: true });
        try {
          await fs.chown(hostPath, user.uid, user.gid);
        } catch (error) {
          await log.warn("docker:compose:ownership:chown-failed", {
            appId,
            service: serviceName,
            hostPath,
            uid: user.uid,
            gid: user.gid,
            error: (error as Error)?.message || String(error),
          });
        }
        try {
          await fs.chmod(hostPath, 0o775);
        } catch {
          // Best effort; chown is the main requirement.
        }
      }
    }
  } catch (error) {
    await log.warn("docker:compose:ownership:parse-failed", {
      appId,
      composePath,
      error: (error as Error)?.message || String(error),
    });
  }
}
