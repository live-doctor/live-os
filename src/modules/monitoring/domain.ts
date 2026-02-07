import type {
  NetworkStats,
  StorageStats,
  SystemStats,
} from "@/hooks/system-status-types";

export type MonitoringSnapshot = {
  system: SystemStats | null;
  storage: StorageStats | null;
  network: NetworkStats | null;
  connected: boolean;
};
