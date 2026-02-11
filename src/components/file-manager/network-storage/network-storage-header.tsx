"use client";

import { Button } from "@/components/ui/button";
import { DialogTitle } from "@/components/ui/dialog";
import { ChevronLeft, X } from "lucide-react";
import type { DiscoveredHost, ViewState } from "./types";

type NetworkStorageHeaderProps = {
  view: ViewState;
  selectedServer: DiscoveredHost | null;
  onBack: () => void;
  onClose: () => void;
};

export function NetworkStorageHeader({
  view,
  selectedServer,
  onBack,
  onClose,
}: NetworkStorageHeaderProps) {
  const titles: Record<ViewState, string> = {
    list: "Network Storage",
    "server-shares": selectedServer?.name || selectedServer?.host || "Server",
    "manual-add": "Add Network Share",
  };

  const subtitles: Record<ViewState, string> = {
    list: "SMB/NAS shares on your network",
    "server-shares": `Browse shares on ${selectedServer?.host ?? ""}`,
    "manual-add": "Enter share details manually",
  };

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <div className="flex items-center gap-2.5">
          {view !== "list" && (
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 cursor-pointer rounded-lg border border-border bg-secondary/60 text-muted-foreground hover:bg-secondary hover:text-foreground"
              onClick={onBack}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}
          <DialogTitle className="text-[16px] font-semibold leading-none tracking-[-0.02em] text-foreground md:text-[22px]">
            {titles[view]}
          </DialogTitle>
        </div>
        <div className="mt-1 text-[11px] text-muted-foreground">
          {subtitles[view]}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 cursor-pointer rounded-lg border border-border bg-secondary/60 text-muted-foreground hover:bg-secondary hover:text-foreground"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
