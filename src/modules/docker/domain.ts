import type {
  InstalledApp,
  OtherContainer,
} from "@/hooks/system-status-types";

export type DockerOverview = {
  installedApps: InstalledApp[];
  unmanagedContainers: OtherContainer[];
  connected: boolean;
};
