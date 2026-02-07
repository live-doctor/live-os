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
    <div className="relative border-b border-white/10 bg-gradient-to-r from-white/10 via-white/5 to-transparent px-6 py-5">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-[12px] border border-slate-100/10 bg-white/10">
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
            <DialogTitle className="text-[24px] font-bold leading-none tracking-[-0.04em] text-white/75">
              {title}
            </DialogTitle>
            <DialogDescription id={descriptionId} className="mt-1 text-[13px] leading-tight text-white/55">
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
          className="h-8 w-8 cursor-pointer rounded-full border border-white/15 bg-white/10 text-white/50 hover:bg-white/20 hover:text-white"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
