import type {
  App,
  EnvConfig,
  PortConfig,
  VolumeConfig,
} from "@/components/app-store/types";
import fs from "fs/promises";
import path from "path";
import YAML from "yaml";

const DEFAULT_ICON = "/default-application-icon.png";

type LocalAppManifest = {
  id?: string;
  title?: string;
  name?: string;
  icon?: string;
  tagline?: string;
  overview?: string;
  category?: string[];
  developer?: string;
  screenshots?: string[];
  version?: string;
  releaseNotes?: string;
  port?: number;
  path?: string;
  website?: string;
  repo?: string;
};

export async function parseLocalStore(
  storeDir: string,
): Promise<App[]> {
  const entries = await fs
    .readdir(storeDir, { withFileTypes: true })
    .catch(() => []);

  const apps: App[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const appId = entry.name;
    if (!appId || appId.startsWith(".")) continue;

    const appDir = path.join(storeDir, entry.name);
    const composePath = await resolveComposePath(appDir);
    if (!composePath) continue;

    const manifest = await readLocalManifest(appDir);
    const container = await buildContainerMetadata(composePath, appId);
    const title = manifest.title || manifest.name || appId;

    apps.push({
      id: appId,
      title,
      name: manifest.name || appId,
      icon: manifest.icon || DEFAULT_ICON,
      tagline: manifest.tagline || "",
      overview: manifest.overview || "",
      category: Array.isArray(manifest.category) ? manifest.category : [],
      developer: manifest.developer || "Custom",
      screenshots: Array.isArray(manifest.screenshots)
        ? manifest.screenshots
        : [],
      version: manifest.version,
      releaseNotes: manifest.releaseNotes,
      port: manifest.port,
      path: manifest.path,
      website: manifest.website,
      repo: manifest.repo,
      composePath,
      container: container ?? undefined,
    });
  }

  return apps;
}

async function resolveComposePath(appDir: string): Promise<string | null> {
  const candidates = ["docker-compose.yml", "docker-compose.yaml"];
  for (const name of candidates) {
    const candidate = path.join(appDir, name);
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      // try next
    }
  }
  return null;
}

async function readLocalManifest(appDir: string): Promise<LocalAppManifest> {
  const manifestPath = path.join(appDir, "app.json");
  try {
    const raw = await fs.readFile(manifestPath, "utf-8");
    const parsed = JSON.parse(raw) as LocalAppManifest;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

async function buildContainerMetadata(
  composePath: string,
  appId: string,
): Promise<{
  image: string;
  ports: PortConfig[];
  volumes: VolumeConfig[];
  environment: EnvConfig[];
} | null> {
  try {
    const content = await fs.readFile(composePath, "utf-8");
    const doc = YAML.parse(content) as ComposeDocument;
    const services = doc?.services;
    if (!services || typeof services !== "object") return null;

    const mainKey =
      Object.keys(services).find((k) => k === appId) ??
      Object.keys(services)[0];
    if (!mainKey) return null;

    const service = services[mainKey];
    if (!service) return null;

    return {
      image: service.image || "",
      ports: normalizePorts(service.ports),
      volumes: normalizeVolumes(service.volumes),
      environment: normalizeEnv(service.environment),
    };
  } catch {
    return null;
  }
}

function normalizePorts(
  rawPorts?: Array<string | ComposePortObject>,
): PortConfig[] {
  if (!rawPorts) return [];
  const results: PortConfig[] = [];

  for (const port of rawPorts) {
    if (typeof port === "string") {
      const [hostPart, containerPartRaw] = port.split(":");
      const [containerPart, protocolPart] = (
        containerPartRaw || hostPart
      ).split("/");
      const container = containerPart?.toString() || "";
      if (container) {
        results.push({
          container,
          published: hostPart?.toString() || container,
          protocol: (protocolPart || "tcp").toString(),
        });
      }
    } else if (typeof port === "object" && port !== null) {
      const container = (port.target ?? port.container ?? "").toString();
      const published = (port.published ?? port.host ?? container).toString();
      const protocol = (port.protocol ?? "tcp").toString();
      if (container) {
        results.push({ container, published, protocol });
      }
    }
  }

  return results;
}

function normalizeVolumes(
  rawVolumes?: Array<string | ComposeVolumeObject>,
): VolumeConfig[] {
  if (!rawVolumes) return [];
  const results: VolumeConfig[] = [];

  for (const vol of rawVolumes) {
    if (typeof vol === "string") {
      const parts = vol.split(":");
      const source = parts[0] || "";
      const container = parts[1] || source;
      if (container) {
        results.push({ container, source });
      }
    } else if (typeof vol === "object" && vol !== null) {
      const container = (vol.target ?? vol.container ?? "").toString();
      const source = (vol.source ?? vol.from ?? "").toString();
      if (container) {
        results.push({ container, source });
      }
    }
  }

  return results;
}

function normalizeEnv(
  rawEnv?: Array<string> | Record<string, string | number>,
): EnvConfig[] {
  if (!rawEnv) return [];
  const results: EnvConfig[] = [];

  if (Array.isArray(rawEnv)) {
    for (const item of rawEnv) {
      if (typeof item === "string" && item.includes("=")) {
        const [key, ...rest] = item.split("=");
        results.push({ key, value: rest.join("=") });
      }
    }
  } else if (typeof rawEnv === "object") {
    for (const [key, value] of Object.entries(rawEnv)) {
      results.push({ key, value: String(value ?? "") });
    }
  }

  return results;
}

type ComposePortObject = {
  target?: string | number;
  container?: string | number;
  published?: string | number;
  host?: string | number;
  protocol?: string;
};

type ComposeVolumeObject = {
  target?: string;
  container?: string;
  source?: string;
  from?: string;
};

type ComposeService = {
  image?: string;
  ports?: Array<string | ComposePortObject>;
  volumes?: Array<string | ComposeVolumeObject>;
  environment?: Array<string> | Record<string, string | number>;
};

type ComposeDocument = {
  services?: Record<string, ComposeService>;
};
