/* eslint-disable @next/next/no-img-element */
import { Button } from "@/components/ui/button";
import { DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { X } from "lucide-react";

type CustomDeployHeaderData = {
  appIcon?: string;
  appTitle?: string;
};

type CustomDeployHeaderProps = {
  data?: CustomDeployHeaderData;
  iconPreview?: string;
  fallbackTitle?: string;
  descriptionId: string;
  onClose: () => void;
};

export function CustomDeployHeader({
  data,
  iconPreview,
  fallbackTitle,
  descriptionId,
  onClose,
}: CustomDeployHeaderProps) {
  const imageSrc = iconPreview || data?.appIcon || "/default-application-icon.png";
  const title = data?.appTitle
    ? `Customize ${data.appTitle}`
    : fallbackTitle
      ? `Deploy ${fallbackTitle}`
      : "Custom Docker Deploy";

  return (
    <div className="relative border-b border-border bg-gradient-to-r from-secondary/60 via-secondary/30 to-transparent px-6 py-5">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-border bg-secondary/60">
            <img
              src={imageSrc}
              alt={data?.appTitle || fallbackTitle || "App"}
              className="h-full w-full object-cover"
              onError={(event) => {
                event.currentTarget.onerror = null;
                event.currentTarget.src = "/default-application-icon.png";
              }}
            />
          </div>
          <div>
            <DialogTitle className="text-[24px] font-bold leading-none tracking-[-0.04em] text-foreground">
              {title}
            </DialogTitle>
            <DialogDescription id={descriptionId} className="mt-1 text-[13px] leading-tight text-muted-foreground">
              {data?.appTitle
                ? "Modify the configuration before deploying"
                : "Deploy your own Docker container or compose file"}
            </DialogDescription>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-8 w-8 cursor-pointer rounded-lg border border-border bg-secondary/60 text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
