"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion } from "framer-motion";
import { Loader2, X } from "lucide-react";
import { useCallback, useEffect } from "react";
import { AppDetailDialog } from "./app-detail-dialog";
import { AppListItem } from "./app-list-item";
import { AppStoreHeader } from "./app-store-header";
import { AppStoreSettingsDialog } from "./appstore-settings-dialog";
import { CommunityStoreDialog } from "./community-store-dialog";
import { CustomDeployDialog } from "./custom-deploy-dialog";
import {
  AppListGrid,
  DiscoverSection,
  FeaturedCardsRow,
} from "./discover-section";
import { FeaturedAppCard } from "./featured-app-card";
import type { App } from "./types";
import { useAppStore } from "./use-app-store";

interface AppStoreDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AppStoreDialog({ open, onOpenChange }: AppStoreDialogProps) {
  const s = useAppStore(open);
  const handleClose = useCallback(() => onOpenChange(false), [onOpenChange]);
  const handleClearSearch = useCallback(() => s.setSearchQuery(""), [s]);
  const isAllAppsView = s.selectedCategory === "all" && !s.isDiscoverView;

  useEffect(() => {
    const handleExternalSearch = (event: Event) => {
      const query =
        (event as CustomEvent<{ query?: string }>).detail?.query?.trim() ?? "";
      s.setSelectedCategory("all");
      s.setSearchQuery(query);
      onOpenChange(true);
    };
    window.addEventListener(
      "homeio:app-store-search",
      handleExternalSearch as EventListener,
    );
    return () => {
      window.removeEventListener(
        "homeio:app-store-search",
        handleExternalSearch as EventListener,
      );
    };
  }, [onOpenChange, s]);

  const renderGrid = (
    apps: App[],
    className = "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3",
    variant: "default" | "compact" = "default",
  ) => (
    <AppListGrid className={className}>
      {apps.map((app, index) => (
        <AppListItem
          key={`${app.id}${index}`}
          app={app}
          installedApp={s.getInstalledApp(app)}
          index={index}
          onClick={() => s.setSelectedApp(app)}
          variant={variant}
        />
      ))}
    </AppListGrid>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-h-[92vh] max-w-[95vw] overflow-hidden rounded-[20px] border border-white/10 bg-[rgba(47,51,57,0.72)] p-0 text-white shadow-[0_28px_80px_rgba(0,0,0,0.48)] backdrop-blur-3xl sm:max-w-[1280px]"
      >
        <DialogTitle className="sr-only">App Store</DialogTitle>
        <DialogDescription className="sr-only">
          Discover, install, and manage applications.
        </DialogDescription>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleClose}
          className="absolute right-5 top-5 z-20 h-8 w-8 cursor-pointer rounded-full border border-white/15 bg-white/10 text-white/50 hover:bg-white/20 hover:text-white"
        >
          <X className="h-4 w-4" />
        </Button>

        <ScrollArea
          className="h-[92vh] w-full"
          viewportClassName="homeio-scrollarea-fit umbrel-fade-scroller-y h-full w-full"
        >
          <div className="flex min-w-0 flex-col gap-4 px-3 pb-6 pt-4 md:px-[28px] md:pt-7 xl:px-[40px]">
            <AppStoreHeader
              searchQuery={s.searchQuery}
              categories={s.categories}
              selectedCategory={s.selectedCategory}
              setSearchQuery={s.setSearchQuery}
              categoryLabel={s.categoryLabel}
              onOpenSettings={() => s.setSettingsOpen(true)}
              onSelectCategory={(category) => {
                s.setSelectedCategory(category);
                if (category !== "discover" && category !== "all") {
                  s.setSearchQuery("");
                }
              }}
            />

            <div className="min-w-0 space-y-8">
              {!s.loading && !s.error && (
                <div className="space-y-1 px-2.5">
                  <h3 className="text-[18px] font-bold leading-tight tracking-[-0.03em] md:text-[32px]">
                    {s.isDiscoverView
                      ? "Discover"
                      : s.categoryLabel(s.selectedCategory)}
                  </h3>
                  {s.isDiscoverView ? (
                    <p className="text-[13px] text-white/55">
                      Curated highlights, popular picks, and the freshest
                      arrivals.
                    </p>
                  ) : s.searchQuery ? (
                    <p className="text-[13px] text-white/55">
                      {s.filteredApps.length} results for &quot;{s.searchQuery}
                      &quot;
                    </p>
                  ) : s.selectedCategory === "all" ? (
                    <p className="text-[13px] text-white/55">
                      {s.apps.length} total apps available
                    </p>
                  ) : null}
                </div>
              )}
              {s.loading && (
                <div className="flex flex-col items-center justify-center gap-3 py-20">
                  <Loader2 className="h-8 w-8 animate-spin text-white/60" />
                  <span className="text-sm text-zinc-400">Loading apps...</span>
                </div>
              )}
              {s.error && (
                <div className="flex flex-col items-center justify-center gap-4 py-20">
                  <p className="text-red-400">{s.error}</p>
                  <Button
                    variant="outline"
                    onClick={s.loadApps}
                    className="border-white/20 bg-white/5 text-white"
                  >
                    Try Again
                  </Button>
                </div>
              )}
              {!s.loading && !s.error && s.isDiscoverView && (
                <>
                  {s.featuredApps.length > 0 && (
                    <FeaturedCardsRow>
                      {s.featuredApps.map((app, index) => (
                        <FeaturedAppCard
                          key={app.id}
                          app={app}
                          index={index}
                          onClick={() => s.setSelectedApp(app)}
                        />
                      ))}
                    </FeaturedCardsRow>
                  )}
                  {s.popularApps.length > 0 && (
                    <DiscoverSection
                      label="MOST INSTALLS"
                      title="In popular demand"
                    >
                      {renderGrid(s.popularApps)}
                    </DiscoverSection>
                  )}
                  {s.newApps.length > 0 && (
                    <DiscoverSection
                      label="NEW APPS"
                      title="Fresh from the oven"
                    >
                      {renderGrid(s.newApps)}
                    </DiscoverSection>
                  )}
                </>
              )}
              {!s.loading && !s.error && !s.isDiscoverView && (
                <>
                  {s.filteredApps.length === 0 && (
                    <div className="flex flex-col items-center justify-center gap-3 py-16">
                      <p className="text-zinc-400">No applications found</p>
                      {s.searchQuery && (
                        <button
                          onClick={handleClearSearch}
                          className="text-sm text-blue-400 hover:text-blue-300"
                        >
                          Clear search
                        </button>
                      )}
                    </div>
                  )}
                  {s.filteredApps.length > 0 && (
                    <motion.div
                      variants={{
                        hidden: { opacity: 0 },
                        show: {
                          opacity: 1,
                          transition: { staggerChildren: 0.03 },
                        },
                      }}
                      initial="hidden"
                      animate="show"
                    >
                      {renderGrid(
                        s.filteredApps,
                        isAllAppsView
                          ? "!grid-cols-1 md:!grid-cols-2 lg:!grid-cols-3"
                          : undefined,
                        isAllAppsView ? "compact" : "default",
                      )}
                    </motion.div>
                  )}
                </>
              )}
            </div>
          </div>
        </ScrollArea>

        <CustomDeployDialog
          open={s.customDeployOpen}
          onOpenChange={s.setCustomDeployOpen}
        />
        <CommunityStoreDialog
          open={s.communityStoreOpen}
          onOpenChange={s.setCommunityStoreOpen}
          onImported={s.loadApps}
        />
        <AppStoreSettingsDialog
          open={s.settingsOpen}
          onOpenChange={s.setSettingsOpen}
          onStoresUpdated={s.loadApps}
          onCustomDeploy={() => s.setCustomDeployOpen(true)}
          onCommunityStore={() => s.setCommunityStoreOpen(true)}
        />
        {s.selectedApp && (
          <AppDetailDialog
            open={!!s.selectedApp}
            onOpenChange={(open) => !open && s.setSelectedApp(null)}
            app={s.selectedApp}
            allApps={s.apps}
            onSelectApp={(app) => s.setSelectedApp(app)}
            installedApp={s.getInstalledApp(s.selectedApp)}
            onInstallSuccess={s.loadApps}
            installProgress={s.installProgress.find(
              (p) => p.appId === s.selectedApp!.id,
            )}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
