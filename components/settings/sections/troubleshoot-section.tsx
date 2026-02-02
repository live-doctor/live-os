import { Button } from "@/components/ui/button";
import { Wrench } from "lucide-react";
import {
  SettingsSectionShell,
  settingsActionButtonWideClass,
} from "./section-shell";

type TroubleshootSectionProps = {
  onOpenDialog: () => void;
};

export function TroubleshootSection({ onOpenDialog }: TroubleshootSectionProps) {
  return (
    <SettingsSectionShell
      icon={<Wrench className="h-4 w-4 text-white" />}
      title="Troubleshoot"
      subtitle="Troubleshoot LiveOS"
      actions={
        <Button
          variant="ghost"
          size="sm"
          className={settingsActionButtonWideClass}
          onClick={onOpenDialog}
        >
          View logs
        </Button>
      }
    />
  );
}
