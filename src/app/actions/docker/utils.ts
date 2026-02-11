import { execAsync } from "@/lib/exec";
import { readFileSync } from "fs";
import fs from "fs/promises";
import os from "os";
import path from "path";
import YAML from "yaml";

export { execAsync };

export const CONTAINER_PREFIX = process.env.CONTAINER_PREFIX || "";
export const DEFAULT_APP_ICON = "/default-application-icon.png";
export const STORES_ROOT = path.join(process.cwd(), "external-apps");
export const INTERNAL_APPS_ROOT = path.join(process.cwd(), "internal-apps");
export const INSTALLED_APPS_ROOT = path.join(process.cwd(), "installed-apps");
export const FALLBACK_APP_NAME = "Application";

/**
 * Validate appId to prevent path traversal
 */
export function validateAppId(appId: string): boolean {
  if (!appId || appId.includes("..") || appId.includes("/")) {
    return false;
  }
  return true;
}

/**
 * Validate port number (1024-65535 for non-root)
 */
export function validatePort(port: string | number): boolean {
  const portNum = typeof port === "string" ? parseInt(port, 10) : port;
  return portNum >= 1 && portNum <= 65535;
}

/**
 * Validate path to prevent path traversal
 */
export function validatePath(pathStr: string): boolean {
  if (!pathStr || pathStr.includes("..")) {
    return false;
  }
  if (pathStr.startsWith("/") && !pathStr.startsWith("/DATA")) {
    return false;
  }
  return true;
}

/**
 * Get container name for an app
 */
export function getContainerName(appId: string): string {
  return `${CONTAINER_PREFIX}${appId.toLowerCase()}`;
}

/**
 * Guess compose-generated container name from compose file and location
 */
export function guessComposeContainerName(composePath: string): string | null {
  try {
    const raw = readFileSync(composePath, "utf-8");
    const doc = YAML.parse(raw) as {
      name?: string;
      services?: Record<string, unknown>;
    };
    const firstService = doc?.services ? Object.keys(doc.services)[0] : null;
    if (!firstService) return null;
    const project = (
      doc.name || path.basename(path.dirname(composePath))
    ).toLowerCase();
    const service = firstService.toLowerCase();
    return `${project}-${service}-1`;
  } catch {
    return null;
  }
}

/**
 * Helper patterns for services that should NOT be selected as primary container.
 */
const HELPER_NAME_PATTERNS = [
  /[-_]db[-_]|[-_]database[-_]/i,
  /[-_]redis[-_]/i,
  /[-_]postgres[-_]|[-_]mysql[-_]|[-_]mariadb[-_]|[-_]mongodb[-_]/i,
  /[-_]proxy[-_]|[-_]tor[-_]/i,
  /[-_]dind[-_]|[-_]docker[-_]/i,
];

/**
 * Detect container name from running compose project.
 * Uses --project-name for reliable matching.
 * Prefers non-helper containers (skips db, redis, proxy, etc.)
 */
export async function detectComposeContainerName(
  appDir: string,
  composePath: string,
  appId?: string,
): Promise<string | null> {
  try {
    const projectFlag = appId ? `--project-name "${appId}" ` : "";
    const { stdout } = await execAsync(
      `cd "${appDir}" && docker compose ${projectFlag}-f "${composePath}" ps --format "{{.Names}}"`,
    );
    const names = stdout
      .split("\n")
      .map((n) => n.trim())
      .filter(Boolean);

    if (names.length === 0) return null;
    if (names.length === 1) return names[0];

    // Multiple containers: prefer the non-helper one
    const mainContainer = names.find(
      (name) => !HELPER_NAME_PATTERNS.some((p) => p.test(name)),
    );
    return mainContainer || names[0];
  } catch (error) {
    console.warn(
      "[Docker] detectComposeContainerName failed:",
      (error as Error)?.message || error,
    );
    return null;
  }
}

/**
 * Resolve host port from container inspection.
 * When preferredContainerPort is given, return the host port mapped to that
 * specific container port (e.g. "9000/tcp") instead of the first arbitrary one.
 */
export async function resolveHostPort(
  containerName: string,
  preferredContainerPort?: number | string | null,
): Promise<string | null> {
  try {
    const { stdout } = await execAsync(
      `docker inspect -f '{{json .NetworkSettings.Ports}}' ${containerName}`,
    );

    const ports = JSON.parse(stdout || "{}") as Record<
      string,
      { HostIp: string; HostPort: string }[] | null
    >;

    // If a preferred port is given, try to match it first
    if (preferredContainerPort) {
      const portStr = String(preferredContainerPort);
      for (const [key, mappings] of Object.entries(ports)) {
        if (!Array.isArray(mappings) || mappings.length === 0) continue;
        // key format is "9000/tcp" or "9000/udp"
        if (key.startsWith(`${portStr}/`)) {
          return mappings[0].HostPort;
        }
      }
    }

    // Fallback: prefer TCP ports sorted by lowest port number (most likely web UI)
    const tcpEntries = Object.entries(ports)
      .filter(
        ([key, mappings]) =>
          key.endsWith("/tcp") &&
          Array.isArray(mappings) &&
          mappings.length > 0,
      )
      .sort(([a], [b]) => {
        const portA = parseInt(a.split("/")[0], 10);
        const portB = parseInt(b.split("/")[0], 10);
        return portA - portB;
      });

    if (tcpEntries.length > 0) {
      return tcpEntries[0][1]![0].HostPort;
    }

    // Last resort: any available mapping
    const anyMapping = Object.values(ports).find(
      (mappings) => Array.isArray(mappings) && mappings.length > 0,
    );

    return anyMapping?.[0]?.HostPort ?? null;
  } catch (error) {
    console.error(
      `[Docker] resolveHostPort: failed for ${containerName}:`,
      error,
    );
    return null;
  }
}

/**
 * Find docker-compose.yml for an app across all store roots
 */
export async function findComposeForApp(
  appId: string,
): Promise<{ appDir: string; composePath: string } | null> {
  const target = appId.toLowerCase();
  const composeNames = ["docker-compose.yml", "docker-compose.yaml"];

  async function searchDir(
    dir: string,
    depth: number,
  ): Promise<{ appDir: string; composePath: string } | null> {
    if (depth > 5) return null;
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const fullPath = path.join(dir, entry.name);

      if (entry.name.toLowerCase() === target) {
        for (const composeName of composeNames) {
          const candidate = path.join(fullPath, composeName);
          try {
            await fs.access(candidate);
            return { appDir: fullPath, composePath: candidate };
          } catch {
            // try next compose name
          }
        }
      }

      const nested = await searchDir(fullPath, depth + 1);
      if (nested) return nested;
    }
    return null;
  }

  // Search installed-apps first (highest priority), then other locations
  const rootsToSearch = [INSTALLED_APPS_ROOT, STORES_ROOT, INTERNAL_APPS_ROOT];

  try {
    for (const root of rootsToSearch) {
      await fs.mkdir(root, { recursive: true }).catch(() => null);
      const entries = await fs
        .readdir(root, { withFileTypes: true })
        .catch(() => []);
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const dir = path.join(root, entry.name);
        const found = await searchDir(dir, 0);
        if (found) return found;
      }
    }
  } catch (error) {
    console.error(
      "[Docker] findComposeForApp: Error searching compose files: " + error,
    );
  }

  console.warn(
    "[Docker] findComposeForApp: Compose file not found for app: " + appId,
  );
  return null;
}

/**
 * Known helper/infrastructure service names that shouldn't appear as standalone apps.
 * These are secondary services in multi-service composes.
 */
const HELPER_SERVICE_PATTERNS = [
  /^docker$/i,       // Docker-in-Docker
  /^dind$/i,         // DinD
  /^tor$/i,          // Tor
  /^proxy$/i,        // Proxy services
  /^redis$/i,        // Redis cache
  /^db$/i,           // Generic database
  /^postgres$/i,     // PostgreSQL
  /^mysql$/i,        // MySQL
  /^mariadb$/i,      // MariaDB
  /^mongodb$/i,      // MongoDB
];

/**
 * List all containers with their compose project labels.
 * Returns raw container info for grouping.
 * Filters out known helper/infrastructure services.
 */
export async function listContainersWithLabels(): Promise<
  {
    name: string;
    status: string;
    image: string;
    composeProject: string;
    composeService: string;
  }[]
> {
  try {
    const { stdout } = await execAsync(
      'docker ps -a --format "{{.Names}}\t{{.Status}}\t{{.Image}}\t{{.Label \\"com.docker.compose.project\\"}}\t{{.Label \\"com.docker.compose.service\\"}}"',
    );
    if (!stdout.trim()) return [];

    return stdout
      .trim()
      .split("\n")
      .map((line) => {
        const [name, status, image, composeProject, composeService] =
          line.split("\t");
        return {
          name: name || "",
          status: status || "",
          image: image || "",
          composeProject: composeProject || "",
          composeService: composeService || "",
        };
      })
      .filter((c) => {
        if (!c.name) return false;
        // Skip helper services that have a compose project (they're part of a multi-service app)
        if (c.composeProject && c.composeService) {
          if (HELPER_SERVICE_PATTERNS.some((p) => p.test(c.composeService))) {
            return false;
          }
        }
        return true;
      });
  } catch (error) {
    console.error("[Docker] listContainersWithLabels error:", error);
    return [];
  }
}

/**
 * Group containers by their compose project label.
 * Containers without a compose project are treated as their own group.
 */
export function groupContainersByProject(
  containers: {
    name: string;
    status: string;
    image: string;
    composeProject: string;
    composeService: string;
  }[],
): Map<
  string,
  {
    name: string;
    status: string;
    image: string;
    composeProject: string;
    composeService: string;
  }[]
> {
  const groups = new Map<string, typeof containers>();

  for (const container of containers) {
    // Use compose project name as key, or container name for standalone
    const key = container.composeProject || container.name;
    const group = groups.get(key) || [];
    group.push(container);
    groups.set(key, group);
  }

  return groups;
}

/**
 * Aggregate status for a group of containers.
 * "running" if primary is up, "stopped" if all down, "error" otherwise.
 */
export function aggregateStatus(
  containers: { status: string }[],
): "running" | "stopped" | "error" {
  const statuses = containers.map((c) => {
    const s = c.status.toLowerCase();
    if (s.startsWith("up")) return "running";
    if (s.includes("exited")) return "stopped";
    return "error";
  });

  if (statuses.every((s) => s === "running")) return "running";
  if (statuses.every((s) => s === "stopped")) return "stopped";
  if (statuses.some((s) => s === "running")) return "running";
  return "error";
}

/**
 * Detect all container names from a compose project directory.
 * Uses --project-name for reliable matching.
 */
export async function detectAllComposeContainerNames(
  appDir: string,
  appId?: string,
): Promise<string[]> {
  try {
    const projectFlag = appId ? `--project-name "${appId}" ` : "";
    const { stdout } = await execAsync(
      `cd "${appDir}" && docker compose ${projectFlag}ps --format "{{.Names}}"`,
    );
    return stdout
      .split("\n")
      .map((n) => n.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * Sanitize compose file by removing invalid or platform-specific services.
 * Returns both the sanitized path (for docker to run) and the original path (for DB storage).
 *
 * Handles:
 * - Services without image or build instructions
 *
 * The sanitized file is written as a dotfile in the same directory as the original
 * so that Docker Compose derives the correct project name from the parent folder.
 */
export async function sanitizeComposeFile(
  composePath: string,
): Promise<{ sanitizedPath: string; originalPath: string }> {
  try {
    const raw = await fs.readFile(composePath, "utf-8");
    const doc = YAML.parse(raw);
    let needsSanitization = false;
    const removedServices: string[] = [];

    if (!doc?.services) {
      return { sanitizedPath: composePath, originalPath: composePath };
    }

    // Check each service for validity
    for (const [serviceName, service] of Object.entries(doc.services)) {
      const svc = service as { image?: string; build?: unknown };
      if (!svc.image && !svc.build) {
        delete doc.services[serviceName];
        removedServices.push(serviceName);
        needsSanitization = true;
      }
    }

    if (removedServices.length > 0) {
      console.log(
        `[Docker] sanitizeCompose: removed services: ${removedServices.join(", ")}`,
      );
    }

    // If no services left after sanitization, that's an error
    if (Object.keys(doc.services).length === 0) {
      console.error("[Docker] sanitizeCompose: no valid services remaining after sanitization");
      return { sanitizedPath: composePath, originalPath: composePath };
    }

    if (!needsSanitization) {
      return { sanitizedPath: composePath, originalPath: composePath };
    }

    // Write in the same directory so Docker Compose uses the correct project name
    const dir = path.dirname(composePath);
    const sanitizedPath = path.join(dir, ".docker-compose.sanitized.yml");
    await fs.writeFile(sanitizedPath, YAML.stringify(doc), "utf-8");
    return { sanitizedPath, originalPath: composePath };
  } catch (error) {
    console.warn(
      "[Docker] sanitizeCompose: failed, using original compose file: ",
      (error as Error)?.message || error,
    );
    return { sanitizedPath: composePath, originalPath: composePath };
  }
}

/**
 * Get system defaults for common Docker environment variables
 */
export function getSystemDefaults(): {
  PUID: string;
  PGID: string;
  TZ: string;
} {
  return {
    PUID: process.env.PUID || String(process.getuid?.() ?? 1000),
    PGID: process.env.PGID || String(process.getgid?.() ?? 1000),
    TZ:
      process.env.TZ ||
      Intl.DateTimeFormat().resolvedOptions().timeZone ||
      "UTC",
  };
}

/**
 * Get host architecture for Docker image selection
 */
export function getHostArchitecture(): string {
  const arch = os.arch();
  switch (arch) {
    case "x64":
      return "amd64";
    case "arm64":
      return "arm64";
    case "arm":
      return "arm";
    default:
      return arch;
  }
}

/**
 * Read container name from compose file
 * Some compose files have container_name set explicitly
 */
export async function getContainerNameFromCompose(
  composePath: string,
  mainService?: string,
): Promise<string | null> {
  try {
    const raw = await fs.readFile(composePath, "utf-8");
    const doc = YAML.parse(raw) as {
      name?: string;
      services?: Record<string, { container_name?: string }>;
    };

    if (!doc?.services) return null;

    // Determine main service (from parameter or first service)
    const serviceName = mainService || Object.keys(doc.services)[0];

    if (!serviceName) return null;

    const service = doc.services[serviceName];
    if (!service) return null;

    // Return container_name if explicitly set in compose
    if (service.container_name) {
      return service.container_name;
    }

    // Don't guess — Docker Compose generates names as "{project}-{service}-1"
    // which we can't predict reliably here. Let detectComposeContainerName()
    // handle detection from the actual running containers instead.
    return null;
  } catch (error) {
    console.warn(
      "[Docker] getContainerNameFromCompose: failed to read compose file:",
      (error as Error)?.message || error,
    );
    return null;
  }
}

/**
 * Get the best container name for an app
 * Priority: compose container_name > compose project name > generated name
 */
export async function resolveContainerName(
  appId: string,
  composePath?: string,
): Promise<string> {
  if (composePath) {
    const fromCompose = await getContainerNameFromCompose(composePath);
    if (fromCompose) {
      console.log(
        `[Docker] resolveContainerName: Using compose container_name "${fromCompose}" for ${appId}`,
      );
      return fromCompose;
    }
  }

  return getContainerName(appId);
}

/** Files that are NOT data files — skip when pre-seeding */
const STORE_META_FILES = new Set([
  "docker-compose.yml",
  "docker-compose.yaml",
  ".docker-compose.sanitized.yml",
  "appfile.json",
  "icon.png",
  "icon.svg",
  "thumbnail.png",
  "thumbnail.jpg",
]);

/**
 * Pre-seed data files from a store app directory to APP_DATA_DIR.
 *
 * Some app catalogs include files (entrypoint.sh, default-password, torrc.template, etc.)
 * alongside the compose file. The compose references them via ${APP_DATA_DIR}/filename.
 * If those files don't exist when Docker mounts them, Docker creates directories instead,
 * which causes "is a directory" errors.
 *
 * This copies all non-metadata files from the store app dir to APP_DATA_DIR.
 * Existing files are NOT overwritten (preserves user modifications on redeploy).
 */
export async function preSeedDataFiles(
  storeAppDir: string,
  appDataDir: string,
): Promise<void> {
  try {
    const entries = await fs.readdir(storeAppDir, { withFileTypes: true });
    const dataFiles = entries.filter(
      (e) => e.isFile() && !STORE_META_FILES.has(e.name.toLowerCase()),
    );

    if (dataFiles.length === 0) return;

    await fs.mkdir(appDataDir, { recursive: true });

    for (const entry of dataFiles) {
      const src = path.join(storeAppDir, entry.name);
      const dest = path.join(appDataDir, entry.name);
      try {
        const stat = await fs.lstat(dest);
        if (stat.isDirectory()) {
          // Docker can create a directory when a file bind-mount source is missing.
          // Heal this state by replacing the directory with the expected file.
          await fs.rm(dest, { recursive: true, force: true });
          await fs.copyFile(src, dest);
          if (entry.name.endsWith(".sh")) {
            await fs.chmod(dest, 0o755);
          }
          console.log(
            `[Docker] preSeedDataFiles: Replaced directory with file ${entry.name} → ${dest}`,
          );
        }
        // Existing regular file — keep user modifications on redeploy.
      } catch {
        await fs.copyFile(src, dest);
        // Preserve executable bit for scripts
        if (entry.name.endsWith(".sh")) {
          await fs.chmod(dest, 0o755);
        }
        console.log(
          `[Docker] preSeedDataFiles: Copied ${entry.name} → ${dest}`,
        );
      }
    }
  } catch (error) {
    console.warn(
      "[Docker] preSeedDataFiles: Failed to seed data files:",
      (error as Error)?.message || error,
    );
    // Non-fatal — some apps don't need pre-seeded files
  }
}

/** Files to copy when installing an app (compose + metadata) */
const APP_INSTALL_FILES = [
  "docker-compose.yml",
  "docker-compose.yaml",
  "appfile.json",
  "icon.png",
  "icon.svg",
];

/**
 * Copy app files from store to installed-apps directory.
 *
 * When installing a store app, we copy the compose file and metadata to
 * `installed-apps/{appId}/` so the app remains manageable even if the
 * store is deleted or refreshed.
 *
 * Also copies supporting files (entrypoint.sh, scripts, etc.) that the
 * compose file may reference.
 *
 * @param storeAppDir - Source directory in the store (e.g., external-apps/.../Syncthing/)
 * @param appId - The app identifier
 * @returns Path to the copied compose file in installed-apps
 */
export async function copyAppToInstalledApps(
  storeAppDir: string,
  appId: string,
): Promise<{ appDir: string; composePath: string }> {
  const installedAppDir = path.join(INSTALLED_APPS_ROOT, appId);
  await fs.mkdir(installedAppDir, { recursive: true });

  let composePath: string | null = null;

  // Copy compose and metadata files
  for (const fileName of APP_INSTALL_FILES) {
    const src = path.join(storeAppDir, fileName);
    const dest = path.join(installedAppDir, fileName);
    try {
      await fs.access(src);
      await fs.copyFile(src, dest);
      console.log(
        `[Docker] copyAppToInstalledApps: Copied ${fileName} → ${dest}`,
      );

      if (
        !composePath &&
        (fileName === "docker-compose.yml" ||
          fileName === "docker-compose.yaml")
      ) {
        composePath = dest;
      }
    } catch {
      // File doesn't exist in store, skip
    }
  }

  // Copy supporting files (scripts, configs, etc.) - same as preSeedDataFiles
  // but to installed-apps instead of APP_DATA_DIR
  try {
    const entries = await fs.readdir(storeAppDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isFile()) continue;
      const lowerName = entry.name.toLowerCase();
      // Skip files we already copied and metadata files
      if (
        APP_INSTALL_FILES.some((f) => f.toLowerCase() === lowerName) ||
        STORE_META_FILES.has(lowerName)
      ) {
        continue;
      }

      const src = path.join(storeAppDir, entry.name);
      const dest = path.join(installedAppDir, entry.name);
      try {
        await fs.copyFile(src, dest);
        // Preserve executable bit for scripts
        if (entry.name.endsWith(".sh")) {
          await fs.chmod(dest, 0o755);
        }
        console.log(
          `[Docker] copyAppToInstalledApps: Copied supporting file ${entry.name}`,
        );
      } catch {
        // Non-fatal
      }
    }
  } catch {
    // Non-fatal
  }

  if (!composePath) {
    throw new Error(`No docker-compose.yml found in ${storeAppDir}`);
  }

  return { appDir: installedAppDir, composePath };
}

/**
 * Remove installed app files from installed-apps directory.
 */
export async function removeInstalledAppFiles(appId: string): Promise<void> {
  const installedAppDir = path.join(INSTALLED_APPS_ROOT, appId);
  try {
    await fs.rm(installedAppDir, { recursive: true, force: true });
    console.log(`[Docker] removeInstalledAppFiles: Removed ${installedAppDir}`);
  } catch (error) {
    console.warn(
      `[Docker] removeInstalledAppFiles: Failed to remove ${installedAppDir}:`,
      (error as Error)?.message || error,
    );
  }
}

/**
 * Check if an app is already installed (has files in installed-apps).
 */
export async function isAppInstalled(appId: string): Promise<boolean> {
  const composePath = path.join(
    INSTALLED_APPS_ROOT,
    appId,
    "docker-compose.yml",
  );
  try {
    await fs.access(composePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get the installed app directory if it exists.
 */
export async function getInstalledAppDir(
  appId: string,
): Promise<{ appDir: string; composePath: string } | null> {
  const appDir = path.join(INSTALLED_APPS_ROOT, appId);
  const composeNames = ["docker-compose.yml", "docker-compose.yaml"];

  for (const composeName of composeNames) {
    const composePath = path.join(appDir, composeName);
    try {
      await fs.access(composePath);
      return { appDir, composePath };
    } catch {
      // Try next
    }
  }
  return null;
}
