"use client";

import { Button } from "@/components/ui/button";
import { Bluetooth } from "lucide-react";
import {
  SettingsSectionShell,
  settingsActionButtonWideClass,
} from "./sections/section-shell";

type BluetoothSectionProps = {
  powered?: boolean;
  blocked?: boolean;
  adapter?: string | null;
  devices?: number;
  firstDevice?: string;
  available?: boolean;
  error?: string | null;
  onOpenDialog?: () => void;
};

export function BluetoothSection({
  powered,
  blocked,
  adapter,
  available = true,
  onOpenDialog,
}: BluetoothSectionProps) {
  const statusLabel = available ? (powered ? "On" : "Off") : "Unavailable";

  const adapterLabel = adapter
    ? `Adapter ${adapter}`
    : available
      ? "Detecting adapter..."
      : "No adapter detected";

  const badge = blocked ? (
    <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-200 border border-amber-500/30">
      Blocked
    </span>
  ) : null;

  return (
    <SettingsSectionShell
      icon={<Bluetooth className="h-4 w-4 text-foreground" />}
      title="Bluetooth"
      subtitle={[statusLabel, adapterLabel].filter(Boolean).join(" • ")}
      badge={badge}
      actions={
        onOpenDialog && (
          <Button
            variant="ghost"
            size="sm"
            className={settingsActionButtonWideClass}
            onClick={onOpenDialog}
            disabled={available === false}
          >
            <Bluetooth className="h-4 w-4 mr-2" />
            View Bluetooth
          </Button>
        )
      }
    >
      {/* Hide low-level errors on the card; they are surfaced in the dialog */}
    </SettingsSectionShell>
  );
}
