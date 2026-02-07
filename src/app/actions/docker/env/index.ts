/**
 * Environment variable builders for different app store formats.
 * Each builder provides the specific environment variables needed
 * for apps from that store to function correctly.
 */

export { buildUmbrelEnvVars } from "./umbrel-env";
export { buildDefaultEnvVars } from "./default-env";
export { detectStoreType, type StoreType } from "./detect";
