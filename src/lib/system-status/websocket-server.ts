/* eslint-disable @typescript-eslint/no-explicit-any */
import { pollAndBroadcast } from "@/app/api/system/stream/route";
import { execAsync } from "@/lib/exec";
import prisma from "@/lib/prisma";
import type { Server } from "http";
import os from "os";
import type { Systeminformation } from "systeminformation";
import si from "systeminformation";
import { WebSocket, WebSocketServer } from "ws";
const DEFAULT_APP_ICON = "/icons/default-app-icon.png";

/**
 * Compare two semantic version strings
 * Returns: 1 if a > b, -1 if a < b, 0 if equal
 */
function compareVersions(a: string, b: string): number {
  const normalize = (v: string) =>
    v
      .replace(/^v/i, "")
      .split(".")
      .map((n) => parseInt(n, 10) || 0);

  const partsA = normalize(a);
  const partsB = normalize(b);
  const len = Math.max(partsA.length, partsB.length);

  for (let i = 0; i < len; i++) {
    const diff = (partsA[i] ?? 0) - (partsB[i] ?? 0);
    if (diff !== 0) return diff > 0 ? 1 : -1;
  }
  return 0;
}

// Types for the data we broadcast
export interface SystemStats {
  cpu: { usage: number; temperature: number; power: number };
  memory: { usage: number; total: number; used: number; free: number };
  gpu?: { usage: number; name: string };
}

export interface StorageStats {
  total: number;
  used: number;
  usagePercent: number;
  health: string;
}

export interface NetworkStats {
  uploadMbps: number;
  downloadMbps: number;
}

export interface AppUsage {
  id: string;
  name: string;
  icon: string;
  cpuUsage: number;
  memoryUsage: number; // in bytes
  memoryLimit: number; // in bytes
  memoryPercent: number;
}

export interface InstalledApp {
  id: string;
  appId: string;
  name: string;
  icon: string;
  status: "running" | "stopped" | "error";
  webUIPort?: number;
  containerName: string;
  installedAt: number;
  storeId?: string;
  // Version tracking for updates
  version?: string;
  availableVersion?: string;
  hasUpdate?: boolean;
}

export interface OtherContainer {
  id: string;
  name: string;
  image: string;
  status: "running" | "stopped" | "error";
  webUIPort?: number;
}

export interface SystemUpdateMessage {
  type: "system-update";
  data: {
    cpu: SystemStats["cpu"];
    memory: SystemStats["memory"];
    gpu?: SystemStats["gpu"];
    storage: StorageStats;
    network: NetworkStats;
    runningApps: AppUsage[];
  };
  timestamp: number;
}

export interface AppsUpdateMessage {
  type: "apps-update";
  data: {
    installedApps: InstalledApp[];
    otherContainers: OtherContainer[];
  };
  timestamp: number;
}

type ExtendedGraphicsControllerData =
  Systeminformation.GraphicsControllerData & {
    utilization?: number;
  };

async function resolveHostPort(containerName: string): Promise<string | null> {
  try {
    const { stdout } = await execAsync(
      `docker inspect -f '{{json .NetworkSettings.Ports}}' ${containerName}`,
    );
    const ports = JSON.parse(stdout || "{}") as Record<
      string,
      { HostIp: string; HostPort: string }[] | null
    >;
    const firstMapping = Object.values(ports).find(
      (mappings) => Array.isArray(mappings) && mappings.length > 0,
    );
    return firstMapping?.[0]?.HostPort ?? null;
  } catch (error) {
    console.error("[SystemStatus WS] Failed to resolve host port:", error);
    return null;
  }
}

// Track network stats for delta calculation
let lastNetworkSample: { rx: number; tx: number; timestamp: number } | null =
  null;

// WebSocket server instance
let wss: WebSocketServer | null = null;

// Intervals for data collection
let systemInterval: NodeJS.Timeout | null = null;
let appsInterval: NodeJS.Timeout | null = null;

/**
 * Broadcast a message to all connected WebSocket clients
 */
function broadcast(message: SystemUpdateMessage | AppsUpdateMessage): void {
  if (!wss) return;

  const data = JSON.stringify(message);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}

/**
 * Collect system metrics (CPU, memory, storage, network)
 */
async function collectSystemMetrics(): Promise<SystemUpdateMessage["data"]> {
  try {
    const [load, mem, temperature, disks, networkStatsData, graphicsInfo] =
      await Promise.all([
        si.currentLoad(),
        si.mem(),
        si.cpuTemperature(),
        si.fsSize(),
        si.networkStats(),
        si.graphics(),
      ]);

    // CPU stats
    const cpuUsage = Math.round(load.currentLoad);
    const tempValue = Number.isFinite(temperature.main)
      ? Math.round(temperature.main)
      : 38;
    const powerWatts = parseFloat(((cpuUsage / 100) * 15).toFixed(1));

    // Memory stats
    const memoryUsage = Math.round((mem.active / mem.total) * 100);
    const usedMemory = mem.total - mem.available;

    // Storage stats
    const primary = disks.find((d) => d.mount === "/") ?? disks[0];
    let storage: StorageStats = {
      total: 0,
      used: 0,
      usagePercent: 0,
      health: "Unknown",
    };

    if (primary) {
      const totalGB = primary.size / 1024 / 1024 / 1024;
      const usedGB = primary.used / 1024 / 1024 / 1024;
      const usagePercent = Math.round((primary.used / primary.size) * 100);
      storage = {
        total: parseFloat(totalGB.toFixed(2)),
        used: parseFloat(usedGB.toFixed(1)),
        usagePercent,
        health:
          usagePercent < 80
            ? "Healthy"
            : usagePercent < 90
              ? "Warning"
              : "Critical",
      };
    }

    // Network stats (delta-based calculation)
    const now = Date.now();
    const filtered = networkStatsData.filter((s) => s.iface !== "lo");
    const rx = filtered.reduce((sum, s) => sum + (s.rx_bytes || 0), 0);
    const tx = filtered.reduce((sum, s) => sum + (s.tx_bytes || 0), 0);

    let network: NetworkStats = { uploadMbps: 0, downloadMbps: 0 };

    if (lastNetworkSample) {
      const deltaSeconds = (now - lastNetworkSample.timestamp) / 1000;
      if (deltaSeconds > 0) {
        const deltaRx = rx - lastNetworkSample.rx;
        const deltaTx = tx - lastNetworkSample.tx;
        network = {
          uploadMbps: Math.max(
            0,
            parseFloat(((deltaTx * 8) / 1_000_000 / deltaSeconds).toFixed(2)),
          ),
          downloadMbps: Math.max(
            0,
            parseFloat(((deltaRx * 8) / 1_000_000 / deltaSeconds).toFixed(2)),
          ),
        };
      }
    }
    lastNetworkSample = { rx, tx, timestamp: now };

    // Running apps CPU usage
    const runningApps = await collectRunningAppUsage();
    const firstGpu: ExtendedGraphicsControllerData | undefined =
      graphicsInfo.controllers?.[0];
    const gpuUsageRaw = firstGpu?.utilizationGpu ?? firstGpu?.utilization ?? 0;
    const gpuUsage = Math.round(gpuUsageRaw);

    return {
      cpu: { usage: cpuUsage, temperature: tempValue, power: powerWatts },
      memory: {
        usage: memoryUsage,
        total: mem.total,
        used: usedMemory,
        free: mem.available,
      },
      gpu: firstGpu
        ? {
            usage: gpuUsage,
            name: firstGpu.model || firstGpu.name || "GPU",
          }
        : undefined,
      storage,
      network,
      runningApps,
    };
  } catch (error) {
    console.error("[SystemStatus WS] Error collecting metrics:", error);

    // Fallback using Node.js os module
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;

    return {
      cpu: { usage: 0, temperature: 0, power: 0 },
      memory: {
        usage: Math.round((usedMemory / totalMemory) * 100),
        total: totalMemory,
        used: usedMemory,
        free: freeMemory,
      },
      gpu: undefined,
      storage: { total: 0, used: 0, usagePercent: 0, health: "Unknown" },
      network: { uploadMbps: 0, downloadMbps: 0 },
      runningApps: [],
    };
  }
}

/**
 * Parse memory string from docker stats (e.g., "1.5GiB", "256MiB", "100KiB")
 */
function parseMemoryString(memStr: string): number {
  const cleaned = memStr.replace(/,/g, "").trim();
  const match = cleaned.match(/^([\d.]+)\s*([a-zA-Z]+)?$/);
  if (!match) return 0;

  const value = parseFloat(match[1] || "0");
  if (!Number.isFinite(value)) return 0;

  const unit = (match[2] || "b").toLowerCase();

  if (unit.startsWith("t")) return value * 1024 ** 4;
  if (unit.startsWith("g")) return value * 1024 ** 3;
  if (unit.startsWith("m")) return value * 1024 ** 2;
  if (unit.startsWith("k")) return value * 1024;
  return value;
}

function parseNetString(netStr: string): number {
  const cleaned = netStr.replace(/,/g, "").trim();
  const match = cleaned.match(/^([\d.]+)\s*([a-zA-Z]+)?$/);
  if (!match) return 0;

  const value = parseFloat(match[1] || "0");
  if (!Number.isFinite(value)) return 0;

  const unit = (match[2] || "b").toLowerCase();

  if (unit.startsWith("t")) return value * 1024 ** 4;
  if (unit.startsWith("g")) return value * 1024 ** 3;
  if (unit.startsWith("m")) return value * 1024 ** 2;
  if (unit.startsWith("k")) return value * 1024;
  return value;
}

/**
 * Collect running Docker containers and their CPU/memory usage
 */
async function collectRunningAppUsage(): Promise<AppUsage[]> {
  try {
    const { stdout } = await execAsync(
      'docker stats --no-stream --format "{{ json . }}"',
    );

    if (!stdout.trim()) return [];

    const lines = stdout.trim().split("\n");
    return lines
      .flatMap((line) => {
        try {
          const parsed = JSON.parse(line) as {
            Name?: string;
            CPUPerc?: string;
            MemUsage?: string;
            MemPerc?: string;
            NetIO?: string;
          };
          const name = parsed.Name ?? "";
          if (!name) return [];

          const cpuUsage = parseFloat(parsed.CPUPerc?.replace("%", "") || "0");
          const memPercent = parseFloat(
            parsed.MemPerc?.replace("%", "") || "0",
          );
          const memParts = parsed.MemUsage?.split(" / ") || [];
          const netParts = parsed.NetIO?.split(" / ") || [];
          const memoryUsage = parseMemoryString(memParts[0]?.trim() || "0");
          const memoryLimit = parseMemoryString(memParts[1]?.trim() || "0");
          const netRx = parseNetString(netParts[0]?.trim() || "0");
          const netTx = parseNetString(netParts[1]?.trim() || "0");

          return [
            {
              id: name,
              name: name
                .replace(/-/g, " ")
                .replace(/\b\w/g, (c) => c.toUpperCase()),
              icon: DEFAULT_APP_ICON,
              cpuUsage: Number.isFinite(cpuUsage) ? cpuUsage : 0,
              memoryUsage: Number.isFinite(memoryUsage) ? memoryUsage : 0,
              memoryLimit: Number.isFinite(memoryLimit) ? memoryLimit : 0,
              memoryPercent: Number.isFinite(memPercent) ? memPercent : 0,
              netRx: Number.isFinite(netRx) ? netRx : 0,
              netTx: Number.isFinite(netTx) ? netTx : 0,
            },
          ];
        } catch {
          return [];
        }
      })
      .sort((a, b) => b.cpuUsage - a.cpuUsage);
  } catch {
    return [];
  }
}

interface CollectedApps {
  installedApps: InstalledApp[];
  otherContainers: OtherContainer[];
}

/**
 * Collect installed Docker containers and unmanaged containers.
 * Uses com.docker.compose.project label (set by --project-name) to identify
 * managed apps — same compose project naming pattern.
 */
async function collectInstalledApps(): Promise<CollectedApps> {
  try {
    const [knownApps, storeApps] = await Promise.all([
      prisma.installedApp.findMany(),
      prisma.app.findMany(),
    ]);

    // Build lookup maps
    const metaByAppId = new Map(
      knownApps.map((app) => [app.appId, app]),
    );
    const metaByContainer = new Map(
      knownApps.map((app) => [app.containerName, app]),
    );
    const storeMetaById = new Map(storeApps.map((app) => [app.appId, app]));

    // Set of known appIds for matching against compose project labels
    const managedAppIds = new Set(knownApps.map((app) => app.appId));
    // Also keep container names as fallback for legacy installs
    const managedContainerNames = new Set(knownApps.map((app) => app.containerName));

    const { stdout } = await execAsync(
      'docker ps -a --format "{{.Names}}\t{{.Status}}\t{{.Image}}\t{{.Labels}}"',
    );

    if (!stdout.trim()) return { installedApps: [], otherContainers: [] };

    const lines = stdout.trim().split("\n");

    // Group containers by compose project (appId)
    // Each managed app may have multiple containers (e.g. app + db)
    const seenAppIds = new Set<string>();
    const installedApps: InstalledApp[] = [];
    const otherContainers: OtherContainer[] = [];

    // First pass: resolve all containers with ports
    const containerData = await Promise.all(
      lines.map(async (line) => {
        const [containerName, status, image, labelsRaw] = line.split("\t");

        const labels: Record<string, string> = {};
        if (labelsRaw) {
          labelsRaw.split(",").forEach((pair) => {
            const eqIdx = pair.indexOf("=");
            if (eqIdx > 0) {
              const key = pair.substring(0, eqIdx).trim();
              const value = pair.substring(eqIdx + 1).trim();
              labels[key] = value;
            }
          });
        }

        let appStatus: "running" | "stopped" | "error" = "error";
        if (status.toLowerCase().startsWith("up")) {
          appStatus = "running";
        } else if (status.toLowerCase().includes("exited")) {
          appStatus = "stopped";
        }

        const hostPort = await resolveHostPort(containerName);
        const webUIPort = hostPort ? parseInt(hostPort, 10) : undefined;

        // Get the compose project name (set by --project-name during deploy)
        const composeProject = labels["com.docker.compose.project"] || "";

        return { containerName, status: appStatus, image, labels, webUIPort, composeProject };
      }),
    );

    for (const container of containerData) {
      const { containerName, status, image, labels, webUIPort, composeProject } = container;

      // Skip homeio helper containers
      if (labels["homeio.helper"] === "true") continue;

      // Determine if this container belongs to a managed app:
      // 1. Check compose project label against known appIds (compose pattern)
      // 2. Fallback: check container name against DB (legacy)
      const matchedAppId =
        (composeProject && managedAppIds.has(composeProject) ? composeProject : null) ||
        (managedContainerNames.has(containerName) ? metaByContainer.get(containerName)?.appId : null);

      if (matchedAppId) {
        // Skip if we already added this app (multi-container apps: only show main one)
        if (seenAppIds.has(matchedAppId)) continue;
        seenAppIds.add(matchedAppId);

        const meta = metaByAppId.get(matchedAppId);
        const storeMeta = storeMetaById.get(matchedAppId);

        // Version comparison for update detection
        const installedVersion = (meta as any)?.version ?? undefined;
        const availableVersion = storeMeta?.version ?? undefined;
        let hasUpdate = false;
        if (installedVersion && availableVersion) {
          hasUpdate = compareVersions(availableVersion, installedVersion) > 0;
        } else if (!installedVersion && availableVersion) {
          hasUpdate = true;
        }

        installedApps.push({
          id: matchedAppId,
          appId: matchedAppId,
          name:
            meta?.name ||
            storeMeta?.title ||
            storeMeta?.name ||
            matchedAppId
              .replace(/-/g, " ")
              .replace(/\b\w/g, (c) => c.toUpperCase()),
          icon: meta?.icon || storeMeta?.icon || DEFAULT_APP_ICON,
          status,
          containerName: meta?.containerName || containerName,
          installedAt: meta?.createdAt?.getTime?.() || Date.now(),
          webUIPort,
          storeId: (meta as any)?.storeId || undefined,
          version: installedVersion,
          availableVersion,
          hasUpdate,
        });
      } else {
        // Skip helper containers from multi-service composes
        const lowerName = containerName.toLowerCase();
        const helperPatterns = [
          /-docker-\d+$/,
          /-dind-\d+$/,
          /-tor-\d+$/,
          /-proxy-\d+$/,
          /-redis-\d+$/,
          /-db-\d+$/,
          /-postgres-\d+$/,
          /-mysql-\d+$/,
          /-mariadb-\d+$/,
        ];
        if (helperPatterns.some((pattern) => pattern.test(lowerName))) continue;

        // Also skip if this container belongs to a managed compose project
        // (helper service of a managed app, just not the main container)
        if (composeProject && managedAppIds.has(composeProject)) continue;

        otherContainers.push({
          id: containerName,
          name: containerName
            .replace(/-/g, " ")
            .replace(/\b\w/g, (c) => c.toUpperCase()),
          image: image || "unknown",
          status,
          webUIPort,
        });
      }
    }

    return { installedApps, otherContainers };
  } catch {
    return { installedApps: [], otherContainers: [] };
  }
}

/**
 * Start collecting and broadcasting system metrics
 */
function startBroadcasting(): void {
  // System metrics every 2 seconds
  const broadcastSystemMetrics = async () => {
    const data = await collectSystemMetrics();
    broadcast({
      type: "system-update",
      data,
      timestamp: Date.now(),
    });
  };

  // Installed apps every 10 seconds
  const broadcastInstalledApps = async () => {
    const { installedApps, otherContainers } = await collectInstalledApps();
    broadcast({
      type: "apps-update",
      data: { installedApps, otherContainers },
      timestamp: Date.now(),
    });
  };

  // Initial broadcast
  broadcastSystemMetrics();
  broadcastInstalledApps();

  // Set up intervals
  systemInterval = setInterval(broadcastSystemMetrics, 2000);
  appsInterval = setInterval(broadcastInstalledApps, 10000);
}

/**
 * Stop broadcasting (cleanup)
 */
function stopBroadcasting(): void {
  if (systemInterval) {
    clearInterval(systemInterval);
    systemInterval = null;
  }
  if (appsInterval) {
    clearInterval(appsInterval);
    appsInterval = null;
  }
  // Reset deltas so the next connection doesn't see inflated network spikes
  lastNetworkSample = null;
}

/**
 * Initialize the system status WebSocket server
 */
export function initializeSystemStatusWebSocket(server: Server): void {
  wss = new WebSocketServer({ noServer: true });

  // Handle WebSocket connections
  wss.on("connection", (ws) => {
    console.log("[SystemStatus WS] Client connected");

    // Send initial data immediately to new client
    collectSystemMetrics().then((data) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            type: "system-update",
            data,
            timestamp: Date.now(),
          }),
        );
      }
    });

    collectInstalledApps().then(({ installedApps, otherContainers }) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            type: "apps-update",
            data: { installedApps, otherContainers },
            timestamp: Date.now(),
          }),
        );
      }
    });

    ws.on("close", () => {
      console.log("[SystemStatus WS] Client disconnected");
      // Stop polling when the last client disconnects to avoid orphaned intervals
      if (wss && wss.clients.size === 0) {
        stopBroadcasting();
      }
    });

    ws.on("error", (error) => {
      console.error("[SystemStatus WS] Client error:", error);
    });
  });

  // Handle HTTP upgrade requests
  server.on("upgrade", (request, socket, head) => {
    const pathname = new URL(
      request.url || "",
      `http://${request.headers.host}`,
    ).pathname;

    if (pathname === "/api/system-status") {
      wss!.handleUpgrade(request, socket, head, (ws) => {
        wss!.emit("connection", ws, request);
      });
    }
    // Note: Don't destroy socket here - let terminal WebSocket handler check too
  });

  // Start broadcasting when first client connects
  wss.on("connection", () => {
    if (wss && wss.clients.size === 1) {
      startBroadcasting();
    }
  });

  // Stop broadcasting when no clients connected
  wss.on("close", () => {
    if (wss && wss.clients.size === 0) {
      stopBroadcasting();
    }
  });

  console.log("✓ System status WebSocket server initialized");
}

/**
 * Trigger an immediate apps update (for use after install/uninstall)
 */
export async function triggerAppsUpdate(): Promise<void> {
  const { installedApps, otherContainers } = await collectInstalledApps();
  broadcast({
    type: "apps-update",
    data: { installedApps, otherContainers },
    timestamp: Date.now(),
  });
  // Also push fresh data to SSE clients so the frontend updates immediately.
  // Retry once after a short delay if the SSE poller is busy.
  if (!(await tryPollSSE())) {
    await new Promise((r) => setTimeout(r, 300));
    await tryPollSSE();
  }
}

async function tryPollSSE(): Promise<boolean> {
  try {
    await pollAndBroadcast();
    return true;
  } catch {
    return false;
  }
}
