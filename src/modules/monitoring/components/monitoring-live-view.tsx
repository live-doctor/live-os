"use client";

import { SystemMonitorDialog } from "@/components/system-monitor";

type MonitoringLiveViewProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function MonitoringLiveView({
  open,
  onOpenChange,
}: MonitoringLiveViewProps) {
  return <SystemMonitorDialog open={open} onOpenChange={onOpenChange} />;
}
