"use client";

import { getAppWebUI } from "@/app/actions/docker";
import type { InstalledApp } from "@/components/app-store/types";
import { surface } from "@/components/ui/design-tokens";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUp, Loader2 } from "lucide-react";
import Image from "next/image";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { AppContextMenu } from "./app-context-menu";

export function InstalledAppCard({
  app,
  icon,
  onIconError,
  onDeployStateChange,
}: {
  app: InstalledApp;
  icon?: string;
  onIconError: () => void;
  onDeployStateChange?: (appId: string, deploying: boolean) => void;
}) {
  const isRunning = app.status === "running";
  const [actionLoading, setActionLoading] = useState(false);

  const handleLoadingChange = useCallback(
    (loading: boolean) => {
      setActionLoading(loading);
      // Notify grid so it keeps ghost entry during redeploy
      onDeployStateChange?.(app.id, loading);
    },
    [app.id, onDeployStateChange],
  );

  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, scale: 0.8 },
        show: { opacity: 1, scale: 1 },
      }}
    >
      <AppContextMenu app={app} onLoadingChange={handleLoadingChange}>
        <motion.div
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.95 }}
          transition={{ type: "spring", stiffness: 400, damping: 20 }}
          className="relative cursor-pointer p-2"
          onClick={async () => {
            try {
              const url = await getAppWebUI(app.appId, window.location.origin);
              if (url) {
                window.open(url, "_blank", "noopener,noreferrer");
              } else {
                toast.error(
                  "Unable to determine app URL. Ensure the app is running.",
                );
              }
            } catch {
              toast.error("Failed to open app");
            }
          }}
        >
          <div className="flex flex-col items-center gap-2">
            {/* Icon container with glass frame */}
            <div
              className={`relative h-12 w-12 overflow-hidden rounded-lg border shadow-lg sm:h-[4.5rem] sm:w-[4.5rem] transition-all duration-300 ${
                actionLoading
                  ? "border-border bg-secondary/70 shadow-black/20"
                  : isRunning
                    ? "border border-border bg-secondary/60"
                    : "border-border/70 bg-secondary/40 shadow-black/10 grayscale opacity-60"
              }`}
            >
              <Image
                src={icon || "/default-application-icon.png"}
                alt={app.name}
                fill
                className={`object-cover transition-all duration-300 ${
                  actionLoading ? "scale-95 blur-[1px]" : ""
                }`}
                onError={onIconError}
              />

              {/* Loading overlay with spinner */}
              <AnimatePresence>
                {actionLoading && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="absolute inset-0 flex items-center justify-center rounded-lg bg-background/70 backdrop-blur-[2px]"
                  >
                    <Loader2 className="h-6 w-6 animate-spin text-foreground sm:h-7 sm:w-7" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Update badge */}
            {app.hasUpdate && !actionLoading && (
              <div
                className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-lg bg-primary shadow-lg shadow-primary/40 ring-2 ring-background/70"
                title={`Update available: ${app.availableVersion}`}
              >
                <ArrowUp className="h-3 w-3 text-primary-foreground" />
              </div>
            )}

            {/* App name */}
            <span
              className={`block w-20 text-center text-[11px] font-medium leading-tight sm:w-24 sm:text-xs transition-opacity duration-300 ${
                actionLoading ? "opacity-60" : ""
              } ${surface.label}`}
            >
              {app.name}
            </span>
          </div>
        </motion.div>
      </AppContextMenu>
    </motion.div>
  );
}
