import type { App } from "@/components/app-store/types";

export type LinuxServerRecord = Record<string, unknown>;

export function isObject(value: unknown): value is LinuxServerRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function readUnknown(obj: LinuxServerRecord, keys: string[]): unknown {
  for (const key of keys) {
    const value = obj[key];
    if (value !== undefined && value !== null) return value;
  }
  return undefined;
}

export function readString(
  obj: LinuxServerRecord,
  keys: string[],
): string | null {
  const value = readUnknown(obj, keys);
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function normalizeId(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function resolveImage(item: LinuxServerRecord, appId: string): string {
  const explicit = readString(item, ["image", "docker_image"]);
  if (explicit) return explicit;
  const tags = readUnknown(item, ["tags"]);
  if (Array.isArray(tags)) {
    for (const tag of tags) {
      if (!isObject(tag)) continue;
      const tagValue = readString(tag, ["tag"]);
      if (tagValue) return `lscr.io/linuxserver/${appId}:${tagValue}`;
    }
  }
  return `lscr.io/linuxserver/${appId}:latest`;
}

export function parseCategory(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((entry): entry is string => typeof entry === "string");
  }
  if (typeof value !== "string" || !value.trim()) return [];
  return value
    .split(/[,/]+/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function parseStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) =>
      typeof entry === "string"
        ? entry
        : isObject(entry)
          ? String(readUnknown(entry, ["arch", "name", "value"]) || "")
          : "",
    )
    .filter(Boolean);
}

export function parseBoolean(value: unknown): boolean | undefined {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const lower = value.toLowerCase().trim();
    if (lower === "true") return true;
    if (lower === "false") return false;
  }
  return undefined;
}

export function parseNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

export function parseChangelog(value: unknown): App["changelog"] {
  if (!Array.isArray(value)) return undefined;
  const entries: NonNullable<App["changelog"]> = [];
  for (const entry of value) {
    if (!isObject(entry)) continue;
    const desc = readString(entry, ["desc", "description", "message"]);
    if (!desc) continue;
    const date =
      readString(entry, ["date", "released_at", "version_timestamp"]) ||
      undefined;
    entries.push({ date, desc });
  }
  return entries;
}

export function buildReleaseNotes(changelog: App["changelog"]): string | undefined {
  if (!changelog || changelog.length === 0) return undefined;
  return changelog
    .slice(0, 8)
    .map((entry) => (entry.date ? `${entry.date}: ${entry.desc}` : entry.desc))
    .join("\n\n");
}
