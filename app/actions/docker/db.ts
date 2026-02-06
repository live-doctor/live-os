"use server";

import prisma from "@/lib/prisma";
import type { Prisma } from "@/app/generated/prisma/client";
import { DEFAULT_APP_ICON, FALLBACK_APP_NAME } from "./utils";

/**
 * Get app metadata from database
 */
export async function getAppMeta(
  appId: string,
  override?: { name?: string; icon?: string }
) {
  const appMeta = await prisma.app.findFirst({
    where: { appId },
    orderBy: { createdAt: "desc" },
  });

  return {
    name:
      override?.name ||
      appMeta?.title ||
      appMeta?.name ||
      appId ||
      FALLBACK_APP_NAME,
    icon: override?.icon || appMeta?.icon || DEFAULT_APP_ICON,
  };
}

/**
 * Record an installed app in the database
 */
export async function recordInstalledApp(
  appId: string,
  containerName: string,
  override?: { name?: string; icon?: string },
  installConfig?: Record<string, unknown>,
  storeId?: string,
  container?: Record<string, unknown>,
  version?: string,
): Promise<void> {
  const meta = await getAppMeta(appId, override);

  // Get version from store if not provided
  let appVersion = version;
  if (!appVersion) {
    const storeApp = await prisma.app.findFirst({
      where: { appId },
      orderBy: { createdAt: "desc" },
      select: { version: true },
    });
    appVersion = storeApp?.version ?? undefined;
  }

  await prisma.installedApp.upsert({
    where: { containerName },
    update: {
      appId,
      name: meta.name,
      icon: meta.icon,
      ...(installConfig !== undefined && {
        installConfig: installConfig as Prisma.InputJsonValue,
      }),
      ...(storeId !== undefined && { storeId }),
      ...(container !== undefined && {
        container: container as Prisma.InputJsonValue,
      }),
      ...(appVersion !== undefined && { version: appVersion }),
    },
    create: {
      appId,
      name: meta.name,
      icon: meta.icon,
      containerName,
      ...(installConfig !== undefined && {
        installConfig: installConfig as Prisma.InputJsonValue,
      }),
      ...(storeId !== undefined && { storeId }),
      ...(container !== undefined && {
        container: container as Prisma.InputJsonValue,
      }),
      ...(appVersion !== undefined && { version: appVersion }),
    },
  });
}

/**
 * Get the install configuration for an app
 */
export async function getInstallConfig(
  appId: string,
): Promise<Record<string, unknown> | null> {
  try {
    const record = await prisma.installedApp.findFirst({
      where: { appId },
      orderBy: { updatedAt: "desc" },
      select: { installConfig: true },
    });
    return (record?.installConfig as Record<string, unknown>) ?? null;
  } catch {
    return null;
  }
}

/**
 * Get recorded container name for an app
 */
export async function getRecordedContainerName(appId: string): Promise<string | null> {
  try {
    const record = await prisma.installedApp.findFirst({
      where: { appId },
      orderBy: { updatedAt: "desc" },
      select: { containerName: true },
    });
    return record?.containerName || null;
  } catch {
    return null;
  }
}

/**
 * Remove installed app record from database
 */
export async function removeInstalledAppRecord(containerName: string): Promise<void> {
  await prisma.installedApp.delete({ where: { containerName } }).catch(() => null);
}

/**
 * Get all installed app records from database
 */
export async function getInstalledAppRecords() {
  return prisma.installedApp.findMany({
    include: { store: { select: { id: true, slug: true, format: true } } },
  });
}

/**
 * Get all app metadata records from database
 */
export async function getAllAppMeta() {
  return prisma.app.findMany({
    include: { store: { select: { slug: true } } },
  });
}

/**
 * Compare two semantic version strings
 * Returns: 1 if a > b, -1 if a < b, 0 if equal
 */
function compareVersions(a: string, b: string): number {
  const normalize = (v: string) =>
    v
      .replace(/^v/i, "")
      .split(".")
      .map((n) => parseInt(n, 10) || 0);

  const partsA = normalize(a);
  const partsB = normalize(b);
  const len = Math.max(partsA.length, partsB.length);

  for (let i = 0; i < len; i++) {
    const diff = (partsA[i] ?? 0) - (partsB[i] ?? 0);
    if (diff !== 0) return diff > 0 ? 1 : -1;
  }
  return 0;
}

export interface AppUpdateInfo {
  appId: string;
  containerName: string;
  name: string;
  icon: string;
  installedVersion: string | null;
  availableVersion: string | null;
  hasUpdate: boolean;
  storeId: string | null;
}

/**
 * Check for updates for all installed apps
 */
export async function checkAllAppUpdates(): Promise<AppUpdateInfo[]> {
  const installedApps = await prisma.installedApp.findMany({
    select: {
      appId: true,
      containerName: true,
      name: true,
      icon: true,
      version: true,
      storeId: true,
    },
  });

  const results: AppUpdateInfo[] = [];

  for (const installed of installedApps) {
    // Find the store app to get the latest version
    const storeApp = await prisma.app.findFirst({
      where: {
        appId: installed.appId,
        ...(installed.storeId && { storeId: installed.storeId }),
      },
      orderBy: { updatedAt: "desc" },
      select: { version: true },
    });

    const installedVersion = installed.version;
    const availableVersion = storeApp?.version ?? null;

    let hasUpdate = false;
    if (installedVersion && availableVersion) {
      hasUpdate = compareVersions(availableVersion, installedVersion) > 0;
    } else if (!installedVersion && availableVersion) {
      // If no installed version recorded, assume update available
      hasUpdate = true;
    }

    results.push({
      appId: installed.appId,
      containerName: installed.containerName,
      name: installed.name,
      icon: installed.icon,
      installedVersion,
      availableVersion,
      hasUpdate,
      storeId: installed.storeId,
    });
  }

  return results;
}

/**
 * Check for update for a specific installed app
 */
export async function checkAppUpdate(appId: string): Promise<AppUpdateInfo | null> {
  const installed = await prisma.installedApp.findFirst({
    where: { appId },
    orderBy: { updatedAt: "desc" },
    select: {
      appId: true,
      containerName: true,
      name: true,
      icon: true,
      version: true,
      storeId: true,
    },
  });

  if (!installed) return null;

  const storeApp = await prisma.app.findFirst({
    where: {
      appId: installed.appId,
      ...(installed.storeId && { storeId: installed.storeId }),
    },
    orderBy: { updatedAt: "desc" },
    select: { version: true },
  });

  const installedVersion = installed.version;
  const availableVersion = storeApp?.version ?? null;

  let hasUpdate = false;
  if (installedVersion && availableVersion) {
    hasUpdate = compareVersions(availableVersion, installedVersion) > 0;
  } else if (!installedVersion && availableVersion) {
    hasUpdate = true;
  }

  return {
    appId: installed.appId,
    containerName: installed.containerName,
    name: installed.name,
    icon: installed.icon,
    installedVersion,
    availableVersion,
    hasUpdate,
    storeId: installed.storeId,
  };
}

/**
 * Get apps with available updates
 */
export async function getAppsWithUpdates(): Promise<AppUpdateInfo[]> {
  const allUpdates = await checkAllAppUpdates();
  return allUpdates.filter((app) => app.hasUpdate);
}
