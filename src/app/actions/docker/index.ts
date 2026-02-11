/**
 * Docker operations module - Split following SOLID principles
 *
 * Structure:
 * - utils.ts: Validation, helpers, file operations
 * - db.ts: Database operations for installed apps
 * - deploy.ts: Unified app deployment (install, custom deploy, redeploy)
 * - lifecycle.ts: Start, stop, restart, update, uninstall
 * - query.ts: Read-only operations (list apps, status, logs)
 */

// Deployment (unified pipeline)
export { deployApp, convertDockerRunToCompose } from "./deploy";
export type { DeployOptions } from "./deploy";

// Lifecycle
export {
  startApp,
  stopApp,
  restartApp,
  removeContainer,
  updateApp,
  uninstallApp,
  listTrashedApps,
  emptyTrash,
} from "./lifecycle";

// Queries
export {
  getInstalledApps,
  getAppById,
  getAppStatus,
  getAppWebUI,
  getAppLogs,
} from "./query";

// Export utilities for use in other modules
export {
  validateAppId,
  validatePort,
  validatePath,
  getContainerName,
  getContainerNameFromCompose,
  resolveContainerName,
  getSystemDefaults,
  getHostArchitecture,
  findComposeForApp,
  sanitizeComposeFile,
} from "./utils";

// Export dependency resolution
export { checkDependencies } from "./dependencies";

// Export backup utilities
export {
  backupComposeFile,
  restoreComposeFile,
  backupContainerConfig,
  cleanupBackup,
} from "./backup";

// Export health check utilities
export { waitForContainerRunning, getContainerExitCode } from "./health";

// Export DB operations
export {
  getAppMeta,
  recordInstalledApp,
  getRecordedContainerName,
  getInstallConfig,
  checkAllAppUpdates,
  checkAppUpdate,
  getAppsWithUpdates,
} from "./db";

export type { AppUpdateInfo } from "./db";
