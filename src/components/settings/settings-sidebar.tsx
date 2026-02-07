"use client";

import Image from "next/image";
import { useState } from "react";
import { MetricCard } from "./metric-card";
import type { StorageInfo, SystemInfo, SystemStatus } from "./types";

type SidebarProps = {
  currentWallpaper?: string;
  systemInfo?: SystemInfo | null;
  storageInfo?: StorageInfo | null;
  systemStatus?: SystemStatus | null;
  formatBytes: (bytes: number, decimals?: number) => string;
  getMetricColor: (percentage: number) => "cyan" | "green" | "yellow" | "red";
};

export function SettingsSidebar({
  currentWallpaper,
  systemInfo,
  storageInfo,
  systemStatus,
  formatBytes,
  getMetricColor,
}: SidebarProps) {
  const cpuThreads = systemStatus?.hardware?.cpu?.cores;
  const [tempUnit, setTempUnit] = useState<"C" | "F">("C");

  const tempValueC = systemStatus?.cpu.temperature;
  const displayTemp = (() => {
    if (typeof tempValueC !== "number") return null;
    return tempUnit === "C"
      ? tempValueC
      : Math.round((tempValueC * 9) / 5 + 32);
  })();

  return (
    <div className="w-full max-w-[280px] space-y-3">
      {/* System Preview Card */}
      <div
        className="max-h-fit max-w-fit rounded-[15px] p-[1px]"
        style={{
          backgroundImage:
            "linear-gradient(135deg, rgba(237,237,237,0.42) 0.13%, rgba(173,173,173,0.12) 26.95%, rgba(0,0,0,0) 81.15%, rgb(64,64,64) 105.24%)",
          filter:
            "drop-shadow(rgba(0, 21, 64, 0.14) 0px 0px 0.63px) drop-shadow(rgba(0, 21, 64, 0.05) 0px 0.63px 1.27px)",
        }}
      >
        <div className="rounded-[15px] bg-[#0C0D0C] p-[9px]">
          <div className="relative aspect-video overflow-hidden rounded-[5px]">
            {currentWallpaper && (
              <Image
                src={currentWallpaper}
                alt="System preview"
                className="h-full w-full object-cover opacity-30"
                width={500}
                height={500}
              />
            )}
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-[12px] text-white/70 tracking-[-0.02em]">
                Good evening, {systemInfo?.username || "User"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Storage Card */}
      {storageInfo && (
        <div className="rounded-[12px] bg-white/5 px-3 py-4 lg:p-6">
          <MetricCard
            label="Storage"
            value={`${storageInfo.used} GB`}
            total={`${storageInfo.total} GB`}
            percentage={storageInfo.usagePercent}
            detail={`${Math.round((storageInfo.total - storageInfo.used) * 10) / 10} GB left`}
            color={getMetricColor(storageInfo.usagePercent)}
          />
        </div>
      )}

      {/* Memory Card */}
      {systemStatus && (
        <div className="rounded-[12px] bg-white/5 px-3 py-4 lg:p-6">
          <MetricCard
            label="Memory"
            value={formatBytes(systemStatus.memory.used)}
            total={formatBytes(systemStatus.memory.total)}
            percentage={systemStatus.memory.usage}
            detail={`${formatBytes(systemStatus.memory.total - systemStatus.memory.used)} left`}
            color={getMetricColor(systemStatus.memory.usage)}
          />
        </div>
      )}

      {/* CPU Card */}
      {systemStatus && (
        <div className="rounded-[12px] bg-white/5 px-3 py-4 lg:p-6">
          <MetricCard
            label="CPU"
            value={`${systemStatus.cpu.usage}%`}
            percentage={systemStatus.cpu.usage}
            detail={
              typeof cpuThreads === "number" && cpuThreads > 0
                ? `${cpuThreads} threads`
                : "8 threads"
            }
            color={getMetricColor(systemStatus.cpu.usage)}
          />
        </div>
      )}

      {/* Temperature Card */}
      {systemStatus && tempValueC !== undefined && tempValueC !== null && (
        <div className="rounded-[12px] bg-white/5 px-3 py-4 lg:p-6">
          <div className="space-y-1.5">
            <div className="text-[12px] text-white/40 tracking-[-0.02em]">
              Temperature
            </div>
            <div className="flex items-end justify-between">
              <div className="text-[17px] font-bold leading-none text-white tracking-[-0.04em]">
                {displayTemp ?? "—"}°{tempUnit}
              </div>
              <div className="flex gap-1">
                <button
                  className={`h-[30px] rounded-full border px-2.5 text-[12px] tracking-[-0.02em] ${tempUnit === "C" ? "bg-white/10 text-white border-white/20" : "bg-white/5 text-white/50 border-white/10"}`}
                  onClick={() => setTempUnit("C")}
                >
                  °C
                </button>
                <button
                  className={`h-[30px] rounded-full border px-2.5 text-[12px] tracking-[-0.02em] ${tempUnit === "F" ? "bg-white/10 text-white border-white/20" : "bg-white/5 text-white/50 border-white/10"}`}
                  onClick={() => setTempUnit("F")}
                >
                  °F
                </button>
              </div>
            </div>
            <div className="mt-1 flex justify-end">
              <span className="text-[12px] text-white/40 tracking-[-0.02em]">
                Normal
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
