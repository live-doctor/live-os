import { dialog as dialogTokens } from "@/components/ui/design-tokens";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Bluetooth, Loader2, RefreshCw } from "lucide-react";
import { useMemo } from "react";

type BluetoothState = {
  available?: boolean;
  powered?: boolean;
  blocked?: boolean;
  adapter?: string | null;
  devices?: number;
  firstName?: string | null;
  deviceList?: Array<{
    address: string;
    name: string;
    connected: boolean;
    paired: boolean;
    trusted: boolean;
  }>;
  error?: string | null;
};

type BluetoothDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  status?: BluetoothState | null;
  loading?: boolean;
  error?: string | null;
  onToggle: (enabled: boolean) => void | Promise<void>;
  onRefresh?: () => void | Promise<void>;
};

const rowClass = "flex justify-between text-sm";

export function BluetoothDialog({
  open,
  onOpenChange,
  status,
  loading = false,
  error,
  onToggle,
  onRefresh,
}: BluetoothDialogProps) {
  const powered = status?.powered ?? false;
  const blocked = status?.blocked ?? false;
  const available = status?.available ?? true;

  const statusText = useMemo(() => {
    if (!available) return "Unavailable";
    if (blocked) return "Blocked";
    return powered ? "On" : "Off";
  }, [available, blocked, powered]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(dialogTokens.content, dialogTokens.size.lg, dialogTokens.padding.none)}>
        <ScrollArea className="max-h-[78vh]">
          <div className="space-y-6 px-5 py-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-left text-[17px] font-semibold leading-snug tracking-[-0.02em] text-foreground">
                  Bluetooth
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onToggle(!powered)}
                    disabled={loading || !available}
                    className={cn(
                      "inline-flex h-[30px] items-center justify-center gap-1.5 rounded-full border border-border bg-secondary/60 px-2.5 text-[12px] font-medium tracking-[-0.02em] text-foreground transition-[color,background-color,box-shadow] duration-300 hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-ring/30",
                      (loading || !available) &&
                        "opacity-50 cursor-not-allowed",
                    )}
                    title={powered ? "Turn Bluetooth off" : "Turn Bluetooth on"}
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Bluetooth className="h-[14px] w-[14px] opacity-80" />
                    )}
                    {powered ? "On" : "Off"}
                  </button>
                  <button
                    type="button"
                    onClick={onRefresh}
                    disabled={loading || !available}
                    className={cn(
                      "inline-flex h-[30px] items-center justify-center gap-1.5 rounded-full border border-border bg-secondary/60 px-2.5 text-[12px] font-medium tracking-[-0.02em] text-foreground transition-[color,background-color,box-shadow] duration-300 hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-ring/30",
                      (loading || !available) &&
                        "opacity-50 cursor-not-allowed",
                    )}
                    title="Refresh Bluetooth status"
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
              <p className="text-[13px] leading-tight text-muted-foreground">
                {status?.adapter
                  ? `Adapter ${status.adapter}`
                  : "Manage adapter power and check paired devices."}
              </p>
            </div>

            <div className="space-y-3">
              <div className="pointer-events-none flex items-start gap-x-2 rounded-lg border border-border bg-secondary/40 p-4">
                <div className="flex-1 space-y-1">
                  <h3 className="text-[14px] font-medium leading-tight text-foreground">
                    Status
                  </h3>
                  <p className="text-[13px] leading-tight text-muted-foreground">
                    {statusText}
                  </p>
                </div>
                <span className="pointer-events-auto inline-flex h-[30px] items-center justify-center rounded-full border border-border bg-secondary/60 px-2.5 text-[12px] font-medium tracking-[-0.02em] text-foreground">
                  {powered ? "Powered" : "Unpowered"}
                </span>
              </div>

              <div className="pointer-events-none flex items-start gap-x-2 rounded-lg border border-border bg-secondary/40 p-4">
                <div className="flex-1 space-y-2">
                  <div className={rowClass}>
                    <span className="text-muted-foreground">Available</span>
                    <span className="text-foreground">
                      {available ? "Yes" : "No"}
                    </span>
                  </div>
                  <div className={rowClass}>
                    <span className="text-muted-foreground">Blocked</span>
                    <span className="text-foreground">
                      {blocked ? "Yes" : "No"}
                    </span>
                  </div>
                  <div className={rowClass}>
                    <span className="text-muted-foreground">
                      Connected devices
                    </span>
                    <span className="text-foreground">
                      {typeof status?.devices === "number"
                        ? status.devices
                        : "—"}
                    </span>
                  </div>
                  <div className={rowClass}>
                    <span className="text-muted-foreground">First device</span>
                    <span className="text-foreground">
                      {status?.firstName || "—"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-border bg-secondary/40 p-4">
                <h3 className="text-[14px] font-medium leading-tight text-foreground">
                  Nearby devices
                </h3>
                {status?.deviceList && status.deviceList.length > 0 ? (
                  <div className="mt-2 space-y-2">
                    {status.deviceList.slice(0, 8).map((device) => (
                      <div
                        key={device.address}
                        className="flex items-center justify-between gap-3 text-[13px]"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-foreground">{device.name}</p>
                          <p className="truncate text-[11px] text-muted-foreground">
                            {device.address}
                          </p>
                        </div>
                        <span className="rounded-full border border-border bg-secondary/60 px-2 py-0.5 text-[11px] text-foreground">
                          {device.connected ? "Connected" : "Detected"}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-[13px] text-muted-foreground">
                    No devices found yet. Keep this dialog open and press Refresh.
                  </p>
                )}
              </div>
            </div>

            {(error || status?.error) && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-[13px] text-red-300">
                {error || status?.error}
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
