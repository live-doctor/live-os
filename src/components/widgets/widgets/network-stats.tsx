"use client";

import { text } from "@/components/ui/design-tokens";
import { cn } from "@/lib/utils";
import { ArrowDownToLine, ArrowUpToLine } from "lucide-react";
import type { NetworkWidgetData } from "../types";

interface NetworkStatsWidgetProps {
  data: NetworkWidgetData;
}

function formatMbps(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "0 Mbps";
  if (value < 1) return `${value.toFixed(2)} Mbps`;
  if (value < 10) return `${value.toFixed(1)} Mbps`;
  return `${Math.round(value)} Mbps`;
}

export function NetworkStatsWidget({ data }: NetworkStatsWidgetProps) {
  const statusLabel = data.connected ? "Online" : "Offline";

  return (
    <div className="flex h-full flex-col justify-between p-3">
      <div>
        <div className="mb-1 flex items-center justify-between">
          <h3 className={cn(text.label, "uppercase tracking-wider")}>Network</h3>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide",
              data.connected
                ? "bg-emerald-500/20 text-emerald-200"
                : "bg-zinc-500/30 text-zinc-300",
            )}
          >
            {statusLabel}
          </span>
        </div>
        <p className={cn(text.muted, "truncate")}>{data.interfaceName}</p>
        <p className={cn(text.muted, "truncate")}>{data.ip4}</p>
      </div>

      <div className="mt-3 space-y-2">
        <div className="flex items-center justify-between rounded-lg bg-white/5 px-2.5 py-1.5">
          <div className="flex items-center gap-2">
            <ArrowDownToLine className="h-3.5 w-3.5 text-cyan-300" />
            <span className={cn(text.muted, "uppercase tracking-wide")}>Down</span>
          </div>
          <span className="text-sm font-semibold text-cyan-100">
            {formatMbps(data.downloadMbps)}
          </span>
        </div>
        <div className="flex items-center justify-between rounded-lg bg-white/5 px-2.5 py-1.5">
          <div className="flex items-center gap-2">
            <ArrowUpToLine className="h-3.5 w-3.5 text-amber-300" />
            <span className={cn(text.muted, "uppercase tracking-wide")}>Up</span>
          </div>
          <span className="text-sm font-semibold text-amber-100">
            {formatMbps(data.uploadMbps)}
          </span>
        </div>
      </div>
    </div>
  );
}
