"use client";

import { progressBar, text, card } from "@/components/ui/design-tokens";
import { cn, clamp01 } from "@/lib/utils";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import type { InstallProgress } from "@/hooks/system-status-types";
import { useMemo, useState } from "react";

interface InstallProgressOverlayProps {
  installs: InstallProgress[];
}

const GROUP_THRESHOLD = 3;

export function InstallProgressOverlay({ installs }: InstallProgressOverlayProps) {
  const [expanded, setExpanded] = useState(false);
  const orderedInstalls = useMemo(
    () =>
      [...installs].sort((a, b) => {
        const statusRank = (status: InstallProgress["status"]) => {
          if (status === "running") return 0;
          if (status === "starting") return 1;
          if (status === "error") return 2;
          return 3;
        };
        const statusDiff = statusRank(a.status) - statusRank(b.status);
        if (statusDiff !== 0) return statusDiff;
        return clamp01(b.progress) - clamp01(a.progress);
      }),
    [installs],
  );
  if (!orderedInstalls.length) return null;

  const shouldGroup = orderedInstalls.length > GROUP_THRESHOLD;
  const averageProgress =
    orderedInstalls.reduce((acc, item) => acc + clamp01(item.progress), 0) /
    orderedInstalls.length;

  if (!shouldGroup) {
    return (
      <div className="fixed top-4 left-1/2 z-50 flex w-full max-w-xl -translate-x-1/2 flex-col gap-3 px-3">
        <AnimatePresence>
          {orderedInstalls.map((install) => (
            <InstallProgressCard key={install.appId} install={install} />
          ))}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="fixed top-4 left-1/2 z-50 w-full max-w-xl -translate-x-1/2 px-3">
      <div
        className="relative"
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
      >
        <motion.button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ duration: 0.15 }}
          className={cn(
            card.base,
            "w-full space-y-2 border-border bg-popover/92 p-3 text-left backdrop-blur-xl shadow-lg",
          )}
        >
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2">
              {orderedInstalls.slice(0, 4).map((install) => (
                <div
                  key={install.appId}
                  className="relative h-9 w-9 overflow-hidden rounded-lg border border-border bg-secondary/60"
                >
                  <Image
                    src={install.icon || "/default-application-icon.png"}
                    alt={install.name}
                    fill
                    className="object-cover"
                  />
                </div>
              ))}
              {orderedInstalls.length > 4 && (
                <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-secondary/80 text-[11px] font-medium text-foreground">
                  +{orderedInstalls.length - 4}
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">
                {orderedInstalls.length} installs in progress
              </p>
              <p className={cn(text.muted, "text-muted-foreground")}>
                Hover to preview all · click to pin
              </p>
            </div>
            <span className="text-xs text-muted-foreground">
              {Math.round(averageProgress * 100)}%
            </span>
          </div>
          <div className={progressBar.track}>
            <div
              className={cn(progressBar.fill, "bg-cyan-400")}
              style={{ width: `${averageProgress * 100}%` }}
            />
          </div>
        </motion.button>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.98 }}
              transition={{ duration: 0.16 }}
              className="absolute top-full right-0 left-0 mt-2 max-h-[50vh] space-y-2 overflow-y-auto rounded-lg"
            >
              {orderedInstalls.map((install) => (
                <InstallProgressCard key={install.appId} install={install} compact />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function InstallProgressCard({
  install,
  compact = false,
}: {
  install: InstallProgress;
  compact?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.15 }}
      className={cn(
        card.base,
        "flex items-center gap-3 border-border bg-popover/90 p-3 backdrop-blur-xl shadow-lg",
        compact && "p-2.5",
      )}
    >
      <div
        className={cn(
          "relative overflow-hidden rounded-lg border border-border bg-secondary/60",
          compact ? "h-10 w-10" : "h-12 w-12",
        )}
      >
        <Image
          src={install.icon || "/default-application-icon.png"}
          alt={install.name}
          fill
          className="object-cover"
        />
      </div>

      <div className="flex-1 space-y-1">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">{install.name}</p>
            <p className={cn(text.muted, "text-muted-foreground")}>
              {statusLabel(install)}
            </p>
          </div>
          <span className="text-xs text-muted-foreground">
            {Math.round(clamp01(install.progress) * 100)}%
          </span>
        </div>

        <div className={progressBar.track}>
          <div
            className={cn(
              progressBar.fill,
              install.status === "error" ? "bg-red-400" : "bg-cyan-400",
            )}
            style={{ width: `${clamp01(install.progress) * 100}%` }}
          />
        </div>
      </div>
    </motion.div>
  );
}

function statusLabel(install: InstallProgress) {
  if (install.status === "error") {
    return install.message || "Install failed";
  }
  if (install.status === "completed") {
    return "Completed";
  }
  return install.message || "Installing…";
}
