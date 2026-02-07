"use client";

import { getSettings, updateSettings } from "@/app/actions/auth/settings";
import { getFavorites } from "@/app/actions/filesystem/favorites";
import {
  AVAILABLE_WIDGETS,
  DEFAULT_WIDGET_IDS,
  MAX_WIDGETS,
  WIDGET_COLORS,
} from "@/components/widgets/constants";
import {
  buildNetworkWidgetData,
  DEFAULT_CUSTOM_WIDGETS,
  mergeCustomWidgets,
  sanitizeCustomWidgetData,
} from "@/components/widgets/widget-data-utils";
import type {
  AvailableWidget,
  CustomWidgetData,
  FileItem,
  FilesGridData,
  FilesListData,
  FourStatsData,
  NetworkWidgetData,
  SystemPillsData,
  TextWithProgressData,
  ThermalsWidgetData,
  ThreeStatsData,
  TwoStatsGaugeData,
  WeatherWidgetData,
  WidgetData,
  WidgetType,
} from "@/components/widgets/types";
import { formatBytes } from "@/lib/utils";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSystemStatus } from "./useSystemStatus";
import { useUserLocation } from "./useUserLocation";

const STORAGE_KEY = "homeio-selected-widgets";
const CUSTOM_WIDGETS_KEY = "homeio-custom-widgets";
const THERMALS_MAX_KEY = "homeio-thermals-max";
const THERMALS_MAX_WINDOW_MS = 24 * 60 * 60 * 1000;

type ThermalsRecord = { value: number; ts: number } | null;

function toFavoriteFolders(paths: string[]): FileItem[] {
  return paths.map((favPath) => {
    const segments = favPath.split("/").filter(Boolean);
    return {
      id: favPath,
      name: segments[segments.length - 1] || favPath,
      path: favPath,
      type: "folder" as const,
    };
  });
}

function loadThermalsMax(): ThermalsRecord {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(THERMALS_MAX_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { value?: number; ts?: number };
    if (
      typeof parsed.value === "number" &&
      typeof parsed.ts === "number" &&
      !Number.isNaN(parsed.value) &&
      Date.now() - parsed.ts < THERMALS_MAX_WINDOW_MS
    ) {
      return { value: parsed.value, ts: parsed.ts };
    }
  } catch {
    // ignore
  }
  return null;
}

function nextThermalsMax(
  prev: ThermalsRecord,
  reading: number | null | undefined,
): ThermalsRecord {
  if (typeof reading !== "number" || Number.isNaN(reading)) return prev;
  const now = Date.now();
  const expired = !prev || now - prev.ts > THERMALS_MAX_WINDOW_MS;
  const candidate = expired ? reading : Math.max(prev.value, reading);
  const next: ThermalsRecord =
    !prev || expired || candidate !== prev.value
      ? { value: candidate, ts: expired ? now : prev.ts }
      : prev;

  if (next !== prev && typeof window !== "undefined") {
    try {
      localStorage.setItem(THERMALS_MAX_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  }

  return next;
}

interface UseWidgetsReturn {
  // Available widgets
  availableWidgets: AvailableWidget[];

  // Selected widget IDs
  selectedIds: string[];

  // Widget data by ID
  widgetData: Map<string, { type: WidgetType; data: WidgetData }>;

  // Selection management
  toggleWidget: (id: string) => void;
  updateCustomWidget: (id: string, data: Partial<CustomWidgetData>) => void;
  isSelected: (id: string) => boolean;
  canSelectMore: boolean;

  // Shake animation state (when trying to select > MAX)
  shakeTrigger: number;

  // Loading state
  isLoading: boolean;
}

// Load initial selection from localStorage
async function getInitialSelectedIds(): Promise<string[]> {
  // Server-side fallback
  if (typeof window === "undefined") return DEFAULT_WIDGET_IDS;

  // Prefer DB-backed settings
  try {
    const settings = await getSettings();
    if (Array.isArray(settings.selectedWidgets)) {
      return settings.selectedWidgets.slice(0, MAX_WIDGETS);
    }
  } catch (err) {
    console.warn(
      "[Widgets] Failed to load settings, falling back to localStorage",
      err,
    );
  }

  // Fallback to localStorage
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.slice(0, MAX_WIDGETS);
      }
    }
  } catch {
    // Ignore parse errors
  }
  return DEFAULT_WIDGET_IDS;
}

export function useWidgets(): UseWidgetsReturn {
  const [selectedIds, setSelectedIds] = useState<string[]>(DEFAULT_WIDGET_IDS);
  const [shakeTrigger, setShakeTrigger] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [customWidgets, setCustomWidgets] = useState<
    Record<string, CustomWidgetData>
  >(() => {
    if (typeof window === "undefined") return { ...DEFAULT_CUSTOM_WIDGETS };
    try {
      const raw = localStorage.getItem(CUSTOM_WIDGETS_KEY);
      return mergeCustomWidgets(raw ? JSON.parse(raw) : null);
    } catch {
      return { ...DEFAULT_CUSTOM_WIDGETS };
    }
  });
  const [thermalsMaxRecord, setThermalsMaxRecord] = useState<ThermalsRecord>(
    () => loadThermalsMax(),
  );
  const [favoriteFolders, setFavoriteFolders] = useState<FileItem[]>([]);
  const initializedRef = useRef(false);

  const { systemStats, storageStats, networkStats } = useSystemStatus();
  const { location: userLocation } = useUserLocation();

  // Load initial selection from DB/localStorage
  useEffect(() => {
    void (async () => {
      const [initial, favoritesResult] = await Promise.all([
        getInitialSelectedIds(),
        getFavorites().catch((err) => {
          console.error("[Widgets] Failed to load favorites:", err);
          return { favorites: [] as string[] };
        }),
      ]);
      setSelectedIds(initial);
      setFavoriteFolders(toFavoriteFolders(favoritesResult.favorites));
      initializedRef.current = true;
      setIsLoading(false);
    })();
  }, []);

  useEffect(() => {
    const handleFavoritesUpdated = () => {
      void (async () => {
        try {
          const result = await getFavorites();
          setFavoriteFolders(toFavoriteFolders(result.favorites));
        } catch (err) {
          console.error("[Widgets] Failed to refresh favorites:", err);
          setFavoriteFolders([]);
        }
      })();
    };
    window.addEventListener("homeio:favorites-updated", handleFavoritesUpdated);
    return () => {
      window.removeEventListener(
        "homeio:favorites-updated",
        handleFavoritesUpdated,
      );
    };
  }, []);

  // Save to localStorage when selection changes (skip initial render)
  useEffect(() => {
    if (!initializedRef.current) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(selectedIds));
  }, [selectedIds]);

  // Persist to settings table (best-effort)
  useEffect(() => {
    if (!initializedRef.current) return;
    void updateSettings({ selectedWidgets: selectedIds }).catch((err) =>
      console.error("[Widgets] Failed to persist selection:", err),
    );
  }, [selectedIds]);

  useEffect(() => {
    localStorage.setItem(CUSTOM_WIDGETS_KEY, JSON.stringify(customWidgets));
  }, [customWidgets]);

  // Track rolling 24h max temperature for thermals widget
  useEffect(() => {
    const reading =
      systemStats?.hardware?.thermals?.max ??
      systemStats?.hardware?.cpuTemperature;
    if (typeof reading !== "number" || Number.isNaN(reading)) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setThermalsMaxRecord((prev) => {
      const next = nextThermalsMax(prev, reading);
      if (next !== prev) {
        try {
          localStorage.setItem(THERMALS_MAX_KEY, JSON.stringify(next));
        } catch {
          // ignore storage errors
        }
      }
      return next;
    });
  }, [
    systemStats?.hardware?.thermals?.max,
    systemStats?.hardware?.cpuTemperature,
  ]);

  // Toggle widget selection
  const toggleWidget = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const isCurrentlySelected = prev.includes(id);

      if (isCurrentlySelected) {
        // Remove from selection
        return prev.filter((wid) => wid !== id);
      }

      // Check if at max capacity
      if (prev.length >= MAX_WIDGETS) {
        // Trigger shake animation
        setShakeTrigger((t) => t + 1);
        return prev;
      }

      // Add to selection
      return [...prev, id];
    });
  }, []);

  const updateCustomWidget = useCallback(
    (id: string, data: Partial<CustomWidgetData>) => {
      setCustomWidgets((prev) => {
        const fallback = prev[id];
        if (!fallback) return prev;
        return {
          ...prev,
          [id]: sanitizeCustomWidgetData(
            {
              ...data,
              updatedAt: new Date().toISOString(),
            },
            fallback,
          ),
        };
      });
    },
    [],
  );

  const isSelected = useCallback(
    (id: string) => selectedIds.includes(id),
    [selectedIds],
  );

  const canSelectMore = selectedIds.length < MAX_WIDGETS;

  // Generate widget data from system stats
  // All widgets are always created - each widget handles its own empty/loading state
  const widgetData = useMemo(() => {
    const dataMap = new Map<string, { type: WidgetType; data: WidgetData }>();

    // Safely extract values with defaults
    const cpu = systemStats?.cpu ?? { usage: 0, temperature: 0 };
    const memory = systemStats?.memory ?? {
      usage: 0,
      total: 0,
      used: 0,
      free: 0,
    };
    const storage = storageStats ?? {
      total: 0,
      used: 0,
      usagePercent: 0,
      health: "—",
    };
    // storageStats values are in gigabytes; convert to bytes for formatting
    const storageUsedBytes = storage.used * 1024 ** 3;
    const storageTotalBytes = storage.total * 1024 ** 3;
    const storageFreeBytes =
      storageTotalBytes > 0
        ? Math.max(0, storageTotalBytes - storageUsedBytes)
        : 0;
    const thermals = systemStats?.hardware?.thermals;

    // Storage widget
    const storageData: TextWithProgressData = {
      title: "Storage",
      value:
        storage.total > 0
          ? `${formatBytes(storageUsedBytes)} / ${formatBytes(storageTotalBytes)}`
          : "Loading...",
      subtext:
        storage.total > 0
          ? `${formatBytes(storageFreeBytes)} available`
          : undefined,
      progress: storage.usagePercent,
      color: WIDGET_COLORS.storage,
    };
    dataMap.set("homeio:storage", {
      type: "text-with-progress",
      data: storageData,
    });

    // Memory widget
    const memoryData: TextWithProgressData = {
      title: "Memory",
      value:
        memory.total > 0
          ? `${formatBytes(memory.used)} / ${formatBytes(memory.total)}`
          : "Loading...",
      subtext:
        memory.total > 0 ? `${formatBytes(memory.free)} free` : undefined,
      progress: memory.usage,
      color: WIDGET_COLORS.memory,
    };
    dataMap.set("homeio:memory", {
      type: "text-with-progress",
      data: memoryData,
    });

    // System stats (three stats)
    const threeStatsData: ThreeStatsData = {
      stats: [
        {
          label: "CPU",
          value: `${cpu.usage.toFixed(0)}%`,
          color: WIDGET_COLORS.cpu,
        },
        {
          label: "Memory",
          value: `${memory.usage.toFixed(0)}%`,
          color: WIDGET_COLORS.memory,
        },
        {
          label: "Storage",
          value: `${storage.usagePercent.toFixed(0)}%`,
          color: WIDGET_COLORS.storage,
        },
      ],
    };
    dataMap.set("homeio:system-stats", {
      type: "three-stats",
      data: threeStatsData,
    });

    const systemPillsData: SystemPillsData = {
      stats: [
        {
          label: "CPU",
          value: `${cpu.usage.toFixed(0)}%`,
          color: WIDGET_COLORS.cpu,
        },
        {
          label: "Memory",
          value: formatBytes(memory.used, 2),
          color: WIDGET_COLORS.memory,
        },
        {
          label: "Storage",
          value: formatBytes(storageUsedBytes, 2),
          color: WIDGET_COLORS.storage,
        },
      ],
    };
    dataMap.set("homeio:system-pills", {
      type: "system-pills",
      data: systemPillsData,
    });

    // CPU & Memory gauges
    const gaugeData: TwoStatsGaugeData = {
      stats: [
        {
          label: "CPU",
          value: cpu.usage,
          displayValue: `${cpu.usage.toFixed(0)}%`,
          color: WIDGET_COLORS.cpu,
        },
        {
          label: "Memory",
          value: memory.usage,
          displayValue: `${memory.usage.toFixed(0)}%`,
          color: WIDGET_COLORS.memory,
        },
      ],
    };
    dataMap.set("homeio:cpu-memory", {
      type: "two-stats-gauge",
      data: gaugeData,
    });

    // Four stats grid
    const fourStatsData: FourStatsData = {
      stats: [
        {
          label: "CPU",
          value: `${cpu.usage.toFixed(0)}%`,
          subtext: `${cpu.temperature.toFixed(0)}°C`,
          color: WIDGET_COLORS.cpu,
        },
        {
          label: "Memory",
          value: `${memory.usage.toFixed(0)}%`,
          subtext: memory.total > 0 ? formatBytes(memory.used) : "—",
          color: WIDGET_COLORS.memory,
        },
        {
          label: "Storage",
          value: `${storage.usagePercent.toFixed(0)}%`,
          subtext: storage.total > 0 ? formatBytes(storageUsedBytes) : "—",
          color: WIDGET_COLORS.storage,
        },
        {
          label: "Health",
          value: storage.health,
          color: "#10b981",
        },
      ],
    };
    dataMap.set("homeio:four-stats", {
      type: "four-stats",
      data: fourStatsData,
    });

    const networkData: NetworkWidgetData = buildNetworkWidgetData(
      networkStats,
      systemStats,
    );
    dataMap.set("homeio:network", {
      type: "network-stats",
      data: networkData,
    });

    // Thermals widget
    const thermalsData: ThermalsWidgetData = {
      cpuTemperature: systemStats?.hardware?.cpuTemperature ?? null,
      main: thermals?.main ?? null,
      max: thermalsMaxRecord?.value ?? thermals?.max ?? null,
      cores: thermals?.cores ?? [],
      socket: thermals?.socket ?? [],
    };
    dataMap.set("homeio:thermals", { type: "thermals", data: thermalsData });

    // Weather widget (uses user's location)
    const weatherLocationLabel = userLocation
      ? userLocation.city
        ? `${userLocation.city}${userLocation.country ? `, ${userLocation.country}` : ""}`
        : `${userLocation.latitude.toFixed(2)}, ${userLocation.longitude.toFixed(2)}`
      : "Loading location...";

    const weatherData: WeatherWidgetData = {
      location: weatherLocationLabel,
      latitude: String(userLocation?.latitude ?? 37.7749),
      longitude: String(userLocation?.longitude ?? -122.4194),
    };
    dataMap.set("homeio:weather", { type: "weather", data: weatherData });

    // Files widgets (placeholder data)
    const filesListData: FilesListData = {
      files: [],
      title: "Recent Files",
    };
    dataMap.set("homeio:files-recents", {
      type: "files-list",
      data: filesListData,
    });

    const filesGridData: FilesGridData = {
      folders: favoriteFolders,
      title: "Favorites",
    };
    dataMap.set("homeio:files-favorites", {
      type: "files-grid",
      data: filesGridData,
    });

    for (const [id, customData] of Object.entries(customWidgets)) {
      dataMap.set(id, {
        type: "custom",
        data: customData,
      });
    }

    return dataMap;
  }, [
    customWidgets,
    networkStats,
    systemStats,
    storageStats,
    userLocation,
    thermalsMaxRecord,
    favoriteFolders,
  ]);

  return {
    availableWidgets: AVAILABLE_WIDGETS,
    selectedIds,
    widgetData,
    toggleWidget,
    updateCustomWidget,
    isSelected,
    canSelectMore,
    shakeTrigger,
    isLoading,
  };
}
