/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { colors } from "@/components/ui/design-tokens";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSystemStatus } from "@/hooks/useSystemStatus";
import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

import { formatBytes } from "@/lib/utils";
import { AppList } from "./app-list";
import { DialogHeader } from "./dialog-header";
import { MetricChartCard } from "./metric-chart-card";
import { NetworkChart } from "./network-chart";
import type { ChartDataPoint, SelectedMetric } from "./types";
import { getMetricColor } from "./utils";

interface SystemMonitorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SystemMonitorDialog({
  open,
  onOpenChange,
}: SystemMonitorDialogProps) {
  const { systemStats, storageStats, networkStats, runningApps, connected } =
    useSystemStatus({ fast: true, enabled: open });

  const [selectedMetric, setSelectedMetric] = useState<SelectedMetric>(null);
  const [cpuHistory, setCpuHistory] = useState<ChartDataPoint[]>([]);
  const [memoryHistory, setMemoryHistory] = useState<ChartDataPoint[]>([]);
  const [storageHistory, setStorageHistory] = useState<ChartDataPoint[]>([]);
  const [gpuHistory, setGpuHistory] = useState<ChartDataPoint[]>([]);
  const [networkUploadHistory, setNetworkUploadHistory] = useState<
    ChartDataPoint[]
  >([]);
  const [networkDownloadHistory, setNetworkDownloadHistory] = useState<
    ChartDataPoint[]
  >([]);

  const lastUpdateRef = useRef<number>(0);

  // Update history when WebSocket data changes
  useEffect(() => {
    if (!open || !systemStats || !storageStats || !networkStats) return;

    const now = Date.now();
    if (now - lastUpdateRef.current < 500) return;
    lastUpdateRef.current = now;

    setCpuHistory((prev) =>
      [...prev, { value: systemStats.cpu.usage }].slice(-30),
    );
    setMemoryHistory((prev) =>
      [...prev, { value: systemStats.memory.usage }].slice(-30),
    );
    setStorageHistory((prev) =>
      [...prev, { value: storageStats.usagePercent }].slice(-30),
    );
    const gpuUsage = systemStats.hardware?.graphics?.utilizationGpu ?? 0;
    setGpuHistory((prev) => [...prev, { value: gpuUsage }].slice(-30));
    setNetworkUploadHistory((prev) =>
      [...prev, { value: networkStats.uploadMbps }].slice(-60),
    );
    setNetworkDownloadHistory((prev) =>
      [...prev, { value: networkStats.downloadMbps }].slice(-60),
    );
  }, [open, systemStats, storageStats, networkStats]);

  // Clear history when dialog closes
  useEffect(() => {
    if (!open) {
      setCpuHistory([]);
      setMemoryHistory([]);
      setStorageHistory([]);
      setGpuHistory([]);
      setNetworkUploadHistory([]);
      setNetworkDownloadHistory([]);
      setSelectedMetric(null);
    }
  }, [open]);

  // Default values
  const currentSystemStats = systemStats || {
    cpu: { usage: 0, temperature: 0, power: 0 },
    memory: { usage: 0, total: 0, used: 0, free: 0 },
  };

  // GPU info from hardware
  const gpuUsage = systemStats?.hardware?.graphics?.utilizationGpu ?? 0;
  const gpuName = systemStats?.hardware?.graphics?.model || "GPU";

  const currentStorageStats = storageStats || {
    total: 0,
    used: 0,
    usagePercent: 0,
    health: "Healthy",
  };

  const currentNetworkStats = networkStats || {
    uploadMbps: 0,
    downloadMbps: 0,
  };

  const handleCardClick = (metric: SelectedMetric) => {
    setSelectedMetric(selectedMetric === metric ? null : metric);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-h-[92vh] max-w-[95vw] overflow-hidden rounded-[20px] border border-white/10 bg-[rgba(47,51,57,0.72)] p-0 text-white shadow-[0_28px_80px_rgba(0,0,0,0.48)] backdrop-blur-3xl sm:max-w-[1280px]"
      >
        <DialogTitle className="sr-only">Live Usage</DialogTitle>
        <DialogDescription className="sr-only">
          Real-time system metrics and running applications.
        </DialogDescription>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onOpenChange(false)}
          className="absolute right-5 top-5 z-20 h-8 w-8 cursor-pointer rounded-full border border-white/15 bg-white/10 text-white/50 hover:bg-white/20 hover:text-white"
        >
          <X className="h-4 w-4" />
        </Button>

        <DialogHeader connected={connected} />

        <ScrollArea
          className="h-[calc(92vh-132px)] w-full"
          viewportClassName="homeio-scrollarea-fit h-full w-full"
        >
          <div className="min-w-0 space-y-3 px-3 pb-6 md:px-[28px] xl:px-[40px]">
            {/* Top 4 Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <MetricChartCard
                label="CPU"
                value={`${currentSystemStats.cpu.usage}%`}
                subtitle="Click to view by app"
                color={getMetricColor(currentSystemStats.cpu.usage)}
                gradientId="cpuGradient"
                data={cpuHistory}
                selected={selectedMetric === "cpu"}
                clickable
                onClick={() => handleCardClick("cpu")}
              />

              <MetricChartCard
                label="Memory"
                value={
                  formatBytes(currentSystemStats.memory.used).split(" ")[0]
                }
                unit="GB"
                subtitle={`${formatBytes(currentSystemStats.memory.total)} total • Click to view by app`}
                color={colors.memory}
                gradientId="memoryGradient"
                data={memoryHistory}
                selected={selectedMetric === "memory"}
                clickable
                onClick={() => handleCardClick("memory")}
              />

              <MetricChartCard
                label="GPU"
                value={`${Math.round(gpuUsage)}%`}
                subtitle={gpuName}
                color={colors.gpu}
                gradientId="gpuGradient"
                data={gpuHistory}
              />

              <MetricChartCard
                label="Storage"
                value={currentStorageStats.used.toFixed(1)}
                unit="GB"
                subtitle={`${(currentStorageStats.total - currentStorageStats.used).toFixed(0)} GB left • Click to view by app`}
                color={colors.storage}
                gradientId="storageGradient"
                data={storageHistory}
                selected={selectedMetric === "storage"}
                clickable
                onClick={() => handleCardClick("storage")}
              />
            </div>

            {/* Network Chart */}
            <NetworkChart
              uploadHistory={networkUploadHistory}
              downloadHistory={networkDownloadHistory}
              currentUpload={currentNetworkStats.uploadMbps}
              currentDownload={currentNetworkStats.downloadMbps}
              selected={selectedMetric === "network"}
              clickable
              onClick={() => handleCardClick("network")}
            />

            {/* Applications List */}
            <AppList
              apps={[
                {
                  id: "system",
                  name: "System",
                  cpuUsage: currentSystemStats.cpu.usage,
                  memoryUsage: currentSystemStats.memory.used,
                },
                ...runningApps,
              ]}
              connected={connected}
              activeMetric={selectedMetric}
              systemStorageLabel={`${currentStorageStats.used.toFixed(1)} GB`}
            />
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
