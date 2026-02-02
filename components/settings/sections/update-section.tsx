import { Button } from "@/components/ui/button";
import { DownloadCloud, RefreshCw } from "lucide-react";
import {
  SettingsSectionShell,
  settingsActionButtonWideClass,
} from "./section-shell";

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
  const subtitle =
    status ||
    (hasUpdate && remoteVersion
      ? `Update available: ${remoteVersion}`
      : `Current version ${currentVersion}`);
  const buttonLabel = checking ? "Checking..." : "Check for update";

  return (
    <SettingsSectionShell
      icon={<DownloadCloud className="h-4 w-4 text-white" />}
      title="Updates"
      subtitle={subtitle}
      actions={
        <Button
          variant="ghost"
          size="sm"
          className={settingsActionButtonWideClass}
          onClick={onCheck}
          disabled={checking}
        >
          {checking ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              {buttonLabel}
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              {buttonLabel}
            </>
          )}
        </Button>
      }
    />
  );
}
