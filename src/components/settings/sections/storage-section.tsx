import { Button } from "@/components/ui/button";
import { HardDrive } from "lucide-react";
import {
  SettingsSectionShell,
  settingsActionButtonWideClass,
} from "./section-shell";

type StorageSectionProps = {
  onOpenDialog: () => void;
};

export function StorageSection({ onOpenDialog }: StorageSectionProps) {
  return (
    <SettingsSectionShell
      icon={<HardDrive className="h-4 w-4 text-white" />}
      title="Storage"
      subtitle="Disks, partitions, volumes"
      actions={
        <Button
          variant="ghost"
          size="sm"
          className={settingsActionButtonWideClass}
          onClick={onOpenDialog}
        >
          Open
        </Button>
      }
    />
  );
}
