"use client";

import { LogsViewer } from "@/components/settings/troubleshoot/logs-viewer";
import { card, cn, text } from "@/components/ui/design-tokens";
import { AlertTriangle } from "lucide-react";

export function LogsCard() {
  return (
    <section className={cn(card.base, card.padding.md, "space-y-3")}>
      <header className="flex items-center justify-between">
        <div className="space-y-1">
          <p className={cn(text.labelUppercase, "tracking-[0.18em]")}>Logs</p>
          <h3 className={text.heading}>System & Docker logs</h3>
          <p className={text.muted}>Filter by source, export, and auto-refresh.</p>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground text-xs">
          <AlertTriangle className="h-4 w-4" />
          Tail view is read-only
        </div>
      </header>

      <LogsViewer />
    </section>
  );
}
