"use client";

import { cn } from "@/lib/utils";
import { Loader2, RefreshCw, Wifi } from "lucide-react";

interface WifiDialogHeaderProps {
  loading: boolean;
  onRefresh: () => void;
  radioEnabled: boolean | null;
  toggling: boolean;
  onToggleRadio: () => void;
}

export function WifiDialogHeader({
  loading,
  onRefresh,
  radioEnabled,
  toggling,
  onToggleRadio,
}: WifiDialogHeaderProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-left text-[17px] font-semibold leading-snug tracking-[-0.02em] text-white">
          Wi-Fi
        </h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleRadio}
            disabled={toggling || radioEnabled === null}
            className={cn(
              "inline-flex h-[30px] items-center justify-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-2.5 text-[12px] font-medium tracking-[-0.02em] text-white transition-[color,background-color,box-shadow] duration-300 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/20",
              (toggling || radioEnabled === null) && "opacity-50 cursor-not-allowed",
            )}
            title={radioEnabled ? "Turn Wi-Fi off" : "Turn Wi-Fi on"}
          >
            {toggling ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Wifi className="h-[14px] w-[14px] opacity-80" />
            )}
            {radioEnabled ? "On" : "Off"}
          </button>
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading || radioEnabled === false}
            className={cn(
              "inline-flex h-[30px] items-center justify-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-2.5 text-[12px] font-medium tracking-[-0.02em] text-white transition-[color,background-color,box-shadow] duration-300 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/20",
              (loading || radioEnabled === false) && "opacity-50 cursor-not-allowed",
            )}
            title="Rescan networks"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-[14px] w-[14px] opacity-80" />
            )}
            Refresh
          </button>
        </div>
      </div>
      <p className="text-[13px] leading-tight text-white opacity-45">
        Select a network to connect. Secured networks may require a password.
      </p>
    </div>
  );
}
