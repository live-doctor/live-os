"use client";

import { WallpaperLayout } from "@/components/layout/wallpaper-layout";
import {
  HOMEIO_DIALOG_CONTENT_GUTTER_CLASS,
  HOMEIO_DIALOG_SUBTITLE_CLASS,
  HOMEIO_DIALOG_TITLE_CLASS,
  HOMEIO_GLASS_HEADER_CLASS,
  HOMEIO_GLASS_PANEL_CLASS,
} from "@/components/ui/dialog-chrome";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type AuthShellProps = {
  badge: string;
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  widthClass?: string;
};

export function AuthShell({
  badge,
  title,
  subtitle,
  icon,
  children,
  footer,
  widthClass = "max-w-3xl",
}: AuthShellProps) {
  return (
    <WallpaperLayout>
      <div className="relative min-h-screen flex items-center justify-center px-4 py-10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(142,117,190,0.18),transparent_55%)]" />
        <div
          className={cn(
            "relative w-full max-h-[92vh]",
            HOMEIO_GLASS_PANEL_CLASS,
            widthClass,
          )}
        >
          <div
            className={cn(
              "flex items-center justify-between py-4 md:py-5",
              HOMEIO_GLASS_HEADER_CLASS,
              HOMEIO_DIALOG_CONTENT_GUTTER_CLASS,
            )}
          >
            <div className="flex items-center gap-4">
              <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.28em] text-white/70">
                {badge}
              </span>
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  {icon}
                  <h1 className={cn(HOMEIO_DIALOG_TITLE_CLASS, "text-white/85")}>
                    {title}
                  </h1>
                </div>
                {subtitle && (
                  <p className={HOMEIO_DIALOG_SUBTITLE_CLASS}>{subtitle}</p>
                )}
              </div>
            </div>
          </div>

          <div className={cn("py-6 md:py-7", HOMEIO_DIALOG_CONTENT_GUTTER_CLASS)}>
            {children}
          </div>

          {footer && (
            <div
              className={cn(
                "border-t border-white/10 bg-white/5 py-4",
                HOMEIO_DIALOG_CONTENT_GUTTER_CLASS,
              )}
            >
              {footer}
            </div>
          )}
        </div>
      </div>
    </WallpaperLayout>
  );
}
