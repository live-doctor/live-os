import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";

type AdvancedSettingsSectionProps = {
  onOpenDialog: () => void;
};

export function AdvancedSettingsSection({
  onOpenDialog,
}: AdvancedSettingsSectionProps) {
  return (
    <div className="bg-black/30 backdrop-blur-xl rounded-2xl p-6 border border-white/15 shadow-lg shadow-black/25 space-y-4">
      <div className="flex items-center gap-3">
        <span className="rounded-full border border-white/15 bg-white/10 p-2">
          <Settings className="h-4 w-4 text-white" />
        </span>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-white -tracking-[0.01em]">
            Advanced
          </h4>
          <p className="text-xs text-white/60">
            Network tweaks and maintenance tools
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="border border-white/15 bg-white/10 hover:bg-white/20 text-white text-xs shadow-sm"
          onClick={onOpenDialog}
        >
          Open
        </Button>
      </div>
    </div>
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
