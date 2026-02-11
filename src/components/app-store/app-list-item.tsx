"use client";

import { getAppWebUI } from "@/app/actions/docker";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Check, ExternalLink } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { toast } from "sonner";
import type { App, InstalledApp } from "./types";

interface AppListItemProps {
  app: App;
  installedApp?: InstalledApp | null;
  index?: number;
  onClick?: () => void;
  variant?: "default" | "compact";
}

export function AppListItem({
  app,
  installedApp,
  index = 0,
  onClick,
  variant = "default",
}: AppListItemProps) {
  const [iconSrc, setIconSrc] = useState(app.icon);
  const isInstalled = Boolean(installedApp);
  const isCompact = variant === "compact";
  const storeBadge = app.storeName?.trim() || app.storeSlug?.trim() || null;

  const handleOpen = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = await getAppWebUI(app.id, window.location.origin);
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
    } else {
      toast.error("Unable to determine app URL. Ensure the app is running.");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03, duration: 0.3 }}
      onClick={onClick}
      className={
        isCompact
          ? "group relative flex w-full cursor-pointer items-start gap-2.5 rounded-lg px-1 py-1.5 outline-none transition-colors hover:bg-secondary/40"
          : "group relative flex w-full cursor-pointer items-start gap-2.5 rounded-lg p-2.5 outline-none transition-colors hover:bg-secondary/40"
      }
    >
      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-border bg-secondary/60">
        <Image
          src={iconSrc}
          alt={app.title}
          fill
          className="object-cover"
          onError={() => setIconSrc("/default-application-icon.png")}
        />
        {installedApp && (
          <div className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-background">
            <Check className="h-2.5 w-2.5 text-primary-foreground" />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="truncate text-[13px] font-bold tracking-[-0.03em] md:text-[15px]">
          {app.title}
        </h3>
        <p className="line-clamp-2 w-full min-w-0 text-[12px] leading-tight text-muted-foreground md:text-[13px]">
          {app.tagline || app.overview}
        </p>
      </div>

      {!isCompact && (
        <div className="flex shrink-0 items-start">
          <Button
            size="sm"
            variant="ghost"
            onClick={isInstalled ? handleOpen : onClick}
            className={`mt-1 h-[25px] rounded-lg px-[10px] text-[12px] ${isInstalled ? "bg-primary text-primary-foreground hover:bg-primary/90" : "border border-border bg-secondary/60 text-foreground hover:bg-secondary"}`}
          >
            {isInstalled ? (
              <ExternalLink className="mr-1 h-3.5 w-3.5" />
            ) : null}
            {isInstalled ? "Open" : "View"}
          </Button>
        </div>
      )}
      {storeBadge ? (
        <span className="pointer-events-none absolute bottom-1 right-1 max-w-[120px] truncate rounded-lg border border-border bg-background/70 px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          {storeBadge}
        </span>
      ) : null}
    </motion.div>
  );
}
