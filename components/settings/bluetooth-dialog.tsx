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

const rowClass = "flex justify-between text-sm text-white/80";

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
      <DialogContent className="max-w-md bg-zinc-950/90 backdrop-blur-2xl border border-white/10 p-0 overflow-hidden">
        <div className="px-6 pt-6 pb-4 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/60 mb-1">
              Bluetooth
            </p>
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <Bluetooth className="h-5 w-5" />
              {statusText}
            </h2>
            {status?.adapter && (
              <p className="text-xs text-white/60 mt-1">
                Adapter {status.adapter}
              </p>
            )}
            {status?.error && (
              <p className="text-xs text-amber-300 mt-1">{status.error}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onToggle(!powered)}
              disabled={loading || !available}
              className={cn(
                "h-9 px-3 rounded-full border border-white/15 bg-white/10 text-white text-xs shadow-sm flex items-center gap-2",
                !available && "opacity-50 cursor-not-allowed",
              )}
              title={powered ? "Turn Bluetooth off" : "Turn Bluetooth on"}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Bluetooth className="h-4 w-4" />
              )}
              {powered ? "Turn off" : "Turn on"}
            </button>
            <button
              type="button"
              onClick={onRefresh}
              disabled={loading || !available}
              className={cn(
                "h-9 w-9 rounded-full border border-white/15 bg-white/10 text-white flex items-center justify-center",
                !available && "opacity-50 cursor-not-allowed",
              )}
              title="Refresh Bluetooth status"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        <ScrollArea className="max-h-[360px] px-6 pb-6">
          <div className="space-y-3">
            <div className={rowClass}>
              <span className="text-white/60">Available</span>
              <span className="text-white">{available ? "Yes" : "No"}</span>
            </div>
            <div className={rowClass}>
              <span className="text-white/60">Powered</span>
              <span className="text-white">{powered ? "On" : "Off"}</span>
            </div>
            <div className={rowClass}>
              <span className="text-white/60">Blocked</span>
              <span className="text-white">{blocked ? "Yes" : "No"}</span>
            </div>
            <div className={rowClass}>
              <span className="text-white/60">Connected devices</span>
              <span className="text-white">
                {typeof status?.devices === "number" ? status.devices : "—"}
              </span>
            </div>
            <div className={rowClass}>
              <span className="text-white/60">First device</span>
              <span className="text-white">
                {status?.firstName || "—"}
              </span>
            </div>
          </div>
          {error && (
            <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {error}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
