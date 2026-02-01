import { Button } from "@/components/ui/button";
import { Wrench } from "lucide-react";

type TroubleshootSectionProps = {
  onOpenDialog: () => void;
};

export function TroubleshootSection({ onOpenDialog }: TroubleshootSectionProps) {
  return (
    <div className="bg-black/30 backdrop-blur-xl rounded-2xl p-6 border border-white/15 shadow-lg shadow-black/25">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <span className="rounded-full border border-white/15 bg-white/10 p-2">
            <Wrench className="h-4 w-4 text-white" />
          </span>
          <div>
            <h4 className="text-sm font-semibold text-white -tracking-[0.01em] mb-1">
              Troubleshoot
            </h4>
            <p className="text-xs text-white/60">Troubleshoot LiveOS</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="border border-white/15 bg-white/10 hover:bg-white/20 text-white text-xs shadow-sm"
          onClick={onOpenDialog}
        >
          View logs
        </Button>
      </div>
    </div>
  );
}
