import type { NetworkStats, SystemStats } from "@/hooks/system-status-types";
import type { CustomWidgetData, NetworkWidgetData } from "./types";

const MAX_TITLE_LENGTH = 48;
const MAX_BODY_LENGTH = 160;

export const DEFAULT_CUSTOM_WIDGETS: Record<string, CustomWidgetData> = {
  "homeio:custom-1": {
    title: "Quick Note",
    body: "Write the single most important thing to finish today.",
    accent: "#38bdf8",
  },
  "homeio:custom-2": {
    title: "Personal Reminder",
    body: "Add a short reminder for your next deployment or task.",
    accent: "#f59e0b",
  },
};

function sanitizeText(
  value: unknown,
  fallback: string,
  maxLength: number,
): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim().replace(/\s+/g, " ");
  if (!trimmed) return fallback;
  return trimmed.slice(0, maxLength);
}

function sanitizeAccent(value: unknown, fallback?: string): string | undefined {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  return trimmed.slice(0, 32);
}

export function sanitizeCustomWidgetData(
  input: Partial<CustomWidgetData>,
  fallback: CustomWidgetData,
): CustomWidgetData {
  return {
    title: sanitizeText(input.title, fallback.title, MAX_TITLE_LENGTH),
    body: sanitizeText(input.body, fallback.body, MAX_BODY_LENGTH),
    accent: sanitizeAccent(input.accent, fallback.accent),
    updatedAt:
      typeof input.updatedAt === "string" && input.updatedAt
        ? input.updatedAt
        : fallback.updatedAt,
  };
}

export function mergeCustomWidgets(stored: unknown) {
  const merged: Record<string, CustomWidgetData> = {
    ...DEFAULT_CUSTOM_WIDGETS,
  };

  if (!stored || typeof stored !== "object") {
    return merged;
  }

  const source = stored as Record<string, Partial<CustomWidgetData>>;
  for (const key of Object.keys(DEFAULT_CUSTOM_WIDGETS)) {
    merged[key] = sanitizeCustomWidgetData(
      source[key] ?? {},
      DEFAULT_CUSTOM_WIDGETS[key],
    );
  }

  return merged;
}

export function buildNetworkWidgetData(
  networkStats: NetworkStats | null | undefined,
  systemStats: SystemStats | null | undefined,
): NetworkWidgetData {
  const uploadMbps =
    typeof networkStats?.uploadMbps === "number" &&
    Number.isFinite(networkStats.uploadMbps)
      ? Math.max(0, networkStats.uploadMbps)
      : 0;
  const downloadMbps =
    typeof networkStats?.downloadMbps === "number" &&
    Number.isFinite(networkStats.downloadMbps)
      ? Math.max(0, networkStats.downloadMbps)
      : 0;

  const interfaceName = systemStats?.hardware?.network?.iface || "Unknown";
  const ip4 = systemStats?.hardware?.network?.ip4 || "Unavailable";

  return {
    uploadMbps,
    downloadMbps,
    interfaceName,
    ip4,
    connected:
      interfaceName !== "Unknown" ||
      ip4 !== "Unavailable" ||
      uploadMbps > 0 ||
      downloadMbps > 0,
  };
}
