import type { MonitoringSnapshot } from "./domain";

export function isMonitoringOnline(snapshot: MonitoringSnapshot) {
  return snapshot.connected && snapshot.system !== null;
}
