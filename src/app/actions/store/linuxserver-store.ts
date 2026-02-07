import type { App, EnvConfig, PortConfig, VolumeConfig } from "@/components/app-store/types";
import fs from "fs/promises";
import path from "path";
import YAML from "yaml";
import {
  buildReleaseNotes,
  isObject,
  normalizeId,
  parseBoolean,
  parseCategory,
  parseChangelog,
  parseNumber,
  parseStringArray,
  readString,
  readUnknown,
  resolveImage,
  type LinuxServerRecord,
} from "./linuxserver-helpers";

export const LINUXSERVER_IMAGES_API = "https://api.linuxserver.io/api/v1/images?include_config=true&include_deprecated=true";

const DEFAULT_ICON = "/default-application-icon.png";

export function isLinuxServerApiUrl(url: string): boolean {
  return /api\.linuxserver\.io\/api\/v1\/images/i.test(url);
}

export function getLinuxServerCommunityStores(): { id: string; name: string; description: string; sourceUrls: string[]; repoUrl?: string }[] { return []; }

export async function parseLinuxServerStore(payload: unknown, storeDir: string): Promise<App[]> {
  const records = extractRecords(payload);
  const apps: App[] = [];
  for (const item of records) {
    const app = toApp(item, storeDir);
    if (!app) continue;
    const composePath = app.composePath;
    if (!composePath) continue;
    await fs.mkdir(path.dirname(composePath), { recursive: true });
    await fs.writeFile(composePath, buildComposeYaml(app), "utf-8");
    apps.push(app);
  }
  return apps;
}

function extractRecords(payload: unknown): LinuxServerRecord[] {
  if (Array.isArray(payload)) return payload.filter(isObject);
  if (!isObject(payload)) return [];
  if (
    isObject(payload.data) &&
    isObject(payload.data.repositories) &&
    Array.isArray(payload.data.repositories.linuxserver)
  ) {
    return payload.data.repositories.linuxserver.filter(isObject);
  }
  const asObj = (value: unknown): LinuxServerRecord[] =>
    isObject(value) ? Object.values(value).filter(isObject) : [];
  const candidates: unknown[] = [
    payload.data,
    payload.images,
    payload.results,
    isObject(payload.data) ? payload.data.results : undefined,
    isObject(payload.data) ? payload.data.images : undefined,
    isObject(payload.data) ? payload.data.repositories : undefined,
    isObject(payload.repositories) ? payload.repositories.linuxserver : undefined,
    isObject(payload.data) && isObject(payload.data.repositories)
      ? payload.data.repositories.linuxserver
      : undefined,
  ];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate.filter(isObject);
    const mapped = asObj(candidate);
    if (mapped.length > 0) return mapped;
  }
  return asObj(payload);
}

function toApp(item: LinuxServerRecord, storeDir: string): App | null {
  const appId = normalizeId(
    readString(item, ["id", "name"]) ||
      readString(item, ["image"])?.split("/").pop()?.split(":")[0] ||
      "",
  );
  if (!appId) return null;

  const image = resolveImage(item, appId);
  const title = readString(item, ["human_name", "name", "id"]) || appId;
  const description = readString(item, ["description", "long_description"]) || "";
  const longDescription = readString(item, ["long_description", "description"]) || description;
  const config = isObject(item.config) ? item.config : {};
  const ports = parsePorts(config, item);
  const volumes = parseVolumes(config, appId);
  const environment = parseEnvironment(config);
  const category = parseCategory(readUnknown(item, ["category"]));
  const architectures = parseStringArray(readUnknown(item, ["architectures"]));
  const changelog = parseChangelog(readUnknown(item, ["changelog"]));
  const releaseNotes = buildReleaseNotes(changelog);
  const composePath = path.join(storeDir, appId, "docker-compose.yml");
  return {
    id: appId,
    title,
    name: appId,
    icon:
      readString(item, ["icon", "logo", "logo_url", "project_logo", "thumbnail"]) ||
      DEFAULT_ICON,
    tagline: description,
    overview: longDescription,
    category: category.length > 0 ? category : ["Utilities"],
    developer: "LinuxServer.io",
    screenshots: [],
    version: readString(item, ["version", "tag"]) || undefined,
    releaseNotes,
    website: readString(item, ["documentation_url", "project_url", "url", "readme_url"]) || undefined,
    repo: readString(item, ["github_url", "repo", "url"]) || undefined,
    composePath,
    architectures,
    stable: parseBoolean(readUnknown(item, ["stable"])),
    deprecated: parseBoolean(readUnknown(item, ["deprecated"])),
    stars: parseNumber(readUnknown(item, ["stars"])),
    monthlyPulls: parseNumber(readUnknown(item, ["monthly_pulls"])),
    changelog,
    container: { image, ports, volumes, environment },
  };
}

function parsePorts(config: LinuxServerRecord, item: LinuxServerRecord): PortConfig[] {
  const rows = readUnknown(config, ["ports"]);
  const ports: PortConfig[] = [];
  if (Array.isArray(rows)) {
    for (const raw of rows) {
      if (!isObject(raw)) continue;
      const port = String(readUnknown(raw, ["port", "container", "target", "internal"]) || "").replace(/\/.*/, "");
      const published = String(readUnknown(raw, ["published", "host", "external"]) || port).replace(/\/.*/, "");
      const protocol = String(readUnknown(raw, ["protocol"]) || "tcp");
      if (!port) continue;
      ports.push({
        container: port,
        published,
        protocol,
        description: readString(raw, ["description", "desc"]) || undefined,
      });
    }
  }

  const topLevel = readUnknown(item, ["ports"]);
  if (ports.length === 0 && isObject(topLevel)) {
    for (const [published, value] of Object.entries(topLevel)) {
      const raw = String(value || "");
      const container = (raw.split("/")[0] || published).trim();
      const protocol = (raw.split("/")[1] || "tcp").trim();
      if (!container) continue;
      ports.push({ container, published, protocol });
    }
  }
  return ports;
}

function parseVolumes(config: LinuxServerRecord, appId: string): VolumeConfig[] {
  const rows = readUnknown(config, ["volumes"]);
  if (!Array.isArray(rows)) {
    return [{ container: "/config", source: `/DATA/AppData/${appId}/config` }];
  }
  const volumes: VolumeConfig[] = [];
  for (const raw of rows) {
    if (!isObject(raw)) continue;
    const mountRaw = String(readUnknown(raw, ["path", "mount", "target", "container"]) || "").trim();
    if (!mountRaw) continue;
    const container = mountRaw.startsWith("/") ? mountRaw : `/${mountRaw}`;
    const mountName = container.replace(/^\/+/, "").split("/")[0] || "config";
    const defaultPath = String(readUnknown(raw, ["host_path", "default_path", "source"]) || "").trim();
    const source =
      defaultPath.startsWith("/") && !/\/path\/to\//i.test(defaultPath)
        ? defaultPath
        : `/DATA/AppData/${appId}/${mountName}`;
    volumes.push({
      container,
      source,
      description: readString(raw, ["description", "desc"]) || undefined,
    });
  }
  return volumes.length > 0
    ? volumes
    : [{ container: "/config", source: `/DATA/AppData/${appId}/config` }];
}

function parseEnvironment(config: LinuxServerRecord): EnvConfig[] {
  const envRows = readUnknown(config, ["environment", "env", "env_vars"]) || [];
  const env: EnvConfig[] = [];
  if (Array.isArray(envRows)) {
    for (const row of envRows) {
      if (typeof row === "string" && row.includes("=")) {
        const [key, ...rest] = row.split("=");
        env.push({ key, value: rest.join("=") });
        continue;
      }
      if (!isObject(row)) continue;
      const key = String(readUnknown(row, ["key", "name", "env_variable"]) || "").trim();
      if (!key) continue;
      env.push({
        key,
        value: String(readUnknown(row, ["value", "default", "default_value"]) || ""),
        description: readString(row, ["description", "desc"]) || undefined,
      });
    }
  } else if (isObject(envRows)) {
    for (const [key, value] of Object.entries(envRows)) {
      env.push({ key, value: String(value ?? "") });
    }
  }
  for (const [key, value] of [["PUID", "1000"], ["PGID", "1000"], ["TZ", "UTC"]] as const) {
    if (!env.some((entry) => entry.key === key)) env.push({ key, value });
  }
  return env;
}

function buildComposeYaml(app: App): string {
  const container = app.container;
  if (!container) return "";
  const service = {
    image: container.image,
    container_name: app.id,
    restart: "unless-stopped",
    environment: container.environment.map((entry) => `${entry.key}=${entry.value}`),
    ports: container.ports.map(
      (entry) => `${entry.published}:${entry.container}/${entry.protocol}`,
    ),
    volumes: container.volumes.map(
      (entry) => `${entry.source}:${entry.container}`,
    ),
  };
  return YAML.stringify({ services: { [app.id]: service } });
}
