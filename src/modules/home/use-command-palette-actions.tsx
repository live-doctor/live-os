"use client";

import { getAppStoreApps } from "@/app/actions/appstore";
import type { CommandPaletteAction } from "@/components/search/command-palette-dialog";
import {
  Activity,
  Cog,
  LayoutGrid,
  Palette,
  RefreshCw,
  RotateCw,
  SlidersHorizontal,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AppSearchResultIcon } from "./app-search-result-icon";
import {
  DAILY_FREQUENT_THRESHOLD,
  DOCK_APPS,
  type AppStoreSearchItem,
  type DailyAppUsage,
} from "./domain";

type UseCommandPaletteActionsArgs = {
  commandPaletteOpen: boolean;
  dailyAppUsage: DailyAppUsage;
  openAppStore: () => void;
  openSettings: () => void;
  openMonitor: () => void;
  openWidgetSelector: () => void;
  onDockAppClick: (appId: string) => void;
};

export function useCommandPaletteActions({
  commandPaletteOpen,
  dailyAppUsage,
  openAppStore,
  openSettings,
  openMonitor,
  openWidgetSelector,
  onDockAppClick,
}: UseCommandPaletteActionsArgs) {
  const [appStoreSearchItems, setAppStoreSearchItems] = useState<
    AppStoreSearchItem[]
  >([]);
  const [appStoreSearchLoaded, setAppStoreSearchLoaded] = useState(false);

  const handleRestartFromPalette = useCallback(async () => {
    try {
      const response = await fetch("/api/system/restart", { method: "POST" });
      const data = await response.json();
      if (response.ok && data?.success) {
        toast.success("Restart requested");
      } else {
        toast.error(data?.error || "Failed to restart system");
      }
    } catch {
      toast.error("Failed to restart system");
    }
  }, []);

  const openAppStoreWithQuery = useCallback(
    (query: string) => {
      openAppStore();
      window.setTimeout(() => {
        window.dispatchEvent(
          new CustomEvent("homeio:app-store-search", {
            detail: { query },
          }),
        );
      }, 40);
    },
    [openAppStore],
  );

  useEffect(() => {
    if (!commandPaletteOpen || appStoreSearchLoaded) return;
    let cancelled = false;

    void getAppStoreApps()
      .then((apps) => {
        if (cancelled) return;
        setAppStoreSearchItems(
          apps.map((app) => ({
            id: app.id,
            title: app.title,
            tagline: app.tagline,
            icon: app.icon,
          })),
        );
        setAppStoreSearchLoaded(true);
      })
      .catch(() => {
        if (cancelled) return;
        setAppStoreSearchLoaded(true);
      });

    return () => {
      cancelled = true;
    };
  }, [appStoreSearchLoaded, commandPaletteOpen]);

  const settingsFeatureActions = useMemo<CommandPaletteAction[]>(
    () => [
      {
        id: "settings:wallpaper",
        title: "Wallpaper",
        subtitle: "in Settings",
        searchText: "change wallpaper appearance theme background",
        icon: <Palette className="h-4 w-4" />,
        onSelect: openSettings,
      },
      {
        id: "settings:wifi",
        title: "Wi-Fi",
        subtitle: "in Settings",
        searchText: "wifi network internet",
        icon: <Cog className="h-4 w-4" />,
        onSelect: openSettings,
      },
      {
        id: "settings:bluetooth",
        title: "Bluetooth",
        subtitle: "in Settings",
        searchText: "bluetooth devices pairing",
        icon: <Cog className="h-4 w-4" />,
        onSelect: openSettings,
      },
      {
        id: "settings:firewall",
        title: "Firewall",
        subtitle: "in Settings",
        searchText: "firewall security rules",
        icon: <Cog className="h-4 w-4" />,
        onSelect: openSettings,
      },
      {
        id: "settings:storage",
        title: "Storage",
        subtitle: "in Settings",
        searchText: "disk space storage",
        icon: <Cog className="h-4 w-4" />,
        onSelect: openSettings,
      },
      {
        id: "settings:update",
        title: "Update",
        subtitle: "in Settings",
        searchText: "check updates system update",
        icon: <RefreshCw className="h-4 w-4" />,
        onSelect: openSettings,
      },
    ],
    [openSettings],
  );

  const commandPaletteActions = useMemo<CommandPaletteAction[]>(
    () => [
      {
        id: "restart",
        title: "Restart Homeio",
        icon: <RotateCw className="h-4 w-4" />,
        onSelect: () => void handleRestartFromPalette(),
      },
      {
        id: "update",
        title: "Update all apps",
        searchText: "app store update upgrade",
        icon: <RefreshCw className="h-4 w-4" />,
        onSelect: () => openAppStoreWithQuery(""),
      },
      {
        id: "wallpaper",
        title: "Change wallpaper",
        icon: <Palette className="h-4 w-4" />,
        onSelect: openSettings,
      },
      {
        id: "monitoring",
        title: "Live Usage",
        icon: <Activity className="h-4 w-4" />,
        onSelect: openMonitor,
      },
      {
        id: "widgets",
        title: "Widgets",
        icon: <LayoutGrid className="h-4 w-4" />,
        onSelect: openWidgetSelector,
      },
      {
        id: "backups",
        title: "Backups",
        subtitle: "in Settings",
        icon: <SlidersHorizontal className="h-4 w-4" />,
        onSelect: openSettings,
      },
      ...settingsFeatureActions,
      ...appStoreSearchItems.map((app) => ({
        id: `app-store:${app.id}`,
        title: app.title,
        subtitle: "in App Store",
        searchText: `${app.title} ${app.tagline ?? ""} app store`,
        icon: <AppSearchResultIcon icon={app.icon} title={app.title} />,
        onSelect: () => openAppStoreWithQuery(app.title),
      })),
    ],
    [
      appStoreSearchItems,
      handleRestartFromPalette,
      openAppStoreWithQuery,
      openMonitor,
      openSettings,
      openWidgetSelector,
      settingsFeatureActions,
    ],
  );

  const frequentActions = useMemo<CommandPaletteAction[]>(
    () =>
      DOCK_APPS.filter(
        (app) => (dailyAppUsage.counts[app.id] ?? 0) > DAILY_FREQUENT_THRESHOLD,
      )
        .sort(
          (left, right) =>
            (dailyAppUsage.counts[right.id] ?? 0) -
            (dailyAppUsage.counts[left.id] ?? 0),
        )
        .map((app) => ({
          id: `frequent:${app.id}`,
          title: app.name,
          subtitle: `${dailyAppUsage.counts[app.id]} opens today`,
          searchText: `${app.name.toLowerCase()} app`,
          icon: <AppSearchResultIcon icon={app.icon} title={app.name} />,
          onSelect: () => onDockAppClick(app.id),
        })),
    [dailyAppUsage.counts, onDockAppClick],
  );

  return { commandPaletteActions, frequentActions };
}
