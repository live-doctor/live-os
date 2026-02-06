/**
 * Port configuration with optional description
 */
export interface PortConfig {
  container: string;
  published: string;
  protocol: string;
  description?: string;
}

/**
 * Volume configuration with optional description
 */
export interface VolumeConfig {
  container: string;
  source: string;
  description?: string;
}

/**
 * Environment variable with optional description
 */
export interface EnvConfig {
  key: string;
  value: string;
  description?: string;
}

/**
 * Pre-installation tips
 */
export interface AppTips {
  beforeInstall?: string; // Markdown content to show before install
}

export interface App {
  id: string; // folder name (e.g., "nextcloud")
  title: string; // Display name
  name: string; // System name
  icon: string; // URL or path
  tagline: string; // Short description
  overview: string; // Full description
  category: string[]; // Categories
  developer: string; // Developer name
  screenshots?: string[]; // Array of image URLs
  version?: string; // App version
  port?: number; // Main web UI port
  path?: string; // Path suffix for web UI (e.g., "/admin")
  website?: string; // Official website
  repo?: string; // Source code repository
  composePath?: string; // Local compose path (for install)
  releaseNotes?: string; // Release notes (markdown)
  defaultUsername?: string; // Default login username
  defaultPassword?: string; // Default login password
  dependencies?: string[]; // Required app dependencies

  // Store metadata
  storeId?: string; // Store database ID (foreign key)
  storeName?: string; // Human-friendly store name
  storeSlug?: string; // Store slug identifier

  // Additional app metadata
  architectures?: string[]; // Supported architectures (amd64, arm64, arm)
  tips?: AppTips; // Pre-installation tips
  thumbnail?: string; // Featured display image URL

  container?: {
    image: string;
    ports: PortConfig[];
    volumes: VolumeConfig[];
    environment: EnvConfig[];
  };
}

export interface InstallConfig {
  ports: PortConfig[];
  volumes: VolumeConfig[];
  environment: EnvConfig[];
  webUIPort?: string;
  networkMode?: string;
}

export interface InstalledApp {
  id: string; // Unique ID for the installed instance
  appId: string; // Reference to original app in AppStore
  name: string; // Display name
  icon: string; // Icon path
  status: "running" | "stopped" | "error";
  webUIPort?: number; // Primary port for "Open" action
  containerName: string; // Docker container name (primary)
  containers?: string[]; // All container names in compose project
  installedAt: number; // Timestamp
  storeId?: string; // Store ID (foreign key to Store table)
  // Version tracking for updates
  version?: string; // Installed version
  availableVersion?: string; // Latest version from store
  hasUpdate?: boolean; // Whether update is available
}
