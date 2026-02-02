import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";
import {
  SettingsSectionShell,
  settingsActionButtonWideClass,
} from "./section-shell";

type AdvancedSettingsSectionProps = {
  onOpenDialog: () => void;
};

export function AdvancedSettingsSection({
  onOpenDialog,
}: AdvancedSettingsSectionProps) {
  return (
    <SettingsSectionShell
      icon={<Settings className="h-4 w-4 text-white" />}
      title="Advanced"
      subtitle="Network tweaks and maintenance tools"
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

export function AdvancedSettingsContent() {
  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-3">
        <div>
          <p className="text-sm text-white font-medium">Cloudflare DNS</p>
          <p className="text-xs text-white/60">
            Cloudflare DNS offers better network reliability. Disable to use
            your router&apos;s DNS settings.
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="border border-white/15 bg-white/10 hover:bg-white/20 text-white text-xs shadow-sm"
          disabled
        >
          Coming soon
        </Button>
      </div>

      <div className="flex items-start justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-3">
        <div>
          <p className="text-sm text-white font-medium">Remote Tor access</p>
          <p className="text-xs text-white/60">
            Access your Umbrel from anywhere using a Tor browser.
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="border border-white/15 bg-white/10 hover:bg-white/20 text-white text-xs shadow-sm"
          disabled
        >
          Coming soon
        </Button>
      </div>

      <div className="flex items-start justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-3">
        <div>
          <p className="text-sm text-white font-medium">Factory Reset</p>
          <p className="text-xs text-white/60">
            Erase all your data and apps, restoring umbrelOS to default
            settings.
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="border border-white/15 bg-white/10 hover:bg-white/20 text-white text-xs shadow-sm text-red-300"
          disabled
        >
          Reset
        </Button>
      </div>
    </div>
  );
}
