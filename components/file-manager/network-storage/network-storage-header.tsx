"use client";

import { Button } from "@/components/ui/button";
import { badge } from "@/components/ui/design-tokens";
import {
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { ChevronLeft, Loader2, Plus, RefreshCw } from "lucide-react";
import type { DiscoveredHost, ViewState } from "./types";

type NetworkStorageHeaderProps = {
  view: ViewState;
  selectedServer: DiscoveredHost | null;
  loading: boolean;
  discovering: boolean;
  onBack: () => void;
  onAddManual: () => void;
  onRefresh: () => void;
  onClose: () => void;
};

export function NetworkStorageHeader({
  view,
  selectedServer,
  loading,
  discovering,
  onBack,
  onAddManual,
  onRefresh,
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
    <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-white/5">
      <div className="flex items-center gap-3">
        {view !== "list" && (
          <Button
            size="sm"
            variant="ghost"
            className="h-9 w-9 rounded-full border border-white/15 bg-white/10 hover:bg-white/20 text-white/80 hover:text-white"
            onClick={onBack}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        )}
        <span
          className={`${badge.base} rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.28em]`}
        >
          Network
        </span>
        <div>
          <DialogTitle className="text-xl font-semibold text-white drop-shadow">
            {titles[view]}
          </DialogTitle>
          <DialogDescription
            id="network-storage-description"
            className="sr-only"
          >
            Connect to network devices and shared folders
          </DialogDescription>
          <div className="text-[11px] text-white/60">{subtitles[view]}</div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {view === "list" && (
          <Button
            size="sm"
            variant="ghost"
            className="h-9 w-9 rounded-full border border-white/15 bg-white/10 hover:bg-white/20 text-white/80 hover:text-white"
            onClick={onAddManual}
            title="Add manually"
          >
            <Plus className="h-4 w-4" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-full border border-white/15 bg-white/10 hover:bg-white/20 text-white/80 hover:text-white"
          onClick={onRefresh}
          disabled={loading || discovering}
        >
          {loading || discovering ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-full border border-white/15 bg-white/10 hover:bg-white/20 text-white/80 hover:text-white"
          onClick={onClose}
        >
          ✕
        </Button>
      </div>
    </div>
  );
}
