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
import { motion } from "framer-motion";
import type { ReactNode } from "react";

type AuthShellProps = {
  badge: string;
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  widthClass?: string;
  avatarName?: string;
};

function avatarInitials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "H";

  const parts = trimmed.split(/\s+/).slice(0, 2);
  return parts
    .map((part) => part.charAt(0).toUpperCase())
    .join("")
    .slice(0, 2);
}

export function AuthShell({
  badge,
  title,
  subtitle,
  icon,
  children,
  footer,
  widthClass = "max-w-3xl",
  avatarName = "Homeio",
}: AuthShellProps) {
  const initials = avatarInitials(avatarName);

  return (
    <WallpaperLayout>
      <div className="relative min-h-screen flex items-center justify-center px-4 py-10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,oklch(from_var(--primary)_l_c_h_/_0.22),transparent_58%)]" />
        <motion.div
          initial={{ opacity: 0, y: 22, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.28, ease: "easeOut" }}
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
            <div className="flex min-w-0 items-center gap-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.86 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.08, duration: 0.22, ease: "easeOut" }}
                className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-border bg-secondary/70 text-sm font-semibold tracking-wide text-foreground shadow-sm"
              >
                <span>{initials}</span>
                <span className="pointer-events-none absolute -inset-0.5 rounded-[0.8rem] border border-primary/25" />
              </motion.div>

              <div className="min-w-0 space-y-1">
                <span className="inline-flex rounded-full border border-border bg-secondary/60 px-3 py-1 text-[11px] uppercase tracking-[0.26em] text-muted-foreground">
                  {badge}
                </span>
                <div className="flex min-w-0 items-center gap-2.5">
                  {icon && (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-secondary/65 text-muted-foreground">
                      {icon}
                    </div>
                  )}
                  <h1 className={cn(HOMEIO_DIALOG_TITLE_CLASS, "truncate")}>
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
                "border-t border-border bg-secondary/35 py-4",
                HOMEIO_DIALOG_CONTENT_GUTTER_CLASS,
              )}
            >
              {footer}
            </div>
          )}
        </motion.div>
      </div>
    </WallpaperLayout>
  );
}
