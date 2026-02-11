"use client";

import { card } from "@/components/ui/design-tokens";
import { Loader2 } from "lucide-react";
import { ShareListItem } from "./share-list-item";
import type { NetworkShare } from "./types";

type ShareListProps = {
  shares: NetworkShare[];
  loading: boolean;
  busyShareId: string | null;
  onToggle: (share: NetworkShare) => void;
  onRemove: (share: NetworkShare) => void;
};

export function ShareList({
  shares,
  loading,
  busyShareId,
  onToggle,
  onRemove,
}: ShareListProps) {
  if (shares.length > 0) {
    return (
      <div className="space-y-2">
        <div className="text-xs text-muted-foreground uppercase tracking-[0.2em] px-1">
          Your Shares
        </div>
        {shares.map((share) => (
          <ShareListItem
            key={share.id}
            share={share}
            busy={busyShareId === share.id}
            onToggle={onToggle}
            onRemove={onRemove}
          />
        ))}
      </div>
    );
  }

  if (loading) {
    return (
      <div
        className={`${card.base} bg-secondary/40 border-border text-muted-foreground p-3 flex items-center gap-3`}
      >
        <Loader2 className="h-4 w-4 animate-spin" />
        <div>Loading network shares...</div>
      </div>
    );
  }

  return null;
}
