import { Button } from "@/components/ui/button";
import { Network, RefreshCw } from "lucide-react";

type NetworkDevicesSectionProps = {
  deviceCount?: number;
  loading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
  onOpenDialog: () => void;
};

export function NetworkDevicesSection({
  deviceCount,
  loading,
  error,
  onRefresh,
  onOpenDialog,
}: NetworkDevicesSectionProps) {
  return (
    <div className="bg-black/30 backdrop-blur-xl rounded-2xl p-6 border border-white/15 shadow-lg shadow-black/25">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="rounded-full border border-white/15 bg-white/10 p-2">
            <Network className="h-4 w-4 text-white" />
          </span>
          <div>
            <h4 className="text-sm font-semibold text-white -tracking-[0.01em] mb-1">
              Network Devices
            </h4>
            <p className="text-xs text-white/60">
              Devices discovered on your local network
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="border border-white/15 bg-white/10 hover:bg-white/20 text-white text-xs shadow-sm"
            onClick={onRefresh}
            disabled={loading}
            title="Rescan network"
          >
            {loading ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="border border-white/15 bg-white/10 hover:bg-white/20 text-white text-xs shadow-sm"
            onClick={onOpenDialog}
          >
            <Network className="h-4 w-4 mr-2" />
            View devices
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100 mb-3">
          {error}
        </div>
      )}

      <p className="text-xs text-white/60">
        {loading
          ? "Scanning..."
          : deviceCount === undefined
            ? "Not scanned yet."
            : `${deviceCount} device${deviceCount === 1 ? "" : "s"} found`}
      </p>
    </div>
  );
}
