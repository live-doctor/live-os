"use client";

import { Button } from "@/components/ui/button";
import { BadgeCheck, HardDrive, Loader2, Plug, Trash2, X } from "lucide-react";
import type { NetworkShare } from "./types";

type ShareListItemProps = {
  share: NetworkShare;
  busy: boolean;
  onToggle: (share: NetworkShare) => void;
  onRemove: (share: NetworkShare) => void;
};

export function ShareListItem({ share, busy, onToggle, onRemove }: ShareListItemProps) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-secondary/40 px-3 py-2">
      <div className="h-10 w-10 rounded-lg border border-border bg-secondary/60 flex items-center justify-center">
        <HardDrive className="h-5 w-5 text-cyan-200" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <div className="text-foreground font-semibold text-sm truncate">
            {share.host}{" "}
            <span className="text-muted-foreground">/{share.share}</span>
          </div>
          {share.status === "connected" ? (
            <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/15 text-emerald-700 dark:text-emerald-200 text-[11px] px-2 py-0.5">
              <BadgeCheck className="h-3 w-3" /> Connected
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-lg bg-secondary/60 text-muted-foreground text-[11px] px-2 py-0.5">
              Disconnected
            </span>
          )}
        </div>
        <div className="text-[11px] text-muted-foreground truncate">
          Mounted at {share.mountPath}
        </div>
        {share.lastError && (
          <div className="text-[11px] text-amber-700 dark:text-amber-200 truncate">
            {share.lastError}
          </div>
        )}
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9 rounded-lg border border-border bg-secondary/60 hover:bg-secondary text-foreground"
        onClick={() => onToggle(share)}
        disabled={busy}
        title={share.status === "connected" ? "Disconnect" : "Connect"}
      >
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : share.status === "connected" ? (
          <X className="h-4 w-4" />
        ) : (
          <Plug className="h-4 w-4" />
        )}
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9 rounded-lg border border-border bg-secondary/60 hover:bg-secondary text-destructive"
        onClick={() => onRemove(share)}
        disabled={busy}
        title="Remove"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
