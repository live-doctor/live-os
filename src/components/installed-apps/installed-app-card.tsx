"use client";

import { getAppWebUI } from "@/app/actions/docker";
import type { InstalledApp } from "@/components/app-store/types";
import { surface } from "@/components/ui/design-tokens";
import { ArrowUp } from "lucide-react";
import { motion } from "framer-motion";
import Image from "next/image";
import { toast } from "sonner";
import { AppContextMenu } from "./app-context-menu";

export function InstalledAppCard({
  app,
  icon,
  onIconError,
}: {
  app: InstalledApp;
  icon?: string;
  onIconError: () => void;
}) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, scale: 0.8 },
        show: { opacity: 1, scale: 1 },
      }}
    >
      <AppContextMenu app={app}>
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.97 }}
          transition={{ type: "spring", stiffness: 380, damping: 18 }}
          className="relative cursor-pointer"
        >
          <div className="mx-auto flex w-16 flex-col items-center justify-start text-center">
            <div
              className="relative h-14 w-14 overflow-hidden rounded-[10px] sm:h-16 sm:w-16"
              onClick={async () => {
                try {
                  const url = await getAppWebUI(app.appId);
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
              <Image
                src={icon || "/default-application-icon.png"}
                alt={app.name}
                fill
                className="object-contain p-1"
                onError={onIconError}
              />
              {app.status !== "running" ? (
                <div
                  className="pointer-events-none absolute inset-0 rounded-[10px] bg-zinc-900/45"
                  title={app.status}
                />
              ) : null}
              {app.hasUpdate && (
                <div
                  className="absolute -top-1 -left-1 flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 shadow-lg shadow-blue-500/40"
                  title={`Update available: ${app.availableVersion}`}
                >
                  <ArrowUp className="h-3 w-3 text-white" />
                </div>
              )}
            </div>
            <span
              className={`mt-1.5 block w-full text-center text-[11px] font-medium leading-tight sm:text-xs ${surface.label}`}
            >
              {app.name}
            </span>
          </div>
        </motion.div>
      </AppContextMenu>
    </motion.div>
  );
}
