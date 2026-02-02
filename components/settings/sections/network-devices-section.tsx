import { Button } from "@/components/ui/button";
import { Network } from "lucide-react";
import { SettingsSectionShell, settingsActionButtonWideClass } from "./section-shell";

type NetworkDevicesSectionProps = {
  deviceCount?: number;
  loading?: boolean;
  error?: string | null;
  onOpenDialog: () => void;
};

export function NetworkDevicesSection({
  deviceCount,
  loading,
  error,
  onOpenDialog,
}: NetworkDevicesSectionProps) {
  const subtitle = loading
    ? "Scanning..."
    : deviceCount === undefined
      ? "Not scanned yet"
      : `${deviceCount} device${deviceCount === 1 ? "" : "s"} found`;

  return (
    <SettingsSectionShell
      icon={<Network className="h-4 w-4 text-white" />}
      title="Network Devices"
      subtitle={subtitle}
      actions={[
        <Button
          key="open"
          variant="ghost"
          size="sm"
          className={settingsActionButtonWideClass}
          onClick={onOpenDialog}
        >
          <Network className="h-4 w-4 mr-2" />
          View devices
        </Button>,
      ]}
    >
      {error && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
          {error}
        </div>
      )}
    </SettingsSectionShell>
  );
}
