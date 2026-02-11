"use client";

import { text, statusDot } from "@/components/ui/design-tokens";

interface ConnectionStatusProps {
  connected: boolean;
}

export function ConnectionStatus({ connected }: ConnectionStatusProps) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-secondary/60 px-3 py-1">
      <div
        className={`${statusDot.base} ${
          connected ? statusDot.connected : statusDot.disconnected
        }`}
      />
      <span className={text.muted}>
        {connected ? "Connected" : "Disconnected"}
      </span>
    </div>
  );
}
