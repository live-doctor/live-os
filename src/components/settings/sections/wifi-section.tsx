import { Button } from "@/components/ui/button";
import { Wifi } from "lucide-react";
import {
  SettingsSectionShell,
  settingsActionButtonWideClass,
} from "./section-shell";

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
    <SettingsSectionShell
      icon={<Wifi className="h-4 w-4 text-foreground" />}
      title="Wi-Fi"
      subtitle={
        qualityLabel ? `${wifiLabel} • ${qualityLabel}` : wifiLabel
      }
      actions={
        <Button
          variant="ghost"
          size="sm"
          className={settingsActionButtonWideClass}
          onClick={onOpenDialog}
        >
          <Wifi className="h-4 w-4 mr-2" />
          View networks
        </Button>
      }
    />
  );
}
