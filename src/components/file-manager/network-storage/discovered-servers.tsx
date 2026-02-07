"use client";

import { ChevronRight, Loader2, Server } from "lucide-react";
import type { DiscoveredHost } from "./types";

type DiscoveredServersProps = {
  hosts: DiscoveredHost[];
  discovering: boolean;
  onSelect: (host: DiscoveredHost) => void;
};

export function DiscoveredServers({
  hosts,
  discovering,
  onSelect,
}: DiscoveredServersProps) {
  if (hosts.length > 0) {
    return (
      <div className="space-y-2">
        <div className="text-xs text-white/60 uppercase tracking-[0.2em] px-1">
          Discovered Servers
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {hosts.map((host) => (
            <button
              key={`${host.host}-${host.ip ?? ""}`}
              className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 px-3 py-3 text-left transition-colors"
              onClick={() => onSelect(host)}
            >
              <div className="h-10 w-10 rounded-lg bg-cyan-500/15 border border-cyan-400/30 flex items-center justify-center">
                <Server className="h-5 w-5 text-cyan-200" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-white font-medium truncate">
                  {host.name || host.host}
                </div>
                <div className="text-[11px] text-white/60 truncate">
                  {host.host}
                  {host.ip ? ` • ${host.ip}` : ""}
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-white/40" />
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (discovering) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-6 justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-cyan-200" />
        <span className="text-sm text-white/70">
          Discovering network devices...
        </span>
      </div>
    );
  }

  return <></>;
}
