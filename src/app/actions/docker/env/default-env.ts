/**
 * Default environment variables for custom/unknown app deployments.
 * Provides basic system variables that most Docker apps expect.
 */

import type { InstallConfig } from "@/components/app-store/types";
import fs from "fs";
import os from "os";
import path from "path";
import { env } from "process";

/**
 * Get system defaults for common Docker environment variables.
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
 * Get the device hostname.
 */
export function getDeviceHostname(): string {
  return process.env.DEVICE_HOSTNAME || os.hostname() || "homeio";
}

function normalizeHostValue(raw?: string): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const withoutProtocol = trimmed.replace(/^https?:\/\//i, "");
  const hostPort = withoutProtocol.split("/")[0] || "";
  if (!hostPort) return null;

  // Keep IPv6 literals untouched, strip :port for common host:port values
  if (hostPort.includes("[") && hostPort.includes("]")) {
    return hostPort;
  }
  const [hostOnly] = hostPort.split(":");
  return hostOnly || null;
}

/**
 * Build default environment variables for custom app deployments.
 * These are the minimum variables needed for most Docker containers.
 */
export function buildDefaultEnvVars(
  appId: string,
  config?: InstallConfig,
): NodeJS.ProcessEnv {
  const systemDefaults = getSystemDefaults();
  const envVars: NodeJS.ProcessEnv = { ...env };

  // Basic system variables
  envVars.PUID = envVars.PUID || systemDefaults.PUID;
  envVars.PGID = envVars.PGID || systemDefaults.PGID;
  envVars.TZ = envVars.TZ || systemDefaults.TZ;

  // App identification
  envVars.APP_ID = envVars.APP_ID || appId;
  envVars.AppID = envVars.AppID || appId;

  // Data directory
  const dataRoot =
    envVars.HOMEIO_HOME ||
    envVars.HOMEIO_DATA ||
    (() => {
      try {
        fs.accessSync("/DATA");
        return "/DATA";
      } catch {
        return path.join(process.cwd(), "DATA");
      }
    })();
  envVars.APP_DATA_DIR =
    envVars.APP_DATA_DIR || path.join(dataRoot, "AppData", appId);

  // Device info
  const deviceHostname = getDeviceHostname();
  envVars.DEVICE_HOSTNAME = deviceHostname;
  envVars.DEVICE_DOMAIN_NAME =
    envVars.DEVICE_DOMAIN_NAME || `${deviceHostname}.local`;

  // Umbrel-style apps often expect APP_DOMAIN for compose templates/extra_hosts.
  const normalizedConfiguredDomain = normalizeHostValue(
    envVars.HOMEIO_DOMAIN ||
      envVars.HOMEIO_HOST ||
      envVars.HOMEIO_HTTP_HOST ||
      envVars.HOSTNAME,
  );
  envVars.APP_DOMAIN =
    envVars.APP_DOMAIN || normalizedConfiguredDomain || envVars.DEVICE_DOMAIN_NAME;

  // Apply user config overrides
  if (config) {
    applyConfigOverrides(envVars, config);
  }

  return envVars;
}

/**
 * Apply user configuration overrides to environment variables.
 */
export function applyConfigOverrides(
  envVars: NodeJS.ProcessEnv,
  config: InstallConfig,
): void {
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
