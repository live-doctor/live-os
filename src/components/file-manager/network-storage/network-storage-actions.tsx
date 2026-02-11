"use client";

import { Button } from "@/components/ui/button";
import { Loader2, Plus, RefreshCcw } from "lucide-react";

type NetworkStorageActionsProps = {
  busy: boolean;
  onAddManual: () => void;
  onRefresh: () => void;
};

export function NetworkStorageActions({
  busy,
  onAddManual,
  onRefresh,
}: NetworkStorageActionsProps) {
  return (
    <div className="flex flex-wrap gap-3">
      <Button
        type="button"
        variant="ghost"
        onClick={onAddManual}
        className="h-[108px] w-[120px] rounded-lg border border-border bg-secondary/40 p-3 text-foreground hover:bg-secondary"
      >
        <div className="flex h-full w-full flex-col items-center justify-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-secondary/60 ring-1 ring-border">
            <Plus className="h-5 w-5" />
          </span>
          <span className="text-[12px] font-medium">Add manually</span>
        </div>
      </Button>
      <Button
        type="button"
        variant="ghost"
        onClick={onRefresh}
        disabled={busy}
        className="h-[108px] w-[120px] rounded-lg border border-border bg-secondary/40 p-3 text-foreground hover:bg-secondary disabled:opacity-70"
      >
        <div className="flex h-full w-full flex-col items-center justify-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-secondary/60 ring-1 ring-border">
            {busy ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <RefreshCcw className="h-5 w-5" />
            )}
          </span>
          <span className="text-[12px] font-medium">Rescan network</span>
        </div>
      </Button>
    </div>
  );
}
