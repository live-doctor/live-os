"use client";

import { useMemo } from "react";
import type { DiagnosticResult } from "./types";
import { Button } from "@/components/ui/button";
import { card, cn, text } from "@/components/ui/design-tokens";
import { Activity, CheckCircle2, Loader2 } from "lucide-react";

type Props = {
  diagnostics: DiagnosticResult | null;
  loading: boolean;
  onRun: () => void;
};

const statusBadge = {
  passed: "bg-emerald-500/15 text-emerald-200 border border-emerald-500/30",
  failed: "bg-red-500/15 text-red-200 border border-red-500/30",
  warning: "bg-amber-500/15 text-amber-200 border border-amber-500/30",
};

export function DiagnosticsCard({ diagnostics, loading, onRun }: Props) {
  const overallStatus = useMemo(
    () => diagnostics?.overallStatus ?? "warning",
    [diagnostics],
  );

  return (
    <section className={cn(card.base, card.padding.md, "space-y-3")}>
      <header className="flex items-center justify-between">
        <div className="space-y-1">
          <p className={cn(text.labelUppercase, "tracking-[0.18em]")}>Diagnostics</p>
          <h3 className={text.heading}>Health checks</h3>
          <p className={text.muted}>Disk, memory, Docker, network, DNS, and services</p>
        </div>
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-2",
              statusBadge[overallStatus],
            )}
          >
            <CheckCircle2 className="h-4 w-4" />
            {diagnostics ? diagnostics.overallStatus : "Not run"}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="border border-white/15 bg-white/10 hover:bg-white/20 text-white text-xs shadow-sm"
            onClick={onRun}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Activity className="h-4 w-4 mr-2" />
            )}
            Run
          </Button>
        </div>
      </header>

      <div className="space-y-2">
        {loading && (
          <div className="flex items-center gap-2 text-white/70 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            Running diagnostics...
          </div>
        )}

        {!loading && !diagnostics && (
          <div className="text-white/60 text-sm">Run diagnostics to see detailed checks.</div>
        )}

        {diagnostics && (
          <div className="space-y-2">
            {diagnostics.checks.map((check) => (
              <div
                key={check.id}
                className="flex items-start justify-between gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2"
              >
                <div className="space-y-1">
                  <p className="text-white text-sm font-medium">{check.name}</p>
                  <p className="text-white/60 text-xs">{check.description}</p>
                  {check.message && <p className="text-white/70 text-xs">{check.message}</p>}
                </div>
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize border",
                    check.status === "passed"
                      ? "bg-emerald-500/15 text-emerald-200 border-emerald-500/30"
                      : check.status === "warning"
                        ? "bg-amber-500/15 text-amber-200 border-amber-500/30"
                        : check.status === "failed"
                          ? "bg-red-500/15 text-red-200 border-red-500/30"
                          : "bg-white/10 text-white/70 border-white/15",
                  )}
                >
                  {check.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
