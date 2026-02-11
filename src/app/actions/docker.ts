"use server";

/**
 * Docker operations — "use server" boundary for client imports.
 *
 * Client components import from "@/app/actions/docker" which resolves here.
 * The "use server" directive is required so Next.js treats every export as a
 * server action and doesn't try to bundle Node.js modules into the client.
 *
 * The barrel re-export syntax (`export { x } from "./y"`) doesn't work in
 * "use server" files, so we use the const-assignment pattern instead.
 */

// Deployment
import { deployApp as _deployApp, convertDockerRunToCompose as _convertDockerRunToCompose } from "./docker/deploy";
export const deployApp = _deployApp;
export const convertDockerRunToCompose = _convertDockerRunToCompose;

// Lifecycle
import {
  emptyTrash as _emptyTrash,
  listTrashedApps as _listTrashedApps,
  removeContainer as _removeContainer,
  restartApp as _restartApp,
  startApp as _startApp,
  stopApp as _stopApp,
  uninstallApp as _uninstallApp,
  updateApp as _updateApp,
} from "./docker/lifecycle";
export const startApp = _startApp;
export const stopApp = _stopApp;
export const restartApp = _restartApp;
export const updateApp = _updateApp;
export const uninstallApp = _uninstallApp;
export const removeContainer = _removeContainer;
export const listTrashedApps = _listTrashedApps;
export const emptyTrash = _emptyTrash;

// Queries
import {
  getAppById as _getAppById,
  getAppLogs as _getAppLogs,
  getAppStatus as _getAppStatus,
  getAppWebUI as _getAppWebUI,
  getInstalledApps as _getInstalledApps,
} from "./docker/query";
export const getInstalledApps = _getInstalledApps;
export const getAppById = _getAppById;
export const getAppStatus = _getAppStatus;
export const getAppWebUI = _getAppWebUI;
export const getAppLogs = _getAppLogs;
