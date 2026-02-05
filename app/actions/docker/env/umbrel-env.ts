/**
 * Umbrel-specific environment variables.
 *
 * Based on: https://github.com/getumbrel/umbrel-apps/blob/master/README.md
 *
 * Umbrel provides these environment variables:
 *
 * System-level:
 * - $DEVICE_HOSTNAME: Device hostname
 * - $DEVICE_DOMAIN_NAME: .local domain name
 *
 * App-specific:
 * - $APP_DATA_DIR: Persistent data directory
 * - $APP_PASSWORD: Unique authentication password (per-app)
 * - $APP_SEED: 256-bit derived hex string for deterministic secrets
 * - $APP_HIDDEN_SERVICE: Tor hidden service address (if Tor enabled)
 *
 * Bitcoin/Lightning (if dependencies installed):
 * - $APP_BITCOIN_DATA_DIR, $APP_BITCOIN_NODE_IP, $APP_BITCOIN_RPC_PORT, etc.
 * - $APP_LIGHTNING_NODE_DATA_DIR, $APP_LIGHTNING_NODE_IP, etc.
 */

import type { InstallConfig } from "@/components/app-store/types";
import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import { env } from "process";
import {
  applyConfigOverrides,
  getDeviceHostname,
  getSystemDefaults,
} from "./default-env";

/** File to persist app secrets so they remain stable across restarts */
const SECRETS_FILE = ".umbrel-secrets.json";

type AppSecrets = {
  password: string;
  seed: string;
};

/**
 * Generate a secure random password.
 * Umbrel uses alphanumeric passwords that are easy to type.
 */
function generatePassword(length: number = 24): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const bytes = crypto.randomBytes(length);
  let password = "";
  for (let i = 0; i < length; i++) {
    password += chars[bytes[i] % chars.length];
  }
  return password;
}

/**
 * Generate a 256-bit hex seed (64 hex characters).
 * This is used for deterministic secret derivation.
 */
function generateSeed(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Load or create app secrets.
 * Secrets are persisted in the app data directory so they remain
 * stable across container restarts and redeployments.
 */
async function getOrCreateSecrets(appDataDir: string): Promise<AppSecrets> {
  const secretsPath = path.join(appDataDir, SECRETS_FILE);

  try {
    const content = await fs.readFile(secretsPath, "utf-8");
    const secrets = JSON.parse(content) as AppSecrets;
    if (secrets.password && secrets.seed) {
      return secrets;
    }
  } catch {
    // File doesn't exist or is invalid, create new secrets
  }

  // Generate new secrets
  const secrets: AppSecrets = {
    password: generatePassword(),
    seed: generateSeed(),
  };

  // Ensure directory exists and save secrets
  await fs.mkdir(appDataDir, { recursive: true });
  await fs.writeFile(secretsPath, JSON.stringify(secrets, null, 2), {
    mode: 0o600, // Only owner can read/write
  });

  return secrets;
}

/**
 * Build Umbrel-specific environment variables.
 *
 * Umbrel apps expect:
 * - Standard system variables (PUID, PGID, TZ)
 * - APP_PASSWORD: Unique password for the app (persisted)
 * - APP_SEED: 256-bit hex seed for deterministic secrets (persisted)
 * - APP_DATA_DIR: Persistent data directory
 * - UMBREL_ROOT: Root directory for Umbrel data
 */
export async function buildUmbrelEnvVars(
  appId: string,
  config?: InstallConfig,
): Promise<NodeJS.ProcessEnv> {
  const systemDefaults = getSystemDefaults();
  const envVars: NodeJS.ProcessEnv = { ...env };

  // Standard system variables
  envVars.PUID = envVars.PUID || systemDefaults.PUID;
  envVars.PGID = envVars.PGID || systemDefaults.PGID;
  envVars.TZ = envVars.TZ || systemDefaults.TZ;

  // App identification
  envVars.APP_ID = appId;

  // Data directories (Umbrel pattern)
  const appDataDir = path.join("/DATA/AppData", appId);
  envVars.APP_DATA_DIR = appDataDir;
  envVars.UMBREL_ROOT = "/DATA";

  // Device info
  const hostname = getDeviceHostname();
  envVars.DEVICE_HOSTNAME = hostname;
  envVars.DEVICE_DOMAIN_NAME = `${hostname}.local`;

  // Generate or load persisted secrets
  const secrets = await getOrCreateSecrets(appDataDir);
  envVars.APP_PASSWORD = secrets.password;
  envVars.APP_SEED = secrets.seed;

  // Tor proxy (placeholder - would need actual Tor integration)
  envVars.TOR_PROXY_IP = envVars.TOR_PROXY_IP || "127.0.0.1";
  envVars.TOR_PROXY_PORT = envVars.TOR_PROXY_PORT || "9050";

  // Bitcoin/Lightning placeholders (only set if dependencies are installed)
  // These would need to be dynamically resolved based on installed apps
  // For now, we leave them unset unless the user provides them

  // Apply user config overrides
  if (config) {
    applyConfigOverrides(envVars, config);
  }

  return envVars;
}

/**
 * Remove Umbrel app secrets when uninstalling.
 */
export async function removeUmbrelSecrets(appId: string): Promise<void> {
  const secretsPath = path.join("/DATA/AppData", appId, SECRETS_FILE);
  try {
    await fs.unlink(secretsPath);
  } catch {
    // File doesn't exist, nothing to remove
  }
}
