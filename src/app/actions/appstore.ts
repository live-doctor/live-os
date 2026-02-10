"use server";

/* eslint-disable @typescript-eslint/no-explicit-any */

import type { App } from "@/components/app-store/types";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import { logAction, withActionLogging } from "./maintenance/logger";
import type { CommunityStore } from "./store/types";
import {
  isLinuxServerApiUrl,
  parseLinuxServerStore,
} from "./store/linuxserver-store";
import { parseLocalStore } from "./store/local-store";

const STORE_ROOT = path.join(process.cwd(), "external-apps");
const DEFAULT_LINUXSERVER_STORE_URL =
  "https://api.linuxserver.io/api/v1/images?include_config=true&include_deprecated=true";
const DEFAULT_LINUXSERVER_STORE_SLUG = slugify(DEFAULT_LINUXSERVER_STORE_URL);
const DEFAULT_LINUXSERVER_STORE_NAME = "LinuxServer.io Catalog";
const DEFAULT_LINUXSERVER_STORE_DESCRIPTION =
  "Official LinuxServer.io image catalog";
const LOCAL_STORE_DIR = path.join(process.cwd(), "store");
const LOCAL_STORE_URL = "local://store";
const LOCAL_STORE_SLUG = "local-store";
const LOCAL_STORE_NAME = "Local Store";
const LOCAL_STORE_DESCRIPTION = "Local app catalog from /store";

type StoreFormat = "linuxserver" | "local";

function parseStoredStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === "string");
}

function parseStoredChangelog(value: unknown): App["changelog"] {
  if (!Array.isArray(value)) return undefined;
  const entries = value
    .map((entry) => {
      if (!isObject(entry) || typeof entry.desc !== "string") return null;
      return {
        desc: entry.desc,
        date: typeof entry.date === "string" ? entry.date : undefined,
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null);
  return entries.length > 0 ? entries : undefined;
}

/**
 * List all imported app stores (directory names).
 */
export async function listImportedStores(): Promise<string[]> {
  return withActionLogging("appstore:listImported", async () => {
    try {
      await fs.mkdir(STORE_ROOT, { recursive: true });
      const entries = await fs.readdir(STORE_ROOT, { withFileTypes: true });
      return entries
        .filter((e) => e.isDirectory())
        .map((e) => e.name)
        .sort((a, b) => a.localeCompare(b));
    } catch (error) {
      console.error("Failed to list imported stores:", error);
      return [];
    }
  });
}

/**
 * Remove an imported store by its slug.
 */
export async function removeImportedStore(slug: string): Promise<boolean> {
  return withActionLogging("appstore:removeImported", async () => {
    if (!slug) return false;
    if (slug === DEFAULT_LINUXSERVER_STORE_SLUG || slug === LOCAL_STORE_SLUG) {
      await logAction("appstore:removeImported:blocked", {
        slug,
        reason: "protected-default-store",
      });
      return false;
    }
    const store = await prisma.store.findUnique({ where: { slug } });
    if (isProtectedStore(store)) {
      await logAction("appstore:removeImported:blocked", {
        slug,
        reason: "protected-default-store",
      });
      return false;
    }

    const target = path.join(STORE_ROOT, slug);
    try {
      await fs.rm(target, { recursive: true, force: true });
      await prisma.store.deleteMany({ where: { slug } });
      await prisma.app.deleteMany({ where: { store: { slug } } });
      return true;
    } catch (error) {
      console.error("Failed to remove imported store:", error);
      return false;
    }
  });
}

/**
 * Load apps from the persisted store database.
 */
export async function getAppStoreApps(): Promise<App[]> {
  return withActionLogging("appstore:list", async () => {
    await logAction("appstore:list:start");
    try {
      let records = await prisma.app.findMany({
        orderBy: [{ title: "asc" }],
        include: { store: true },
      });

      const hasDefaultStoreApps = records.some((record) =>
        isProtectedStore(record.store),
      );
      if (records.length === 0 || !hasDefaultStoreApps) {
        await ensureDefaultStoresInstalled();
        records = await prisma.app.findMany({
          orderBy: [{ title: "asc" }],
          include: { store: true },
        });
      }

      const apps = records.map((record) => ({
        id: record.appId,
        title: record.title,
        name: record.name,
        icon: record.icon,
        tagline: record.tagline ?? "",
        overview: record.overview ?? "",
        category: Array.isArray(record.category)
          ? (record.category as string[])
          : [],
        developer: record.developer ?? "Unknown",
        screenshots: Array.isArray(record.screenshots)
          ? (record.screenshots as string[])
          : [],
        version: record.version ?? undefined,
        releaseNotes: record.releaseNotes ?? undefined,
        stable:
          typeof record.stable === "boolean" ? record.stable : undefined,
        deprecated:
          typeof record.deprecated === "boolean"
            ? record.deprecated
            : undefined,
        stars: typeof record.stars === "number" ? record.stars : undefined,
        monthlyPulls:
          typeof record.monthlyPulls === "number"
            ? record.monthlyPulls
            : undefined,
        changelog: parseStoredChangelog(record.changelog),
        architectures: parseStoredStringArray(record.architectures),
        port: record.port ?? undefined,
        path: record.path ?? undefined,
        website: record.website ?? undefined,
        repo: record.repo ?? undefined,
        composePath: record.composePath,
        container: (record as any)?.container ?? undefined,
        storeId: record.store?.id ?? undefined,
        storeName: record.store?.name ?? undefined,
        storeSlug: record.store?.slug ?? undefined,
        storeIsDefault: isProtectedStore(record.store),
      }));
      await logAction("appstore:list:done", { count: apps.length });
      return apps;
    } catch (error) {
      await logAction("appstore:list:error", {
        error: (error as Error)?.message || "unknown",
      });
      return [];
    }
  });
}

/**
 * Import a supported app store source into external-apps/<slug>
 * and persist store/app metadata to the database.
 */
export async function importAppStore(
  url: string,
  meta?: { name?: string; description?: string },
): Promise<{
  success: boolean;
  error?: string;
  storeId?: string;
  apps?: number;
  skipped?: boolean;
}> {
  if (!url || !url.startsWith("http")) {
    return { success: false, error: "Invalid store URL." };
  }

  if (isLinuxServerApiUrl(url)) {
    return importLinuxServerStore(url, meta);
  }

  return {
    success: false,
    error:
      "Unsupported store format. Provide a LinuxServer.io API endpoint instead.",
  };
}

async function importLinuxServerStore(
  url: string,
  meta?: { name?: string; description?: string },
): Promise<{
  success: boolean;
  error?: string;
  storeId?: string;
  apps?: number;
  skipped?: boolean;
}> {
  const storeSlug = slugify(url);
  const targetDir = path.join(STORE_ROOT, storeSlug);

  try {
    await logAction("appstore:import:linuxserver:start", { url, storeSlug });
    await fs.mkdir(STORE_ROOT, { recursive: true });

    const response = await fetch(url, {
      headers: { accept: "application/json" },
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error(
        `Failed to download LinuxServer catalog: ${response.statusText}`,
      );
    }

    const rawPayload = await response.text();
    const payloadHash = crypto
      .createHash("sha256")
      .update(rawPayload)
      .digest("hex");

    const existingStore = await prisma.store.findUnique({
      where: { slug: storeSlug },
    });
    const targetExists = await fs
      .stat(targetDir)
      .then(() => true)
      .catch(() => false);
    const hasStoredMetadata = existingStore
      ? Boolean(
          await prisma.app.findFirst({
            where: {
              storeId: existingStore.id,
              OR: [
                { stable: { not: null } },
                { stars: { not: null } },
                { releaseNotes: { not: null } },
              ],
            },
            select: { id: true },
          }),
        )
      : false;

    if (
      existingStore &&
      existingStore.manifestHash === payloadHash &&
      targetExists &&
      hasStoredMetadata
    ) {
      const appsCount = await prisma.app.count({
        where: { storeId: existingStore.id },
      });
      await logAction("appstore:import:linuxserver:skip-cache", {
        url,
        storeSlug,
        apps: appsCount,
      });
      return {
        success: true,
        storeId: storeSlug,
        apps: appsCount,
        skipped: true,
      };
    }

    await fs.rm(targetDir, { recursive: true, force: true });
    await fs.mkdir(targetDir, { recursive: true });

    const payload = JSON.parse(rawPayload) as unknown;
    console.log({ payload });
    const parsedApps = await parseLinuxServerStore(payload, targetDir);
    if (parsedApps.length === 0) {
      const rootKeys = isObject(payload)
        ? Object.keys(payload).slice(0, 8)
        : [];
      const dataKeys =
        isObject(payload) && isObject(payload.data)
          ? Object.keys(payload.data).slice(0, 8)
          : [];
      throw new Error(
        `No applications found in LinuxServer catalog payload. rootKeys=${rootKeys.join(",")} dataKeys=${dataKeys.join(",")}`,
      );
    }

    const store = await persistStoreApps({
      apps: parsedApps,
      format: "linuxserver",
      localPath: targetDir,
      manifestHash: payloadHash,
      name: meta?.name ?? "LinuxServer.io Catalog",
      slug: storeSlug,
      url,
      description: meta?.description ?? "Official LinuxServer.io image catalog",
    });

    await logAction("appstore:import:linuxserver:done", {
      url,
      storeSlug,
      apps: parsedApps.length,
    });
    return { success: true, storeId: store.slug, apps: parsedApps.length };
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to import LinuxServer catalog";
    await logAction("appstore:import:linuxserver:error", {
      url,
      error: message,
    });
    return { success: false, error: message };
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function persistStoreApps(options: {
  apps: App[];
  format: StoreFormat;
  localPath: string;
  manifestHash: string;
  name: string;
  slug: string;
  url: string;
  description?: string;
}) {
  const store = await prisma.store.upsert({
    where: { slug: options.slug },
    update: {
      url: options.url,
      name: options.name,
      description: options.description,
      localPath: options.localPath,
      manifestHash: options.manifestHash,
      format: options.format,
    },
    create: {
      slug: options.slug,
      url: options.url,
      name: options.name,
      description: options.description,
      localPath: options.localPath,
      manifestHash: options.manifestHash,
      format: options.format,
    },
  });

  // Merge dependencies into the container JSON so they get persisted in the DB
  const containerWithDeps = (app: App) => {
    const base = app.container ?? {};
    if (app.dependencies?.length) {
      return { ...base, dependencies: app.dependencies };
    }
    return base || undefined;
  };

  for (const app of options.apps) {
    const categories = app.category ?? [];
    const screenshots = app.screenshots ?? [];
    const developer =
      app.developer === undefined || app.developer === null
        ? null
        : String(app.developer);

    await prisma.app.upsert({
      where: { storeId_appId: { storeId: store.id, appId: app.id } },
      update: {
        title: app.title,
        name: app.name,
        icon: app.icon,
        tagline: app.tagline,
        overview: app.overview,
        category: categories,
        developer,
        screenshots,
        version: app.version,
        releaseNotes: app.releaseNotes ?? null,
        stable: typeof app.stable === "boolean" ? app.stable : null,
        deprecated: typeof app.deprecated === "boolean" ? app.deprecated : null,
        stars: typeof app.stars === "number" ? app.stars : null,
        monthlyPulls:
          typeof app.monthlyPulls === "number" ? app.monthlyPulls : null,
        changelog: (app.changelog ?? undefined) as never,
        architectures: (app.architectures ?? undefined) as never,
        port: Number.isFinite(app.port as number) ? (app.port as number) : null,
        path: app.path,
        website: app.website,
        repo: app.repo,
        composePath: app.composePath || "",
        container: (containerWithDeps(app) ?? undefined) as never,
      },
      create: {
        storeId: store.id,
        appId: app.id,
        title: app.title,
        name: app.name,
        icon: app.icon,
        tagline: app.tagline,
        overview: app.overview,
        category: categories,
        developer,
        screenshots,
        version: app.version,
        releaseNotes: app.releaseNotes ?? null,
        stable: typeof app.stable === "boolean" ? app.stable : null,
        deprecated: typeof app.deprecated === "boolean" ? app.deprecated : null,
        stars: typeof app.stars === "number" ? app.stars : null,
        monthlyPulls:
          typeof app.monthlyPulls === "number" ? app.monthlyPulls : null,
        changelog: (app.changelog ?? undefined) as never,
        architectures: (app.architectures ?? undefined) as never,
        port: Number.isFinite(app.port as number) ? (app.port as number) : null,
        path: app.path,
        website: app.website,
        repo: app.repo,
        composePath: app.composePath || "",
        container: (containerWithDeps(app) ?? undefined) as never,
      },
    });
  }

  const parsedIds = options.apps.map((app) => app.id);
  if (parsedIds.length > 0) {
    await prisma.app.deleteMany({
      where: {
        storeId: store.id,
        appId: { notIn: parsedIds },
      },
    });
  }

  return store;
}

/**
 * Best-effort bootstrap of the default LinuxServer.io catalog.
 */
export async function ensureDefaultLinuxServerStoreInstalled(): Promise<{
  success: boolean;
  skipped?: boolean;
  error?: string;
}> {
  try {
    await fs.mkdir(STORE_ROOT, { recursive: true });
    await logAction("appstore:bootstrap:linuxserver:start");
    const result = await importLinuxServerStore(DEFAULT_LINUXSERVER_STORE_URL, {
      name: DEFAULT_LINUXSERVER_STORE_NAME,
      description: DEFAULT_LINUXSERVER_STORE_DESCRIPTION,
    });

    return result.success
      ? { success: true, skipped: result.skipped }
      : { success: false, error: result.error };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    await logAction("appstore:bootstrap:linuxserver:error", {
      error: message,
    });
    return { success: false, error: message };
  }
}

async function importLocalStore(): Promise<{
  success: boolean;
  apps?: number;
  skipped?: boolean;
  error?: string;
}> {
  try {
    const apps = await parseLocalStore(LOCAL_STORE_DIR);
    if (apps.length === 0) {
      return { success: true, apps: 0, skipped: true };
    }

    await persistStoreApps({
      apps,
      format: "local",
      localPath: LOCAL_STORE_DIR,
      manifestHash: "local",
      name: LOCAL_STORE_NAME,
      slug: LOCAL_STORE_SLUG,
      url: LOCAL_STORE_URL,
      description: LOCAL_STORE_DESCRIPTION,
    });

    return { success: true, apps: apps.length };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to import local store";
    return { success: false, error: message };
  }
}

/**
 * Ensure the default store exists (LinuxServer.io).
 */
export async function ensureDefaultStoresInstalled(): Promise<void> {
  const store = await prisma.store.findFirst({
    where: {
      OR: [
        { slug: DEFAULT_LINUXSERVER_STORE_SLUG },
        { url: DEFAULT_LINUXSERVER_STORE_URL },
      ],
    },
    include: { _count: { select: { apps: true } } },
  });

  if (!store || store._count.apps === 0) {
    await ensureDefaultLinuxServerStoreInstalled().catch((error) =>
      console.error(
        "[AppStore] Failed to bootstrap LinuxServer catalog:",
        error,
      ),
    );
  }

  await importLocalStore().catch((error) =>
    console.error("[AppStore] Failed to bootstrap local store:", error),
  );
}

export const getCommunityStores = async (): Promise<CommunityStore[]> => [];

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function isProtectedStore(
  store:
    | {
        slug: string;
        url?: string | null;
      }
    | null
    | undefined,
): boolean {
  if (!store) return false;
  return (
    store.slug === DEFAULT_LINUXSERVER_STORE_SLUG ||
    store.url === DEFAULT_LINUXSERVER_STORE_URL ||
    store.slug === LOCAL_STORE_SLUG ||
    store.url === LOCAL_STORE_URL
  );
}

/**
 * Get details about all imported stores.
 */
export async function getImportedStoreDetails(): Promise<
  {
    slug: string;
    name: string;
    description: string | null;
    url: string | null;
    format: string;
    isDefault: boolean;
    appCount: number;
  }[]
> {
  return withActionLogging("appstore:getStoreDetails", async () => {
    try {
      await ensureDefaultStoresInstalled();
      const stores = await prisma.store.findMany({
        include: { _count: { select: { apps: true } } },
      });

      return stores.map((store) => ({
        slug: store.slug,
        name: store.name ?? store.slug,
        description: store.description,
        url: store.url,
        format: store.format,
        isDefault: isProtectedStore(store),
        appCount: store._count.apps,
      }));
    } catch (error) {
      console.error("Failed to get store details:", error);
      return [];
    }
  });
}

/**
 * Refresh all imported stores by re-downloading and re-parsing them.
 */
export async function refreshAllStores(): Promise<{
  success: boolean;
  results: {
    slug: string;
    name: string;
    success: boolean;
    apps?: number;
    error?: string;
    skipped?: boolean;
  }[];
}> {
  return withActionLogging("appstore:refreshAll", async () => {
    await logAction("appstore:refreshAll:start");
    const results: {
      slug: string;
      name: string;
      success: boolean;
      apps?: number;
      error?: string;
      skipped?: boolean;
    }[] = [];

    try {
      const stores = await prisma.store.findMany();

      for (const store of stores) {
        if (!store.url) {
          results.push({
            slug: store.slug,
            name: store.name ?? store.slug,
            success: false,
            error: "No URL",
          });
          continue;
        }

        try {
          const result =
            store.url === LOCAL_STORE_URL
              ? await importLocalStore()
              : await importAppStore(store.url, {
                  name: store.name ?? undefined,
                  description: store.description ?? undefined,
                });

          results.push({
            slug: store.slug,
            name: store.name ?? store.slug,
            success: result.success,
            apps: result.apps,
            error: result.error,
            skipped: result.skipped,
          });
        } catch (error: any) {
          results.push({
            slug: store.slug,
            name: store.name ?? store.slug,
            success: false,
            error: error?.message || "Unknown error",
          });
        }
      }

      await logAction("appstore:refreshAll:done", { results });
      return { success: true, results };
    } catch (error: any) {
      await logAction("appstore:refreshAll:error", {
        error: error?.message || "unknown",
      });
      return { success: false, results };
    }
  });
}

/**
 * Read the docker-compose.yml content for a given app.
 * Returns the raw YAML content as a string.
 */
export async function getAppComposeContent(
  composePath: string,
): Promise<{ success: boolean; content?: string; error?: string }> {
  try {
    if (!composePath) {
      return { success: false, error: "No compose path provided" };
    }

    let fullPath = composePath;
    if (!path.isAbsolute(composePath)) {
      fullPath = path.join(process.cwd(), composePath);
    }

    const cwd = process.cwd();
    const resolvedPath = path.resolve(fullPath);
    if (!resolvedPath.startsWith(cwd) && !resolvedPath.startsWith("/DATA")) {
      return { success: false, error: "Invalid compose path" };
    }

    const content = await fs.readFile(resolvedPath, "utf-8");
    return { success: true, content };
  } catch (error) {
    console.error("Failed to read compose file:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to read compose file",
    };
  }
}

/**
 * Fetch docker-compose content for an installed app by its appId.
 * Looks up the app in the InstalledApp DB, with fallback to App table for composePath.
 */
export async function getComposeForApp(appId: string): Promise<{
  success: boolean;
  content?: string;
  appTitle?: string;
  appIcon?: string;
  storeId?: string;
  webUIPort?: string;
  container?: {
    image: string;
    ports: { container: string; published: string }[];
    volumes: { source: string; container: string }[];
    environment: { key: string; value: string }[];
  };
  error?: string;
}> {
  try {
    if (!appId) {
      return { success: false, error: "Missing appId" };
    }

    const installed = await prisma.installedApp.findFirst({
      where: { appId },
      orderBy: { updatedAt: "desc" },
    });

    if (!installed) {
      return { success: false, error: "App metadata not found" };
    }

    const config = installed.installConfig as Record<string, unknown> | null;
    const composePath = (config?.composePath as string) ?? undefined;

    let content: string | undefined;

    // Try reading compose from InstalledApp.installConfig.composePath
    if (composePath) {
      const composeResult = await getAppComposeContent(composePath);
      if (composeResult.success && composeResult.content) {
        content = composeResult.content;
      }
    }

    // Fallback: if composePath was missing or pointed to deleted /tmp file,
    // look up App.composePath from the store App table
    if (!content) {
      const appRecord = await prisma.app.findFirst({
        where: { appId },
        orderBy: { createdAt: "desc" },
        select: { composePath: true },
      });
      if (appRecord?.composePath) {
        const fallbackResult = await getAppComposeContent(
          appRecord.composePath,
        );
        if (fallbackResult.success && fallbackResult.content) {
          content = fallbackResult.content;
        }
      }
    }

    const container =
      (installed.container as Record<string, unknown>) ?? undefined;

    if (!content && !container) {
      return {
        success: false,
        error: "No compose file or container config found for this app",
      };
    }

    const webUIPort = config?.webUIPort
      ? String(config.webUIPort)
      : undefined;

    return {
      success: true,
      content,
      appTitle: installed.name || installed.appId,
      appIcon: installed.icon || undefined,
      storeId: installed.storeId || undefined,
      webUIPort,
      container: (container as any) || undefined,
    };
  } catch (error) {
    console.error("Failed to load compose for app:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to load compose",
    };
  }
}

/**
 * Return media assets (screenshots/thumbnail/icon) for an app.
 * Falls back to parsing the compose manifest when DB data is missing.
 */
export async function getAppMedia(appId: string): Promise<{
  success: boolean;
  screenshots: string[];
  thumbnail?: string;
  icon?: string;
  error?: string;
}> {
  try {
    if (!appId)
      return { success: false, screenshots: [], error: "Missing appId" };

    const app = await prisma.app.findFirst({
      where: { appId },
      include: { store: true },
    });

    if (!app) {
      return {
        success: false,
        screenshots: [],
        error: "App metadata not found",
      };
    }

    const baseScreens =
      Array.isArray(app.screenshots) && app.screenshots.length > 0
        ? (app.screenshots as string[])
        : [];

    const screenshots = baseScreens;
    const thumbnail: string | undefined = undefined;

    return {
      success: true,
      screenshots,
      thumbnail,
      icon: app.icon,
    };
  } catch (error) {
    console.error("[appstore] getAppMedia error:", error);
    return {
      success: false,
      screenshots: [],
      error: error instanceof Error ? error.message : "Failed to load media",
    };
  }
}
