import { Button } from "@/components/ui/button";
import { Shield } from "lucide-react";

type FirewallSectionProps = {
  onOpenDialog: () => void;
  enabled?: boolean;
};

export function FirewallSection({ onOpenDialog, enabled }: FirewallSectionProps) {
  return (
    <div className="bg-black/30 backdrop-blur-xl rounded-2xl p-6 border border-white/15 shadow-lg shadow-black/25">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <span className="rounded-full border border-white/15 bg-white/10 p-2">
            <Shield className="h-4 w-4 text-white" />
          </span>
          <div>
            <h4 className="text-sm font-semibold text-white -tracking-[0.01em] mb-1">
              Firewall
            </h4>
            <div className="flex items-center gap-2 text-xs text-white/60">
              <span className="text-white">
                {enabled === undefined
                  ? "Unknown"
                  : enabled
                    ? "Enabled"
                    : "Disabled"}
              </span>
            </div>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="border border-white/15 bg-white/10 hover:bg-white/20 text-white shadow-sm"
          onClick={onOpenDialog}
        >
          <Shield className="h-4 w-4 mr-2" />
          Manage rules
        </Button>
      </div>
    </div>
  );
}
