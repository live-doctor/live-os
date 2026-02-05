/**
 * Default environment variables for custom/unknown app deployments.
 * Provides basic system variables that most Docker apps expect.
 */

import type { InstallConfig } from "@/components/app-store/types";
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
  return process.env.DEVICE_HOSTNAME || os.hostname() || "liveos";
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
  envVars.APP_DATA_DIR =
    envVars.APP_DATA_DIR || path.join("/DATA/AppData", appId);

  // Device info
  envVars.DEVICE_HOSTNAME = getDeviceHostname();
  envVars.DEVICE_DOMAIN_NAME = `${getDeviceHostname()}.local`;

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
