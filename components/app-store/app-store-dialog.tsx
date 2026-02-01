"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { Loader2, MoreHorizontal, Search, X } from "lucide-react";
import { useCallback } from "react";
import { AppDetailDialog } from "./app-detail-dialog";
import { AppListItem } from "./app-list-item";
import { AppStoreSettingsDialog } from "./appstore-settings-dialog";
import { CommunityStoreDialog } from "./community-store-dialog";
import { CustomDeployDialog } from "./custom-deploy-dialog";
import {
  AppListGrid,
  DiscoverSection,
  FeaturedCardsRow,
} from "./discover-section";
import { FeaturedAppCard } from "./featured-app-card";
import { useAppStore } from "./use-app-store";

interface AppStoreDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AppStoreDialog({ open, onOpenChange }: AppStoreDialogProps) {
  const s = useAppStore(open);

  const handleClose = useCallback(() => onOpenChange(false), [onOpenChange]);
  const handleClearSearch = useCallback(() => s.setSearchQuery(""), [s]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-w-[95vw] sm:max-w-6xl max-h-[95vh] bg-white/5 border border-white/10 backdrop-blur-xl shadow-2xl shadow-black/50 p-0 gap-0 overflow-hidden ring-1 ring-white/5"
      >
        <DialogTitle className="sr-only">App Store</DialogTitle>
        <DialogDescription className="sr-only">
          Discover, install, and manage applications.
        </DialogDescription>

        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-white/5 bg-gradient-to-r from-white/10 via-white/5 to-transparent backdrop-blur">
          <div className="flex items-center gap-4">
            <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.28em] text-white/70">
              App Store
            </span>
            <div className="sr-only space-y-1">
              <h2 className="text-2xl font-bold text-white">App Store</h2>
              <p className="text-sm text-white/60 hidden sm:block">
                Discover, install, and manage apps
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative hidden sm:block w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
              <Input
                placeholder="Search apps"
                value={s.searchQuery}
                onChange={(e) => s.setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-white placeholder:text-zinc-500 bg-white/5 border-white/10 focus-visible:ring-white/20"
              />
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => s.setSettingsOpen(true)}
              className="h-10 w-10 rounded-full border border-white/15 bg-white/10 text-white/70 hover:text-white hover:bg-white/20 transition-colors"
            >
              <MoreHorizontal className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              className="h-10 w-10 rounded-full border border-white/15 bg-white/10 text-white/70 hover:text-white hover:bg-white/20 transition-colors"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Category Pills */}
        <div className="px-6 py-3 border-b overflow-auto" style={{ borderColor: "rgba(255, 255, 255, 0.1)" }}>
          <div className="flex gap-2 pb-1 min-w-full overflow-x-auto scrollbar-hide">
            {s.categories.map((category) => (
              <button
                key={category}
                onClick={() => {
                  s.setSelectedCategory(category);
                  if (category !== "discover" && category !== "all") s.setSearchQuery("");
                }}
                className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                  s.selectedCategory === category
                    ? "bg-white text-zinc-900"
                    : "bg-white/10 text-white hover:bg-white/15"
                }`}
              >
                {s.categoryLabel(category)}
              </button>
            ))}
          </div>
        </div>

        {/* Mobile Search */}
        <div className="px-6 py-3 sm:hidden border-b" style={{ borderColor: "rgba(255, 255, 255, 0.1)" }}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <Input
              placeholder="Search apps"
              value={s.searchQuery}
              onChange={(e) => s.setSearchQuery(e.target.value)}
              className="pl-9 text-white placeholder:text-zinc-500 bg-white/5 border-white/10"
            />
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto scrollbar-hide px-6 py-6 space-y-8 min-w-0 h-[60vh] sm:h-[70vh]">
          {!s.loading && !s.error && (
            <div className="space-y-1 px-1">
              <h2 className="text-2xl font-bold text-white">
                {s.isDiscoverView ? "Discover" : s.categoryLabel(s.selectedCategory)}
              </h2>
              {s.isDiscoverView ? (
                <p className="text-sm text-white/60">
                  Curated highlights, popular picks, and the freshest arrivals.
                </p>
              ) : s.searchQuery ? (
                <p className="text-sm text-white/60">
                  {s.filteredApps.length} results for &quot;{s.searchQuery}&quot;
                </p>
              ) : s.selectedCategory === "all" ? (
                <p className="text-sm text-white/60">
                  {s.apps.length} total apps available
                </p>
              ) : null}
            </div>
          )}

          {s.loading && (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-white/60" />
              <span className="text-sm text-zinc-400">Loading apps...</span>
            </div>
          )}

          {s.error && (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <p className="text-red-400">{s.error}</p>
              <Button variant="outline" onClick={s.loadApps} className="text-white border-white/20 bg-white/5">
                Try Again
              </Button>
            </div>
          )}

          {!s.loading && !s.error && s.isDiscoverView && (
            <>
              {s.featuredApps.length > 0 && (
                <FeaturedCardsRow>
                  {s.featuredApps.map((app, index) => (
                    <FeaturedAppCard key={app.id} app={app} index={index} onClick={() => s.setSelectedApp(app)} />
                  ))}
                </FeaturedCardsRow>
              )}
              {s.popularApps.length > 0 && (
                <DiscoverSection label="MOST INSTALLS" title="In popular demand">
                  <AppListGrid>
                    {s.popularApps.map((app, index) => (
                      <AppListItem key={app.id} app={app} installedApp={s.getInstalledApp(app)} index={index} onClick={() => s.setSelectedApp(app)} />
                    ))}
                  </AppListGrid>
                </DiscoverSection>
              )}
              {s.newApps.length > 0 && (
                <DiscoverSection label="NEW APPS" title="Fresh from the oven">
                  <AppListGrid>
                    {s.newApps.map((app, index) => (
                      <AppListItem key={app.id} app={app} installedApp={s.getInstalledApp(app)} index={index} onClick={() => s.setSelectedApp(app)} />
                    ))}
                  </AppListGrid>
                </DiscoverSection>
              )}
            </>
          )}

          {!s.loading && !s.error && !s.isDiscoverView && (
            <>
              {s.filteredApps.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <p className="text-zinc-400">No applications found</p>
                  {s.searchQuery && (
                    <button onClick={handleClearSearch} className="text-sm text-blue-400 hover:text-blue-300">
                      Clear search
                    </button>
                  )}
                </div>
              )}
              {s.filteredApps.length > 0 && (
                <motion.div
                  variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.03 } } }}
                  initial="hidden"
                  animate="show"
                >
                  <AppListGrid>
                    {s.filteredApps.map((app, index) => (
                      <AppListItem key={app.id + index} app={app} installedApp={s.getInstalledApp(app)} index={index} onClick={() => s.setSelectedApp(app)} />
                    ))}
                  </AppListGrid>
                </motion.div>
              )}
            </>
          )}
        </div>

        <CustomDeployDialog open={s.customDeployOpen} onOpenChange={s.setCustomDeployOpen} />
        <CommunityStoreDialog open={s.communityStoreOpen} onOpenChange={s.setCommunityStoreOpen} onImported={s.loadApps} />
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
            installedApp={s.getInstalledApp(s.selectedApp)}
            onInstallSuccess={s.loadApps}
            installProgress={s.installProgress.find((p) => p.appId === s.selectedApp!.id)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
