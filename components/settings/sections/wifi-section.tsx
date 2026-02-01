import { Button } from "@/components/ui/button";
import { Wifi } from "lucide-react";

type WifiSectionProps = {
  onOpenDialog: () => void;
  ssid?: string;
  quality?: number;
};

export function WifiSection({ onOpenDialog, ssid, quality }: WifiSectionProps) {
  const wifiLabel = ssid || "Not connected";
  const qualityLabel =
    typeof quality === "number" && quality > 0 ? `${quality}%` : null;

  return (
    <div className="bg-black/30 backdrop-blur-xl rounded-2xl p-6 border border-white/15 shadow-lg shadow-black/25">
      <div className="flex items-start justify-between">
        <div>
          <h4 className="text-sm font-semibold text-white -tracking-[0.01em] mb-1">
            Wi-Fi
          </h4>
          <div className="flex items-center gap-2 text-xs text-white/60">
            <Wifi className="h-3.5 w-3.5" />
            <span className="text-white">{wifiLabel}</span>
            {qualityLabel && (
              <span className="text-white/60">• {qualityLabel}</span>
            )}
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="border border-white/15 bg-white/10 hover:bg-white/20 text-white shadow-sm"
          onClick={onOpenDialog}
        >
          <Wifi className="h-4 w-4 mr-2" />
          View networks
        </Button>
      </div>
    </div>
  );
}
