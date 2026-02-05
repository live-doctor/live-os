/**
 * CasaOS-specific environment variables.
 *
 * Based on: https://github.com/IceWhaleTech/CasaOS-AppStore/blob/main/CONTRIBUTING.md
 *
 * CasaOS provides these system variables:
 * - $PUID: preset user ID
 * - $PGID: preset group ID
 * - $TZ: system timezone
 * - $AppID: application name
 * - $WEBUI_PORT: dynamically allocated port for web UI (CasaOS 0.4.4+)
 */

import type { InstallConfig } from "@/components/app-store/types";
import path from "path";
import { env } from "process";
import {
  applyConfigOverrides,
  getDeviceHostname,
  getSystemDefaults,
} from "./default-env";

/**
 * Find an available port for the web UI.
 * Starts from the preferred port and increments until finding an available one.
 */
async function findAvailablePort(preferredPort: number): Promise<number> {
  const net = await import("net");

  const isPortAvailable = (port: number): Promise<boolean> => {
    return new Promise((resolve) => {
      const server = net.createServer();
      server.once("error", () => resolve(false));
      server.once("listening", () => {
        server.close();
        resolve(true);
      });
      server.listen(port, "0.0.0.0");
    });
  };

  let port = preferredPort;
  const maxAttempts = 100;

  for (let i = 0; i < maxAttempts; i++) {
    if (await isPortAvailable(port)) {
      return port;
    }
    port++;
  }

  // Fallback to a random high port
  return 30000 + Math.floor(Math.random() * 10000);
}

/**
 * Build CasaOS-specific environment variables.
 *
 * CasaOS apps expect:
 * - Standard Linux user/group/timezone variables
 * - AppID for identification
 * - WEBUI_PORT for dynamic port allocation
 * - Data paths using $AppID
 */
export async function buildCasaOSEnvVars(
  appId: string,
  config?: InstallConfig,
  preferredWebUIPort?: number,
): Promise<NodeJS.ProcessEnv> {
  const systemDefaults = getSystemDefaults();
  const envVars: NodeJS.ProcessEnv = { ...env };

  // CasaOS standard variables
  envVars.PUID = envVars.PUID || systemDefaults.PUID;
  envVars.PGID = envVars.PGID || systemDefaults.PGID;
  envVars.TZ = envVars.TZ || systemDefaults.TZ;

  // App identification (CasaOS uses $AppID)
  envVars.AppID = appId;
  envVars.APP_ID = appId;

  // Data directory (CasaOS pattern: /DATA/AppData/$AppID)
  envVars.APP_DATA_DIR = path.join("/DATA/AppData", appId);

  // Dynamic web UI port allocation (CasaOS 0.4.4+)
  // If a preferred port is specified, try to use it; otherwise find an available one
  if (preferredWebUIPort) {
    const webUIPort = await findAvailablePort(preferredWebUIPort);
    envVars.WEBUI_PORT = String(webUIPort);
  }

  // Device info
  envVars.DEVICE_HOSTNAME = getDeviceHostname();

  // Apply user config overrides
  if (config) {
    applyConfigOverrides(envVars, config);

    // If user specified a webUIPort in config, use that
    if (config.webUIPort && !envVars.WEBUI_PORT) {
      envVars.WEBUI_PORT = config.webUIPort;
    }
  }

  return envVars;
}
