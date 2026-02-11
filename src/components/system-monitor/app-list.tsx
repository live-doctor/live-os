"use client";

import { card, text } from "@/components/ui/design-tokens";
import { formatBytes } from "@/lib/utils";
import { AppListItem } from "./app-list-item";
import type { RunningApp, SelectedMetric } from "./types";

interface AppListProps {
  apps: RunningApp[];
  connected: boolean;
  activeMetric?: SelectedMetric;
  systemStorageLabel?: string;
}

const metricBadgeLabel: Record<Exclude<SelectedMetric, null>, string> = {
  cpu: "CPU",
  memory: "Memory",
  storage: "Storage",
  network: "Network",
};

export function AppList({
  apps,
  connected,
  activeMetric = null,
  systemStorageLabel,
}: AppListProps) {
  return (
    <div className={`${card.base} ${card.padding.md}`}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className={text.valueSmall}>Application</h3>
        {activeMetric && (
          <span className="inline-flex items-center rounded-lg border border-border bg-secondary/60 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            {metricBadgeLabel[activeMetric]}
          </span>
        )}
      </div>
      <div className="mb-3">
        <p className={text.label}>Resource usage by app</p>
      </div>

      <div className="space-y-1">
        {!connected && (
          <div className={`${text.label} py-2`}>Connecting to server...</div>
        )}
        {connected && apps.length === 0 && (
          <div className={`${text.label} py-2`}>No running apps detected.</div>
        )}
        {apps.map((app) => (
          <AppListItem
            key={app.id}
            app={app}
            cpuLabel={`${app.cpuUsage.toFixed(1)}%`}
            memLabel={`${formatBytes(app.memoryUsage)}`}
            displayMetric={activeMetric}
            storageLabel={app.id === "system" ? systemStorageLabel : undefined}
            netLabel={
              app.netRx !== undefined && app.netTx !== undefined
                ? `${formatBytes(app.netRx)} / ${formatBytes(app.netTx)}`
                : undefined
            }
          />
        ))}
      </div>
    </div>
  );
}
