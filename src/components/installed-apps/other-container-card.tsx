"use client";

import { surface } from "@/components/ui/design-tokens";
import type { OtherContainer } from "@/hooks/system-status-types";
import { motion } from "framer-motion";
import { Box, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { OtherContainerContextMenu } from "./other-container-context-menu";

export function OtherContainerCard({
  container,
}: {
  container: OtherContainer;
}) {
  const isRunning = container.status === "running";
  const [actionLoading, setActionLoading] = useState(false);

  const handleClick = () => {
    if (container.webUIPort) {
      const url = `${window.location.protocol}//${window.location.hostname}:${container.webUIPort}`;
      window.open(url, "_blank", "noopener,noreferrer");
      return;
    }
    toast.info(`${container.name} - Unmanaged container (${container.image})`);
  };

  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, scale: 0.8 },
        show: { opacity: 1, scale: 1 },
      }}
    >
      <OtherContainerContextMenu
        container={container}
        onLoadingChange={setActionLoading}
      >
        <motion.div
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.95 }}
          transition={{ type: "spring", stiffness: 400, damping: 20 }}
          className="relative cursor-pointer p-2"
          onClick={handleClick}
        >
          <div className="flex flex-col items-center gap-2">
            {/* Icon container with glass frame — grayscale when not running */}
            <div
              className={`relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-lg border shadow-lg sm:h-[4.5rem] sm:w-[4.5rem] transition-all duration-300 ${
                actionLoading
                  ? "border-border bg-secondary/70 shadow-black/20"
                  : isRunning
                    ? "border-border bg-secondary/60 shadow-black/20"
                    : "border-border/70 bg-secondary/40 shadow-black/10 grayscale opacity-60"
              }`}
            >
              <Box
                className={`h-7 w-7 sm:h-8 sm:w-8 ${
                  isRunning ? "text-foreground/60" : "text-muted-foreground/70"
                }`}
              />
              {actionLoading && (
                <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-background/70 backdrop-blur-[2px]">
                  <Loader2 className="h-6 w-6 animate-spin text-foreground sm:h-7 sm:w-7" />
                </div>
              )}
            </div>

            {/* Container name */}
            <span
              className={`block w-20 text-center text-[11px] leading-tight sm:w-24 sm:text-xs ${surface.labelMuted}`}
            >
              {container.name}
            </span>
          </div>
        </motion.div>
      </OtherContainerContextMenu>
    </motion.div>
  );
}
