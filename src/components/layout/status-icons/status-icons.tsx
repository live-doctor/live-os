"use client";

import type { ReactNode } from "react";
import { BatteryIcon } from "./battery-icon";
import { DateDisplay } from "./date-display";
import { useStatusData } from "./use-status-data";
import { WifiIcon } from "./wifi-icon";

type StatusBarProps = {
  children?: ReactNode;
  onWifiClick?: () => void;
};

export function StatusBar({ children, onWifiClick }: StatusBarProps) {
  const status = useStatusData();

  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-secondary/60 backdrop-blur-xl border border-border">
      <button
        type="button"
        onClick={onWifiClick}
        className="rounded-lg p-1 hover:bg-secondary/60 transition-colors"
        title="Wi-Fi settings"
      >
        <WifiIcon status={status.wifi} />
      </button>
      <BatteryIcon status={status.battery} />
      {children}
      <DateDisplay />
    </div>
  );
}

/** @deprecated Use StatusBar instead */
export const StatusIcons = StatusBar;
