import { Button } from "@/components/ui/button";
import { DownloadCloud, RefreshCw } from "lucide-react";

type UpdateSectionProps = {
  currentVersion: string;
  status?: string;
  remoteVersion?: string;
  hasUpdate?: boolean;
  onCheck?: () => void;
  checking?: boolean;
};

export function UpdateSection({
  currentVersion,
  status,
  remoteVersion,
  hasUpdate,
  onCheck,
  checking,
}: UpdateSectionProps) {
  return (
    <div className="bg-black/30 backdrop-blur-xl rounded-2xl p-6 border border-white/15 shadow-lg shadow-black/25">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="rounded-full border border-white/15 bg-white/10 p-2">
            <DownloadCloud className="h-4 w-4 text-white" />
          </span>
          <div>
            <h4 className="text-sm font-semibold text-white -tracking-[0.01em] mb-1">
              Updates
            </h4>
            {status && (
              <p className="text-[11px] text-white/70 mt-1">{status}</p>
            )}
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="border border-white/15 bg-white/10 hover:bg-white/20 text-white text-xs shadow-sm"
          onClick={onCheck}
          disabled={checking}
        >
          {checking ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Checking...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Check for update
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
