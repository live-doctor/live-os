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
    const url = await getAppWebUI(app.id);
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
          ? "group relative flex w-full cursor-pointer items-start gap-2.5 rounded-[14px] px-1 py-1.5 outline-none transition-colors hover:bg-white/4"
          : "group relative flex w-full cursor-pointer items-start gap-2.5 rounded-[20px] p-2.5 outline-none transition-colors hover:bg-white/4"
      }
    >
      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-[10px] border border-slate-100/10 bg-white/10">
        <Image
          src={iconSrc}
          alt={app.title}
          fill
          className="object-cover"
          onError={() => setIconSrc("/default-application-icon.png")}
        />
        {installedApp && (
          <div className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-[#1f1f1f]">
            <Check className="h-2.5 w-2.5 text-white" />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="truncate text-[13px] font-bold tracking-[-0.03em] md:text-[15px]">
          {app.title}
        </h3>
        <p className="line-clamp-2 w-full min-w-0 text-[12px] leading-tight text-white/40 md:text-[13px]">
          {app.tagline || app.overview}
        </p>
      </div>

      {!isCompact && (
        <div className="flex shrink-0 items-start">
          <Button
            size="sm"
            variant="ghost"
            onClick={isInstalled ? handleOpen : onClick}
            className={`mt-1 h-[25px] rounded-full px-[10px] text-[12px] ${isInstalled ? "bg-white/90 text-black hover:bg-white" : "border border-white/20 bg-white/10 text-white hover:bg-white/15"}`}
          >
            {isInstalled ? (
              <ExternalLink className="mr-1 h-3.5 w-3.5" />
            ) : null}
            {isInstalled ? "Open" : "View"}
          </Button>
        </div>
      )}
      {storeBadge ? (
        <span className="pointer-events-none absolute bottom-1 right-1 max-w-[120px] truncate rounded-md bg-black/45 px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-[0.08em] text-white/60">
          {storeBadge}
        </span>
      ) : null}
    </motion.div>
  );
}
