/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import type { InstalledApp } from "@/components/app-store/types";
import { surface } from "@/components/ui/design-tokens";
import type { InstalledApp as WSInstalledApp } from "@/hooks/system-status-types";
import { useSystemStatus } from "@/hooks/useSystemStatus";
import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { InstalledAppCard } from "./installed-app-card";
import { OtherContainerCard } from "./other-container-card";
import {
  PaginationArrows,
  PaginationPills,
  useSnapPaginator,
} from "./paginator";

function chunkIntoPages<T>(items: T[], pageSize: number): T[][] {
  if (items.length === 0 || pageSize <= 0) return [];
  const pages: T[][] = [];
  for (let index = 0; index < items.length; index += pageSize) {
    pages.push(items.slice(index, index + pageSize));
  }
  return pages;
}

function resolveGridLayout(width: number, height: number) {
  const columns = width >= 1024 ? 5 : width >= 640 ? 4 : 3;
  const rows = height < 680 ? 1 : 2;
  return { columns, rows, itemsPerPage: columns * rows };
}

export function InstalledAppsGrid() {
  const { installedApps: wsApps, otherContainers, connected } = useSystemStatus();
  const [appIcons, setAppIcons] = useState<Record<string, string>>({});
  const [columns, setColumns] = useState(5);
  const [itemsPerPage, setItemsPerPage] = useState(10);

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

    const updateGridLayout = () => {
      const layout = resolveGridLayout(window.innerWidth, window.innerHeight);
      setColumns(layout.columns);
      setItemsPerPage(layout.itemsPerPage);
    };

    updateGridLayout();
    window.addEventListener("resize", updateGridLayout);
    return () => window.removeEventListener("resize", updateGridLayout);
  }, []);

  const appPages = useMemo(
    () => chunkIntoPages(apps, itemsPerPage),
    [apps, itemsPerPage],
  );
  const appPageCount = Math.max(appPages.length, 1);
  const {
    page,
    scrollContainer,
    toPage,
    prevPage,
    nextPage,
    prevDisabled,
    nextDisabled,
  } = useSnapPaginator(appPageCount);

  const otherContainerPages = useMemo(
    () => chunkIntoPages(otherContainers, itemsPerPage),
    [otherContainers, itemsPerPage],
  );
  const otherPageCount = Math.max(otherContainerPages.length, 1);
  const {
    page: otherPage,
    scrollContainer: otherScrollContainer,
    toPage: toOtherPage,
    prevPage: prevOtherPage,
    nextPage: nextOtherPage,
    prevDisabled: otherPrevDisabled,
    nextDisabled: otherNextDisabled,
  } = useSnapPaginator(otherPageCount);

  if (!connected && apps.length === 0 && otherContainers.length === 0) {
    return (
      <div className="w-full max-w-5xl px-4">
        <p className="text-center text-sm text-white/80">Connecting to server...</p>
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
        <div className="relative w-full">
          <div
            ref={scrollContainer}
            className="scrollbar-hide flex w-full snap-x snap-mandatory overflow-x-auto"
          >
            {appPages.map((pageApps, pageIndex) => (
              <div
                key={`installed-apps-page-${pageIndex}`}
                className="w-full flex-none snap-center"
              >
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
                  className="mx-auto grid w-full justify-items-center gap-4 sm:gap-5"
                  style={{
                    gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
                  }}
                >
                  {pageApps.map((app) => (
                    <InstalledAppCard
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
              </div>
            ))}
          </div>

          <PaginationArrows
            show={appPageCount > 1}
            onPrev={prevPage}
            onNext={nextPage}
            prevDisabled={prevDisabled}
            nextDisabled={nextDisabled}
          />
          <PaginationPills
            pageCount={appPageCount}
            currentPage={page}
            onSelectPage={toPage}
          />
        </div>
      )}

      {otherContainers.length > 0 && (
        <div className="mt-6 w-full">
          <h3 className={`mb-3 text-xs uppercase tracking-wider ${surface.labelMuted}`}>
            Other Containers
          </h3>
          <div className="relative w-full">
            <div
              ref={otherScrollContainer}
              className="scrollbar-hide flex w-full snap-x snap-mandatory overflow-x-auto"
            >
              {otherContainerPages.map((containersPage, pageIndex) => (
                <div
                  key={`other-containers-page-${pageIndex}`}
                  className="w-full flex-none snap-center"
                >
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
                    className="mx-auto grid w-full justify-items-center gap-4 sm:gap-5"
                    style={{
                      gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
                    }}
                  >
                    {containersPage.map((container) => (
                      <OtherContainerCard key={container.id} container={container} />
                    ))}
                  </motion.div>
                </div>
              ))}
            </div>

            <PaginationArrows
              show={otherPageCount > 1}
              onPrev={prevOtherPage}
              onNext={nextOtherPage}
              prevDisabled={otherPrevDisabled}
              nextDisabled={otherNextDisabled}
            />
            <PaginationPills
              pageCount={otherPageCount}
              currentPage={otherPage}
              onSelectPage={toOtherPage}
            />
          </div>
        </div>
      )}
    </div>
  );
}
