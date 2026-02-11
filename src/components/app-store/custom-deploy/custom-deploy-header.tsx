/* eslint-disable @next/next/no-img-element */
import { Button } from "@/components/ui/button";
import {
  HOMEIO_DIALOG_CLOSE_BUTTON_CLASS,
  HOMEIO_DIALOG_CONTENT_GUTTER_CLASS,
  HOMEIO_DIALOG_SUBTITLE_CLASS,
  HOMEIO_DIALOG_TITLE_CLASS,
  HOMEIO_GLASS_HEADER_CLASS,
} from "@/components/ui/dialog-chrome";
import { DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
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
    <div
      className={cn(
        HOMEIO_GLASS_HEADER_CLASS,
        HOMEIO_DIALOG_CONTENT_GUTTER_CLASS,
        "relative py-4 md:py-5",
      )}
    >
      <Button
        variant="ghost"
        size="icon"
        onClick={onClose}
        className={HOMEIO_DIALOG_CLOSE_BUTTON_CLASS}
      >
        <X className="h-4 w-4" />
      </Button>

      <div className="flex items-center gap-4 pr-12">
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
          <DialogTitle className={HOMEIO_DIALOG_TITLE_CLASS}>{title}</DialogTitle>
          <DialogDescription id={descriptionId} className={cn(HOMEIO_DIALOG_SUBTITLE_CLASS, "mt-1")}>
            {data?.appTitle
              ? "Modify the configuration before deploying"
              : "Deploy your own Docker container or compose file"}
          </DialogDescription>
        </div>
      </div>
    </div>
  );
}
