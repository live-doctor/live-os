export type ModuleName =
  | "docker"
  | "files"
  | "monitoring"
  | "settings"
  | "terminal";

export type ModuleManifest = {
  name: ModuleName;
  label: string;
  enabled: boolean;
  description: string;
};

export const MODULE_REGISTRY: ModuleManifest[] = [
  {
    name: "docker",
    label: "Docker",
    enabled: true,
    description: "Application lifecycle and container operations",
  },
  {
    name: "files",
    label: "Files",
    enabled: true,
    description: "Filesystem and network storage operations",
  },
  {
    name: "monitoring",
    label: "Monitoring",
    enabled: true,
    description: "Live CPU, memory, storage, and network metrics",
  },
  {
    name: "settings",
    label: "Settings",
    enabled: true,
    description: "System preferences and account settings",
  },
  {
    name: "terminal",
    label: "Terminal",
    enabled: true,
    description: "Host and container terminal access",
  },
];
