import fs from "fs/promises";
import path from "path";
import type { DirectoryContent, FileSystemItem } from "../domain/files.types";
import { ensureHomeRoot, validatePath } from "../domain/path-guard";

const DEFAULT_DIRECTORIES = [
  "AppData",
  "Downloads",
  "Documents",
  "Photos",
  "Devices",
] as const;

async function ensureDefaultDirectories(): Promise<void> {
  const homeRoot = await ensureHomeRoot();
  for (const directoryName of DEFAULT_DIRECTORIES) {
    const directoryPath = path.join(homeRoot, directoryName);
    await fs.mkdir(directoryPath, { recursive: true });
  }
}

async function isMountpoint(dirPath: string): Promise<boolean> {
  try {
    const stats = await fs.lstat(dirPath);
    const parentStats = await fs.lstat(path.join(dirPath, ".."));
    return stats.dev !== parentStats.dev;
  } catch {
    return false;
  }
}

async function getMountLabels(): Promise<Map<string, string>> {
  const labelsByPath = new Map<string, string>();
  try {
    const storePath = path.join(
      await ensureHomeRoot(),
      "Devices",
      ".network-shares.json",
    );
    const raw = await fs.readFile(storePath, "utf-8");
    const parsed = JSON.parse(raw) as {
      host: string;
      share: string;
      mountPath: string;
    }[];

    if (!Array.isArray(parsed)) {
      return labelsByPath;
    }

    const hostCounts = parsed.reduce<Record<string, number>>((acc, share) => {
      if (share?.host) {
        acc[share.host] = (acc[share.host] || 0) + 1;
      }
      return acc;
    }, {});

    for (const share of parsed) {
      if (!share?.mountPath || !share?.host) {
        continue;
      }
      const label =
        hostCounts[share.host] > 1
          ? `${share.host}/${share.share || ""}`.replace(/\/$/, "")
          : share.host;
      labelsByPath.set(path.resolve(share.mountPath), label);
    }
  } catch {
    return labelsByPath;
  }

  return labelsByPath;
}

export async function readDirectoryService(
  dirPath: string,
): Promise<DirectoryContent> {
  await ensureDefaultDirectories();
  const mountLabels = await getMountLabels();
  const homeRoot = await ensureHomeRoot();

  const { valid, sanitized } = await validatePath(dirPath);
  if (!valid) {
    throw new Error("Invalid path");
  }

  const directoryStats = await fs.stat(sanitized);
  if (!directoryStats.isDirectory()) {
    throw new Error("Not a directory");
  }

  const entries = await fs.readdir(sanitized, { withFileTypes: true });
  const items: (FileSystemItem | null)[] = await Promise.all(
    entries.map(async (entry) => {
      try {
        const itemPath = path.join(sanitized, entry.name);
        const itemStats = await fs.stat(itemPath);
        const permissions = (itemStats.mode & parseInt("777", 8)).toString(8);
        const mountPoint = entry.isDirectory()
          ? await isMountpoint(itemPath)
          : false;
        const displayName = mountPoint
          ? mountLabels.get(path.resolve(itemPath))
          : undefined;

        return {
          name: entry.name,
          path: itemPath,
          type: entry.isDirectory() ? "directory" : "file",
          size: itemStats.size,
          modified: itemStats.mtimeMs,
          permissions,
          isHidden: entry.name.startsWith("."),
          isMount: Boolean(displayName),
          displayName,
        } as FileSystemItem;
      } catch {
        return null;
      }
    }),
  );

  const validItems = items
    .filter((item): item is FileSystemItem => item !== null)
    .sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === "directory" ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });

  return {
    currentPath: sanitized,
    items: validItems,
    parent: sanitized === homeRoot ? null : path.dirname(sanitized),
  };
}

