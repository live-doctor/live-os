"use client";

import { listLanDevices, type LanDevice } from "@/app/actions/network";
import { dialog as dialogTokens } from "@/components/ui/design-tokens";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { AlertTriangle, Loader2, Network, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

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
      <DialogContent className={cn(dialogTokens.content, dialogTokens.size.lg, dialogTokens.padding.none)}>
        <DialogTitle className="sr-only">Network Devices</DialogTitle>
        <DialogDescription className="sr-only">
          Devices discovered via mDNS (avahi) and ARP scan.
        </DialogDescription>
        <ScrollArea className="max-h-[78vh]">
          <div className="space-y-6 px-5 py-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-left text-[17px] font-semibold leading-snug tracking-[-0.02em] text-foreground">
                  Network Devices
                </h2>
                <button
                  type="button"
                  onClick={refresh}
                  disabled={loading}
                  className={cn(
                    "inline-flex h-[30px] items-center justify-center gap-1.5 rounded-full border border-border bg-secondary/60 px-2.5 text-[12px] font-medium tracking-[-0.02em] text-foreground transition-[color,background-color,box-shadow] duration-300 hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-ring/30",
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
              <p className="text-[13px] leading-tight text-muted-foreground">
                Devices discovered via mDNS (avahi) and ARP scan.
              </p>
            </div>
            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[13px] text-amber-100">
                <AlertTriangle className="h-4 w-4 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {loading && devices.length === 0 && (
              <div className="flex items-center gap-2 rounded-lg border border-border bg-secondary/40 p-4 text-[13px] text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Scanning network...
              </div>
            )}

            {!loading && devices.length === 0 && !error && (
              <p className="rounded-lg border border-border bg-secondary/40 p-4 text-[13px] text-muted-foreground">
                No devices found.
              </p>
            )}

            {devices.length > 0 && (
              <div className="overflow-hidden rounded-lg border border-border bg-secondary/40">
                {devices.map((device) => (
                  <div
                    key={`${device.ip}-${device.mac ?? device.name ?? device.source}`}
                    className="flex items-center justify-between border-b border-border px-4 py-3 text-[13px] text-foreground last:border-b-0"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-secondary/60 border border-border">
                        <Network className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <div className="font-medium truncate">
                          {device.name || "Unknown device"}
                        </div>
                        <div className="text-muted-foreground truncate text-[12px]">
                          {device.ip}
                          {device.mac ? ` • ${device.mac}` : ""}
                        </div>
                      </div>
                    </div>
                    <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
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
