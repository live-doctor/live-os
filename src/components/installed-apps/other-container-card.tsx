"use client";

import { surface } from "@/components/ui/design-tokens";
import type { OtherContainer } from "@/hooks/system-status-types";
import { motion } from "framer-motion";
import { Box } from "lucide-react";
import { toast } from "sonner";

const iconFrameClass =
  "bg-white/10 shadow-inner shadow-black/25";

export function OtherContainerCard({
  container,
}: {
  container: OtherContainer;
}) {
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
      <motion.div
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.98 }}
        transition={{ type: "spring", stiffness: 380, damping: 18 }}
        className="relative cursor-pointer"
        onClick={handleClick}
      >
        <div className="mx-auto flex w-16 flex-col items-center justify-start text-center">
          <div
            className={`relative flex h-12 w-12 items-center justify-center rounded-[10px] sm:h-14 sm:w-14 ${iconFrameClass}`}
          >
            <Box className="h-6 w-6 text-white/55" />
            {container.status !== "running" ? (
              <div
                className="pointer-events-none absolute inset-0 rounded-[10px] bg-zinc-900/45"
                title={container.status}
              />
            ) : null}
          </div>
          <span
            className={`mt-1.5 block w-full text-center text-[11px] leading-tight sm:text-xs ${surface.labelMuted}`}
          >
            {container.name}
          </span>
        </div>
      </motion.div>
    </motion.div>
  );
}
