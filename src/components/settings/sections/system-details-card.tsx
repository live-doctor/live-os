import { Button } from "@/components/ui/button";
import { HardwareInfo } from "../hardware-utils";
import {
  SettingsSectionShell,
  settingsActionButtonWideClass,
} from "./section-shell";

type SystemDetailsCardProps = {
  hardware?: HardwareInfo;
  onOpenTabs: () => void;
};

export function SystemDetailsCard({
  hardware: _hardware,
  onOpenTabs,
}: SystemDetailsCardProps) {
  return (
    <SettingsSectionShell
      title="Device info"
      subtitle="Information about your device"
      actions={
        <Button
          variant="ghost"
          size="sm"
          className={settingsActionButtonWideClass}
          onClick={onOpenTabs}
        >
          View info
        </Button>
      }
    />
  );
}
