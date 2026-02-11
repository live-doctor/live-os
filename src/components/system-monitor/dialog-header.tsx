"use client";

import {
  HOMEIO_DIALOG_SUBTITLE_CLASS,
  HOMEIO_DIALOG_TITLE_CLASS,
} from "@/components/ui/dialog-chrome";
import { ConnectionStatus } from "./connection-status";

interface DialogHeaderProps {
  connected: boolean;
}

export function DialogHeader({ connected }: DialogHeaderProps) {
  return (
    <div className="flex min-w-0 items-start justify-between gap-3 pl-3 pr-14 pt-4 md:pl-[28px] md:pr-[84px] md:pt-7 xl:pl-[40px] xl:pr-[96px]">
      <div className="flex min-w-0 flex-col gap-0.5 px-1">
        <h2 className={HOMEIO_DIALOG_TITLE_CLASS}>Live Usage</h2>
        <p className={HOMEIO_DIALOG_SUBTITLE_CLASS}>
          Real-time system metrics and app usage.
        </p>
      </div>
      <div className="hidden shrink-0 md:block">
        <ConnectionStatus connected={connected} />
      </div>
    </div>
  );
}
