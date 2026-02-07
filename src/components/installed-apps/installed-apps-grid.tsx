/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { getAppWebUI } from "@/app/actions/docker";
import type { InstalledApp } from "@/components/app-store/types";
import { surface } from "@/components/ui/design-tokens";
import type {
  OtherContainer,
  InstalledApp as WSInstalledApp,
} from "@/hooks/system-status-types";
import { useSystemStatus } from "@/hooks/useSystemStatus";
import { motion } from "framer-motion";
import { ArrowUp, Box } from "lucide-react";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AppContextMenu } from "./app-context-menu";

const iconFrameClass =
  "border border-slate-100/10 bg-white/10 shadow-inner shadow-black/25";

export function InstalledAppsGrid() {
  const {
    installedApps: wsApps,
    otherContainers,
    connected,
  } = useSystemStatus();
  const [appIcons, setAppIcons] = useState<Record<string, string>>({});
  const [currentPage, setCurrentPage] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Convert WebSocket app format to component format
  const apps: InstalledApp[] = wsApps.map((wsApp: WSInstalledApp) => ({
    id: wsApp.id,
    appId: wsApp.appId,
    name: wsApp.name,
    icon: wsApp.icon || "/default-application-icon.png",
    status: wsApp.status,
    webUIPort: wsApp.webUIPort,
    containerName: wsApp.containerName,
    containers: wsApp.containers,
    installedAt: wsApp.installedAt,
    version: wsApp.version,
    availableVersion: wsApp.availableVersion,
    hasUpdate: wsApp.hasUpdate,
  }));

  // Update icons when apps change (and replace placeholder with real icon if it arrives later)
  useEffect(() => {
    setAppIcons((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const app of apps) {
        if (app.icon && next[app.id] !== app.icon) {
          next[app.id] = app.icon;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [apps]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const updateItemsPerPage = () => {
      const width = window.innerWidth;
      if (width >= 1024) {
        setItemsPerPage(10);
      } else if (width >= 640) {
        setItemsPerPage(8);
      } else {
        setItemsPerPage(6);
      }
    };

    updateItemsPerPage();
    window.addEventListener("resize", updateItemsPerPage);
    return () => window.removeEventListener("resize", updateItemsPerPage);
  }, []);

  const totalPages = Math.max(1, Math.ceil(apps.length / itemsPerPage));

  useEffect(() => {
    setCurrentPage((prev) => Math.min(prev, totalPages - 1));
  }, [totalPages]);

  const pagedApps = useMemo(() => {
    const start = currentPage * itemsPerPage;
    return apps.slice(start, start + itemsPerPage);
  }, [apps, currentPage, itemsPerPage]);

  // Show loading state if not connected yet
  if (!connected && apps.length === 0 && otherContainers.length === 0) {
    return (
      <div className="w-full max-w-5xl px-4">
        <p className="text-center text-sm text-white/80">
          Connecting to server...
        </p>
      </div>
    );
  }

  if (apps.length === 0 && otherContainers.length === 0) {
    return (
      <div className="w-full max-w-5xl px-4">
        <p className="text-center text-sm text-white/80">
          No apps installed yet. Install apps from the App Store in the dock!
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col items-center px-4">
      {apps.length > 0 && (
        <div className="w-full">
          <motion.div
            variants={{
              hidden: { opacity: 0 },
              show: {
                opacity: 1,
                transition: { staggerChildren: 0.05 },
              },
            }}
            initial="hidden"
            animate="show"
            className="mx-auto grid w-full grid-cols-3 justify-items-center gap-4 sm:grid-cols-4 sm:gap-5 md:grid-cols-5"
          >
            {pagedApps.map((app) => (
              <AppCard
                key={app.id}
                app={app}
                icon={appIcons[app.id]}
                onIconError={() =>
                  setAppIcons((prev) => ({
                    ...prev,
                    [app.id]: "/default-application-icon.png",
                  }))
                }
              />
            ))}
          </motion.div>
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-center gap-2">
              {Array.from({ length: totalPages }).map((_, pageIndex) => (
                <button
                  key={`apps-page-${pageIndex}`}
                  type="button"
                  onClick={() => setCurrentPage(pageIndex)}
                  className={`h-2.5 rounded-full transition-all ${
                    pageIndex === currentPage
                      ? "w-5 bg-white/80"
                      : "w-2.5 bg-white/30 hover:bg-white/45"
                  }`}
                  aria-label={`Go to apps page ${pageIndex + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {otherContainers.length > 0 && (
        <div className="mt-6 w-full">
          <h3
            className={`mb-3 text-xs uppercase tracking-wider ${surface.labelMuted}`}
          >
            Other Containers
          </h3>
          <motion.div
            variants={{
              hidden: { opacity: 0 },
              show: {
                opacity: 1,
                transition: { staggerChildren: 0.05 },
              },
            }}
            initial="hidden"
            animate="show"
            className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4 sm:gap-5"
          >
            {otherContainers.map((container) => (
              <OtherContainerCard key={container.id} container={container} />
            ))}
          </motion.div>
        </div>
      )}
    </div>
  );
}

function AppCard({
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
          className="relative"
        >
          <div className="mx-auto flex w-14 flex-col items-center text-center sm:w-16">
            <div
              className={`relative h-14 w-14 cursor-pointer overflow-hidden rounded-[10px] sm:h-16 sm:w-16 ${iconFrameClass}`}
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
              <span
                className={`absolute -top-1 -right-1 inline-block h-3 w-3 rounded-full ring-2 ring-white/40 shadow ${
                  app.status === "running"
                    ? "bg-emerald-400 shadow-emerald-500/40"
                    : app.status === "stopped"
                      ? "bg-rose-400 shadow-rose-500/40"
                      : "bg-amber-300 shadow-amber-400/40"
                }`}
                title={app.status}
              />
              {app.hasUpdate && (
                <div
                  className="absolute -top-1 -left-1 flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 shadow-lg shadow-blue-500/40"
                  title={`Update available: ${app.availableVersion}`}
                >
                  <ArrowUp className="w-3 h-3 text-white" />
                </div>
              )}
            </div>
            <span
              className={`mt-2 block w-full text-center text-[11px] leading-tight sm:text-xs ${surface.label}`}
            >
              {app.name}
            </span>
          </div>
        </motion.div>
      </AppContextMenu>
    </motion.div>
  );
}

function OtherContainerCard({ container }: { container: OtherContainer }) {
  const handleClick = () => {
    if (container.webUIPort) {
      const url = `${window.location.protocol}//${window.location.hostname}:${container.webUIPort}`;
      window.open(url, "_blank", "noopener,noreferrer");
    } else {
      toast.info(
        `${container.name} - Unmanaged container (${container.image})`,
      );
    }
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
        <div className="mx-auto flex w-12 flex-col items-center sm:w-14">
          <div
            className={`relative flex h-12 w-12 items-center justify-center rounded-[10px] sm:h-14 sm:w-14 ${iconFrameClass}`}
          >
            <Box className="h-6 w-6 text-white/55" />
            <span
              className={`absolute -top-1 -right-1 inline-block h-2.5 w-2.5 rounded-full ring-1 ring-white/30 shadow ${
                container.status === "running"
                  ? "bg-emerald-400/80 shadow-emerald-500/30"
                  : container.status === "stopped"
                    ? "bg-rose-400/80 shadow-rose-500/30"
                    : "bg-amber-300/80 shadow-amber-400/30"
              }`}
              title={container.status}
            />
          </div>
          <span className={`mt-2 block w-full text-center text-[11px] leading-tight sm:text-xs ${surface.labelMuted}`}>
            {container.name}
          </span>
        </div>
      </motion.div>
    </motion.div>
  );
}
