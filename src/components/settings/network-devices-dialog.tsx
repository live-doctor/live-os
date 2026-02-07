"use client";

import { listLanDevices, type LanDevice } from "@/app/actions/network";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, Loader2, Network, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

type NetworkDevicesDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDevicesChange?: (devices: LanDevice[], error: string | null) => void;
  initialDevices?: LanDevice[];
  initialError?: string | null;
};

export function NetworkDevicesDialog({
  open,
  onOpenChange,
  onDevicesChange,
  initialDevices = [],
  initialError = null,
}: NetworkDevicesDialogProps) {
  const [devices, setDevices] = useState<LanDevice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasInitialized = useRef(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await listLanDevices();
      setDevices(result.devices);
      if (result.error) setError(result.error);
      onDevicesChange?.(result.devices, result.error ?? null);
    } catch (err) {
      setError(
        "Failed to scan network devices: " +
          ((err as Error)?.message || "Unknown error"),
      );
      setDevices([]);
      onDevicesChange?.([], "Failed to scan network devices");
    } finally {
      setLoading(false);
    }
  }, [onDevicesChange]);

  useEffect(() => {
    if (!open) return;

    // Seed with existing scan results to avoid double-scan flicker
    if (initialDevices.length > 0) {
      setDevices(initialDevices);
      setError(initialError);
    }

    // Only auto-scan on first open (or when no cached devices)
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      if (initialDevices.length === 0) {
        void refresh();
      }
    }
  }, [open, initialDevices, initialError, refresh]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[760px] p-0">
        <DialogTitle className="sr-only">Network Devices</DialogTitle>
        <DialogDescription className="sr-only">
          Devices discovered via mDNS (avahi) and ARP scan.
        </DialogDescription>
        <ScrollArea className="max-h-[78vh]">
          <div className="space-y-6 px-5 py-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-left text-[17px] font-semibold leading-snug tracking-[-0.02em] text-white">
                  Network Devices
                </h2>
                <button
                  type="button"
                  onClick={refresh}
                  disabled={loading}
                  className={cn(
                    "inline-flex h-[30px] items-center justify-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-2.5 text-[12px] font-medium tracking-[-0.02em] text-white transition-[color,background-color,box-shadow] duration-300 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/20",
                    loading && "opacity-50 cursor-not-allowed",
                  )}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-[14px] w-[14px] opacity-80" />
                  )}
                  Rescan
                </button>
              </div>
              <p className="text-[13px] leading-tight text-white opacity-45">
                Devices discovered via mDNS (avahi) and ARP scan.
              </p>
            </div>
            {error && (
              <div className="flex items-start gap-2 rounded-[12px] border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[13px] text-amber-100">
                <AlertTriangle className="h-4 w-4 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {loading && devices.length === 0 && (
              <div className="flex items-center gap-2 rounded-[12px] bg-white/6 p-4 text-[13px] text-white/70">
                <Loader2 className="h-4 w-4 animate-spin" />
                Scanning network...
              </div>
            )}

            {!loading && devices.length === 0 && !error && (
              <p className="rounded-[12px] bg-white/6 p-4 text-[13px] text-white/60">
                No devices found.
              </p>
            )}

            {devices.length > 0 && (
              <div className="overflow-hidden rounded-[12px] bg-white/6">
                {devices.map((device) => (
                  <div
                    key={`${device.ip}-${device.mac ?? device.name ?? device.source}`}
                    className="flex items-center justify-between border-b border-white/10 px-4 py-3 text-[13px] text-white last:border-b-0"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="inline-flex h-9 w-9 items-center justify-center rounded-[8px] bg-white/10 border border-white/15">
                        <Network className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <div className="font-medium truncate">
                          {device.name || "Unknown device"}
                        </div>
                        <div className="text-white/60 truncate text-[12px]">
                          {device.ip}
                          {device.mac ? ` • ${device.mac}` : ""}
                        </div>
                      </div>
                    </div>
                    <span className="text-[11px] uppercase tracking-wide text-white/60">
                      {device.source}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
