"use client";

import {
  getAppStoreApps,
  getCasaOsRecommendList,
} from "@/app/actions/appstore";
import { useSystemStatus } from "@/hooks/useSystemStatus";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { App } from "./types";

const normalizeCategory = (value: string) =>
  value.trim().toLowerCase().replace(/\s+/g, " ");

const formatCategoryLabel = (value: string) =>
  value
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

export function useAppStore(open: boolean) {
  const [apps, setApps] = useState<App[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("discover");
  const [recommendedIds, setRecommendedIds] = useState<string[]>([]);
  const [customDeployOpen, setCustomDeployOpen] = useState(false);
  const [communityStoreOpen, setCommunityStoreOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectedApp, setSelectedApp] = useState<App | null>(null);
  const { installedApps, installProgress } = useSystemStatus({ fast: true });

  const storeMap = useMemo(() => {
    const map = new Map<string, string>();
    apps.forEach((app) => {
      if (app.storeSlug) map.set(app.storeSlug, app.storeName || app.storeSlug);
    });
    return map;
  }, [apps]);

  const loadApps = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [loadedApps, recommended] = await Promise.all([
        getAppStoreApps(),
        getCasaOsRecommendList(),
      ]);
      setApps(loadedApps);
      setRecommendedIds(recommended);
    } catch {
      setError("Unable to load applications. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) loadApps();
  }, [open, loadApps]);

  const categories = useMemo(() => {
    const catLabels = new Map<string, string>();
    apps.forEach((app) => {
      app.category?.forEach((cat) => {
        const norm = normalizeCategory(cat);
        if (!catLabels.has(norm)) catLabels.set(norm, formatCategoryLabel(norm));
      });
    });
    const storeCats = Array.from(storeMap.keys()).map((slug) => `store:${slug}`);
    return ["discover", "all", ...storeCats, ...Array.from(catLabels.keys()).sort()];
  }, [apps, storeMap]);

  const filteredApps = useMemo(() => {
    return apps.filter((app) => {
      const matchesSearch =
        searchQuery === "" ||
        app.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.tagline?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory =
        selectedCategory === "discover" ||
        selectedCategory === "all" ||
        (selectedCategory.startsWith("store:")
          ? app.storeSlug === selectedCategory.replace("store:", "")
          : app.category?.some((cat) => normalizeCategory(cat) === selectedCategory));
      return matchesSearch && matchesCategory;
    });
  }, [apps, searchQuery, selectedCategory]);

  const discoverApps = useMemo(() => {
    if (recommendedIds.length === 0) return apps;
    const byId = new Map(apps.map((app) => [app.id.toLowerCase(), app]));
    const ordered = recommendedIds.map((id) => byId.get(id)).filter(Boolean) as App[];
    return ordered.length > 0 ? ordered : apps;
  }, [apps, recommendedIds]);

  const featuredApps = useMemo(() => {
    const withScreenshots = discoverApps.filter(
      (app) => app.screenshots && app.screenshots.length > 0,
    );
    return withScreenshots.length > 0
      ? withScreenshots.slice(0, 6)
      : discoverApps.slice(0, 6);
  }, [discoverApps]);

  const popularApps = useMemo(() => discoverApps.slice(0, 9), [discoverApps]);
  const newApps = useMemo(() => discoverApps.slice(-9).reverse(), [discoverApps]);

  const getInstalledApp = useCallback(
    (app: App) =>
      installedApps.find(
        (installed) =>
          installed.appId.toLowerCase() === app.id.toLowerCase() &&
          (!installed.source || !app.storeSlug || installed.source === app.storeSlug),
      ) || undefined,
    [installedApps],
  );

  const isDiscoverView = selectedCategory === "discover" && searchQuery === "";

  const categoryLabel = useCallback(
    (category: string) => {
      if (category === "discover") return "Discover";
      if (category === "all") return "All";
      if (category.startsWith("store:")) {
        const slug = category.replace("store:", "");
        return storeMap.get(slug) || slug;
      }
      return formatCategoryLabel(category);
    },
    [storeMap],
  );

  return {
    apps,
    loading,
    error,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    customDeployOpen,
    setCustomDeployOpen,
    communityStoreOpen,
    setCommunityStoreOpen,
    settingsOpen,
    setSettingsOpen,
    selectedApp,
    setSelectedApp,
    installProgress,
    categories,
    filteredApps,
    featuredApps,
    popularApps,
    newApps,
    isDiscoverView,
    loadApps,
    getInstalledApp,
    categoryLabel,
  };
}
