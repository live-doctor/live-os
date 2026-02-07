// System info
export {
  getSystemUsername,
  getSystemInfo,
  getUptime,
  restartSystem,
  shutdownSystem,
} from "./system";

// Real-time system status
export {
  getSystemStatus,
  getStorageInfo as getSystemStorageInfo,
  getNetworkStats,
} from "./system-status";

// Storage
export {
  getStorageInfo,
  listExternalStorageDevices,
  migrateToExternalStorage,
  mountExternalStorageDevice,
  unmountExternalStorageDevice,
  type ExternalStorageInfo,
  type StorageInfo,
} from "./storage";
