/**
 * Widget System Constants
 */

import { colors } from "@/components/ui/design-tokens";
import type { AvailableWidget, WidgetSectionData } from "./types";

// Maximum number of widgets that can be selected
export const MAX_WIDGETS = 3;

// Refresh intervals (in ms)
export const REFRESH_INTERVALS = {
  fast: 5000, // CPU, Memory - real-time metrics
  medium: 15000, // Network, processes
  slow: 30000, // Storage, files
} as const;

// Default selected widget IDs
export const DEFAULT_WIDGET_IDS = [
  "homeio:system-stats",
  "homeio:storage",
  "homeio:memory",
];

// Homeio app icon (fallback to default app icon)
export const HOMEIO_ICON = "/default-application-icon.png";

// All available widgets
export const AVAILABLE_WIDGETS: AvailableWidget[] = [
  // Homeio System Widgets
  {
    id: "homeio:storage",
    type: "text-with-progress",
    appId: "homeio",
    appName: "Homeio",
    appIcon: HOMEIO_ICON,
    name: "Storage",
    description: "Disk usage with progress bar",
  },
  {
    id: "homeio:memory",
    type: "text-with-progress",
    appId: "homeio",
    appName: "Homeio",
    appIcon: HOMEIO_ICON,
    name: "Memory",
    description: "RAM usage with progress bar",
  },
  {
    id: "homeio:system-stats",
    type: "three-stats",
    appId: "homeio",
    appName: "Homeio",
    appIcon: HOMEIO_ICON,
    name: "System Overview",
    description: "CPU, Memory, and Storage at a glance",
  },
  {
    id: "homeio:cpu-memory",
    type: "two-stats-gauge",
    appId: "homeio",
    appName: "Homeio",
    appIcon: HOMEIO_ICON,
    name: "CPU & Memory",
    description: "Circular gauges for CPU and Memory",
  },
  {
    id: "homeio:four-stats",
    type: "four-stats",
    appId: "homeio",
    appName: "Homeio",
    appIcon: HOMEIO_ICON,
    name: "System Grid",
    description: "CPU, Memory, Storage, and Network",
  },
  // Files Widgets
  {
    id: "homeio:files-recents",
    type: "files-list",
    appId: "homeio",
    appName: "Files",
    appIcon:
      "https://img.icons8.com/?size=100&id=12775&format=png&color=000000",
    name: "Recent Files",
    description: "Recently accessed files",
  },
  {
    id: "homeio:files-favorites",
    type: "files-grid",
    appId: "homeio",
    appName: "Files",
    appIcon:
      "https://img.icons8.com/?size=100&id=12775&format=png&color=000000",
    name: "Favorites",
    description: "Favorite folders grid",
  },
  {
    id: "homeio:weather",
    type: "weather",
    appId: "homeio",
    appName: "Homeio",
    appIcon: HOMEIO_ICON,
    name: "Weather",
    description: "Local forecast with live animations",
  },
  {
    id: "homeio:thermals",
    type: "thermals",
    appId: "homeio",
    appName: "Homeio",
    appIcon: HOMEIO_ICON,
    name: "Thermals",
    description: "CPU temps and sensor overview",
  },
];

// Group widgets by app
export function getWidgetSections(): WidgetSectionData[] {
  const sectionMap = new Map<string, WidgetSectionData>();

  for (const widget of AVAILABLE_WIDGETS) {
    const existing = sectionMap.get(widget.appId);
    if (existing) {
      existing.widgets.push(widget);
    } else {
      sectionMap.set(widget.appId, {
        appId: widget.appId,
        appName: widget.appName,
        appIcon: widget.appIcon,
        widgets: [widget],
      });
    }
  }

  return Array.from(sectionMap.values());
}

// Widget colors
export const WIDGET_COLORS = {
  cpu: colors.cpu,
  memory: colors.memory,
  storage: colors.storage,
  network: colors.network.download,
} as const;
