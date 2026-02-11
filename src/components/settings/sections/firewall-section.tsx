import { Button } from "@/components/ui/button";
import { Shield } from "lucide-react";
import {
  SettingsSectionShell,
  settingsActionButtonWideClass,
} from "./section-shell";

type FirewallSectionProps = {
  onOpenDialog: () => void;
  enabled?: boolean;
};

export function FirewallSection({ onOpenDialog, enabled }: FirewallSectionProps) {
  const statusLabel =
    enabled === undefined ? "Status unknown" : enabled ? "Enabled" : "Disabled";

  return (
    <SettingsSectionShell
      icon={<Shield className="h-4 w-4 text-foreground" />}
      title="Firewall"
      subtitle={statusLabel}
      actions={
        <Button
          variant="ghost"
          size="sm"
          className={settingsActionButtonWideClass}
          onClick={onOpenDialog}
        >
          <Shield className="h-4 w-4 mr-2" />
          Manage rules
        </Button>
      }
    />
  );
}
