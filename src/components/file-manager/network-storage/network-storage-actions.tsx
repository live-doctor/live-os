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
        className="h-[108px] w-[120px] rounded-xl border border-white/15 bg-white/5 p-3 text-white/80 hover:bg-white/10"
      >
        <div className="flex h-full w-full flex-col items-center justify-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/15">
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
        className="h-[108px] w-[120px] rounded-xl border border-white/15 bg-white/5 p-3 text-white/80 hover:bg-white/10 disabled:opacity-70"
      >
        <div className="flex h-full w-full flex-col items-center justify-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/15">
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
