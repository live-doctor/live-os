"use client";

import { Button } from "@/components/ui/button";
import {
  HOMEIO_DIALOG_CLOSE_BUTTON_CLASS,
  HOMEIO_DIALOG_CONTENT_GUTTER_CLASS,
  HOMEIO_DIALOG_SHELL_CLASS,
  HOMEIO_DIALOG_SUBTITLE_CLASS,
  HOMEIO_DIALOG_TITLE_CLASS,
} from "@/components/ui/dialog-chrome";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { X } from "lucide-react";
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
        className={HOMEIO_DIALOG_SHELL_CLASS}
      >
        <DialogTitle className="sr-only">App Store</DialogTitle>
        <DialogDescription className="sr-only">
          Discover, install, and manage applications.
        </DialogDescription>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleClose}
          className={HOMEIO_DIALOG_CLOSE_BUTTON_CLASS}
        >
          <X className="h-4 w-4" />
        </Button>

        <ScrollArea
          className="h-[92vh] w-full min-w-0"
          viewportClassName="homeio-scrollarea-fit homeio-fade-scroller-y h-full w-full [&>div]:!block [&>div]:!w-full [&>div]:!min-w-0 [&>div]:!max-w-full [&>div]:!overflow-x-hidden"
        >
          <div
            className={`flex min-w-0 max-w-full flex-col gap-4 overflow-hidden pb-6 pt-4 md:pt-7 ${HOMEIO_DIALOG_CONTENT_GUTTER_CLASS}`}
          >
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
              {s.loading && (
                <div className="space-y-6 py-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {Array.from({ length: 6 }).map((_, index) => (
                      <div
                        key={`app-skeleton-${index}`}
                        className="space-y-3 rounded-lg border border-border bg-secondary/30 p-4"
                      >
                        <div className="flex items-center gap-3">
                          <Skeleton className="h-11 w-11 rounded-lg" />
                          <div className="min-w-0 flex-1 space-y-2">
                            <Skeleton className="h-4 w-2/3" />
                            <Skeleton className="h-3 w-1/2" />
                          </div>
                        </div>
                        <Skeleton className="h-3 w-full" />
                        <Skeleton className="h-3 w-4/5" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {s.error && (
                <div className="flex flex-col items-center justify-center gap-4 py-20">
                  <p className="text-destructive">{s.error}</p>
                  <Button
                    variant="outline"
                    onClick={s.loadApps}
                    className="border-border bg-secondary/60 text-foreground hover:bg-secondary"
                  >
                    Try Again
                  </Button>
                </div>
              )}
              {!s.loading && !s.error && s.apps.length === 0 && (
                <div className="flex flex-col items-center justify-center gap-3 py-16">
                  <p className="text-muted-foreground">
                    No applications found
                  </p>
                </div>
              )}
              {!s.loading && !s.error && s.apps.length > 0 && (
                <>
                  <div className="space-y-1 px-2.5">
                    <h3 className={HOMEIO_DIALOG_TITLE_CLASS}>
                      {s.isDiscoverView
                        ? "Discover"
                        : s.categoryLabel(s.selectedCategory)}
                    </h3>
                    {s.isDiscoverView ? (
                      <p className={HOMEIO_DIALOG_SUBTITLE_CLASS}>
                        Curated highlights, popular picks, and the freshest
                        arrivals.
                      </p>
                    ) : s.searchQuery ? (
                      <p className={HOMEIO_DIALOG_SUBTITLE_CLASS}>
                        {s.filteredApps.length} results for &quot;{s.searchQuery}
                        &quot;
                      </p>
                    ) : s.selectedCategory === "all" ? (
                      <p className={HOMEIO_DIALOG_SUBTITLE_CLASS}>
                        {s.apps.length} total apps available
                      </p>
                    ) : null}
                  </div>
                  {s.isDiscoverView && (
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
                  {!s.isDiscoverView && (
                    <>
                      {s.filteredApps.length === 0 && (
                        <div className="flex flex-col items-center justify-center gap-3 py-16">
                          <p className="text-muted-foreground">
                            No applications found
                          </p>
                          {s.searchQuery && (
                            <button
                              onClick={handleClearSearch}
                              className="text-sm text-primary hover:opacity-80"
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
