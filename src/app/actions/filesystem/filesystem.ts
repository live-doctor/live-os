/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { execAsync } from "@/lib/exec";
import { ensureHomeRoot, validatePath } from "@/modules/files/domain/path-guard";
import {
  copyItemsService,
  createDirectoryService,
  createFileService,
  deleteItemService,
  getDiskUsageService,
  moveItemsService,
  readFileContentService,
  renameItemService,
  writeFileContentService,
} from "@/modules/files/service/files-ops.service";
import { readDirectoryService } from "@/modules/files/service/files-list.service";
import {
  emptyTrashService,
  getTrashInfoService,
  getTrashPathService,
  permanentDeleteService,
  trashItemService,
} from "@/modules/files/service/files-trash.service";
import fs from "fs/promises";
import path from "path";

export interface FileSystemItem {
  name: string;
  path: string;
  type: "file" | "directory";
  size: number;
  modified: number;
  permissions: string;
  isHidden: boolean;
  isMount?: boolean;
  displayName?: string;
}

export interface DirectoryContent {
  currentPath: string;
  items: FileSystemItem[];
  parent: string | null;
}

export type DefaultDirectory = {
  name: string;
  path: string;
};

export interface SearchResult {
  items: FileSystemItem[];
  total: number;
  hasMore: boolean;
}

const DEFAULT_DIRECTORIES = [
  "AppData",
  "Downloads",
  "Documents",
  "Photos",
  "Devices",
] as const;

export async function getHomeRoot(): Promise<string> {
  // Reuse the same resolution logic used by the filesystem actions
  return ensureHomeRoot();
}

async function ensureDefaultDirectories(): Promise<DefaultDirectory[]> {
  const directories: DefaultDirectory[] = [];
  const homeRoot = await ensureHomeRoot();

  for (const dir of DEFAULT_DIRECTORIES) {
    const target = path.join(homeRoot, dir);
    directories.push({ name: dir, path: target });
    try {
      await fs.mkdir(target, { recursive: true });
    } catch {
      // Ignore if it already exists or cannot be created
    }
  }

  return directories;
}

/**
 * Get directory contents
 */
export async function readDirectory(
  dirPath: string,
): Promise<DirectoryContent> {
  return readDirectoryService(dirPath);
}

/**
 * Create a new directory
 */
export async function createDirectory(
  parentPath: string,
  dirName: string,
): Promise<{ success: boolean; error?: string }> {
  return createDirectoryService(parentPath, dirName);
}

/**
 * Delete a file or directory
 */
export async function deleteItem(
  itemPath: string,
): Promise<{ success: boolean; error?: string }> {
  return deleteItemService(itemPath);
}

/**
 * Rename a file or directory
 */
export async function renameItem(
  oldPath: string,
  newName: string,
): Promise<{ success: boolean; error?: string }> {
  return renameItemService(oldPath, newName);
}

/**
 * Create an empty file
 */
export async function createFile(
  parentPath: string,
  fileName: string,
): Promise<{ success: boolean; error?: string }> {
  return createFileService(parentPath, fileName);
}

export async function writeFileContent(
  filePath: string,
  content: string,
): Promise<{ success: boolean; error?: string }> {
  return writeFileContentService(filePath, content);
}

/**
 * Get disk usage for a directory
 */
export async function getDiskUsage(
  dirPath: string,
): Promise<{ size: string; error?: string }> {
  return getDiskUsageService(dirPath);
}

/**
 * Read file content (for text files)
 */
export async function readFileContent(
  filePath: string,
): Promise<{ content: string; error?: string }> {
  return readFileContentService(filePath);
}

export async function getDefaultDirectories(): Promise<{
  home: string;
  directories: DefaultDirectory[];
}> {
  const home = await ensureHomeRoot();
  const directories = await ensureDefaultDirectories();
  return { home, directories };
}

export async function openPath(
  targetPath: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const { valid, sanitized } = await validatePath(targetPath);
    if (!valid) {
      return { success: false, error: "Invalid path" };
    }

    const platform = process.platform;
    const command =
      platform === "darwin"
        ? `open "${sanitized}"`
        : platform === "win32"
          ? `start "" "${sanitized}"`
          : `xdg-open "${sanitized}"`;

    await execAsync(command, {
      shell: platform === "win32" ? "cmd.exe" : undefined,
    });

    return { success: true };
  } catch (error: any) {
    console.error("Open path error:", error);
    return { success: false, error: error.message || "Failed to open path" };
  }
}

/**
 * Move items to a destination directory
 */
export async function moveItems(
  sourcePaths: string[],
  destPath: string,
): Promise<{ success: boolean; error?: string }> {
  return moveItemsService(sourcePaths, destPath);
}

/**
 * Copy items to a destination directory
 */
export async function copyItems(
  sourcePaths: string[],
  destPath: string,
): Promise<{ success: boolean; error?: string }> {
  return copyItemsService(sourcePaths, destPath);
}

/**
 * Get trash directory path
 */
export async function getTrashPath(): Promise<string> {
  return getTrashPathService();
}

/**
 * Get trash info (path, item count, total size)
 */
export async function getTrashInfo(): Promise<{
  path: string;
  itemCount: number;
  totalSize: number;
}> {
  return getTrashInfoService();
}

/**
 * Move item to trash (.Trash directory)
 */
export async function trashItem(
  itemPath: string,
): Promise<{ success: boolean; error?: string }> {
  return trashItemService(itemPath);
}

/**
 * Empty the trash (permanently delete all items)
 */
export async function emptyTrash(): Promise<{
  success: boolean;
  deletedCount: number;
  error?: string;
}> {
  return emptyTrashService();
}

/**
 * Permanently delete item (bypasses trash)
 */
export async function permanentDelete(
  itemPath: string,
): Promise<{ success: boolean; error?: string }> {
  return permanentDeleteService(itemPath);
}

/**
 * Compress items into a tar.gz archive
 */
export async function compressItems(
  paths: string[],
  outputName?: string,
): Promise<{ success: boolean; outputPath?: string; error?: string }> {
  try {
    if (paths.length === 0) {
      return { success: false, error: "No items to compress" };
    }

    // Validate all paths
    const sanitizedPaths: string[] = [];
    for (const p of paths) {
      const { valid, sanitized } = await validatePath(p);
      if (!valid) {
        return { success: false, error: `Invalid path: ${p}` };
      }
      sanitizedPaths.push(sanitized);
    }

    // Determine output directory and archive name
    const firstPath = sanitizedPaths[0];
    const parentDir = path.dirname(firstPath);
    const archiveName =
      outputName ||
      (paths.length === 1
        ? `${path.basename(firstPath)}.tar.gz`
        : `archive-${Date.now()}.tar.gz`);
    const archivePath = path.join(parentDir, archiveName);

    // Create file list for tar
    const fileNames = sanitizedPaths.map((p) => path.basename(p));

    // Use tar to create archive
    const tarCommand = `cd "${parentDir}" && tar -czvf "${archiveName}" ${fileNames.map((f) => `"${f}"`).join(" ")}`;
    await execAsync(tarCommand);

    return { success: true, outputPath: archivePath };
  } catch (error: any) {
    console.error("Compress items error:", error);
    return {
      success: false,
      error: error.message || "Failed to compress items",
    };
  }
}

/**
 * Extract an archive to the same directory or specified destination
 */
/**
 * Search for files and directories by name
 */
export async function searchFiles(
  query: string,
  searchPath?: string,
  limit: number = 50,
): Promise<{ results: SearchResult; error?: string }> {
  try {
    if (!query || query.trim().length < 2) {
      return { results: { items: [], total: 0, hasMore: false } };
    }

    // Default to home root if no path specified
    const homeRoot = await ensureHomeRoot();
    const basePath = searchPath || homeRoot;

    const { valid, sanitized } = await validatePath(basePath);
    if (!valid) {
      return {
        results: { items: [], total: 0, hasMore: false },
        error: "Invalid search path",
      };
    }

    // Use find command with case-insensitive name matching
    // Limit depth to prevent searching too deep and limit results
    const escapedQuery = query.replace(/['"\\]/g, "\\$&");
    const command = `find "${sanitized}" -maxdepth 10 -iname "*${escapedQuery}*" 2>/dev/null | head -${limit + 1}`;

    const { stdout } = await execAsync(command, { timeout: 10000 });
    const paths = stdout.trim().split("\n").filter(Boolean);

    const hasMore = paths.length > limit;
    const limitedPaths = paths.slice(0, limit);

    // Get details for each result
    const items: (FileSystemItem | null)[] = await Promise.all(
      limitedPaths.map(async (itemPath) => {
        try {
          const itemStats = await fs.stat(itemPath);
          const name = path.basename(itemPath);
          const mode = itemStats.mode;
          const permissions = (mode & parseInt("777", 8)).toString(8);

          return {
            name,
            path: itemPath,
            type: itemStats.isDirectory() ? "directory" : "file",
            size: itemStats.size,
            modified: itemStats.mtimeMs,
            permissions,
            isHidden: name.startsWith("."),
          } as FileSystemItem;
        } catch {
          return null;
        }
      }),
    );

    const validItems = items
      .filter((item): item is FileSystemItem => item !== null)
      .sort((a, b) => {
        // Prioritize exact matches, then sort by name
        const aExact = a.name.toLowerCase() === query.toLowerCase();
        const bExact = b.name.toLowerCase() === query.toLowerCase();
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;

        // Then directories first
        if (a.type !== b.type) {
          return a.type === "directory" ? -1 : 1;
        }

        return a.name.localeCompare(b.name);
      });

    return {
      results: {
        items: validItems,
        total: validItems.length,
        hasMore,
      },
    };
  } catch (error: any) {
    console.error("Search files error:", error);
    return {
      results: { items: [], total: 0, hasMore: false },
      error: error.message || "Search failed",
    };
  }
}

export async function uncompressArchive(
  archivePath: string,
  destPath?: string,
): Promise<{ success: boolean; outputPath?: string; error?: string }> {
  try {
    const { valid, sanitized } = await validatePath(archivePath);
    if (!valid) {
      return { success: false, error: "Invalid archive path" };
    }

    // Check if file exists
    const stats = await fs.stat(sanitized);
    if (!stats.isFile()) {
      return { success: false, error: "Not a file" };
    }

    // Determine destination directory
    let outputDir = destPath;
    if (!outputDir) {
      // Create a directory with the archive name (without extension)
      const archiveName = path.basename(sanitized);
      const parentDir = path.dirname(sanitized);

      // Remove common archive extensions
      const baseName = archiveName
        .replace(/\.tar\.gz$/i, "")
        .replace(/\.tgz$/i, "")
        .replace(/\.tar\.bz2$/i, "")
        .replace(/\.tbz2$/i, "")
        .replace(/\.tar\.xz$/i, "")
        .replace(/\.txz$/i, "")
        .replace(/\.tar$/i, "")
        .replace(/\.zip$/i, "")
        .replace(/\.7z$/i, "")
        .replace(/\.rar$/i, "")
        .replace(/\.gz$/i, "")
        .replace(/\.bz2$/i, "")
        .replace(/\.xz$/i, "");

      outputDir = path.join(parentDir, baseName);
    }

    // Validate and create output directory
    const { valid: destValid, sanitized: destSanitized } =
      await validatePath(outputDir);
    if (!destValid) {
      return { success: false, error: "Invalid destination path" };
    }
    await fs.mkdir(destSanitized, { recursive: true });

    // Determine the appropriate extraction command based on file extension
    const lowerPath = sanitized.toLowerCase();
    let command: string;

    if (lowerPath.endsWith(".tar.gz") || lowerPath.endsWith(".tgz")) {
      command = `tar -xzvf "${sanitized}" -C "${destSanitized}"`;
    } else if (lowerPath.endsWith(".tar.bz2") || lowerPath.endsWith(".tbz2")) {
      command = `tar -xjvf "${sanitized}" -C "${destSanitized}"`;
    } else if (lowerPath.endsWith(".tar.xz") || lowerPath.endsWith(".txz")) {
      command = `tar -xJvf "${sanitized}" -C "${destSanitized}"`;
    } else if (lowerPath.endsWith(".tar")) {
      command = `tar -xvf "${sanitized}" -C "${destSanitized}"`;
    } else if (lowerPath.endsWith(".zip")) {
      command = `unzip -o "${sanitized}" -d "${destSanitized}"`;
    } else if (lowerPath.endsWith(".gz")) {
      // Single file gzip
      const outputFile = path.join(
        destSanitized,
        path.basename(sanitized, ".gz"),
      );
      command = `gunzip -c "${sanitized}" > "${outputFile}"`;
    } else if (lowerPath.endsWith(".bz2")) {
      const outputFile = path.join(
        destSanitized,
        path.basename(sanitized, ".bz2"),
      );
      command = `bunzip2 -c "${sanitized}" > "${outputFile}"`;
    } else if (lowerPath.endsWith(".xz")) {
      const outputFile = path.join(
        destSanitized,
        path.basename(sanitized, ".xz"),
      );
      command = `xz -dc "${sanitized}" > "${outputFile}"`;
    } else if (lowerPath.endsWith(".7z")) {
      command = `7z x "${sanitized}" -o"${destSanitized}" -y`;
    } else if (lowerPath.endsWith(".rar")) {
      command = `unrar x "${sanitized}" "${destSanitized}/"`;
    } else {
      return { success: false, error: "Unsupported archive format" };
    }

    await execAsync(command);

    return { success: true, outputPath: destSanitized };
  } catch (error: any) {
    console.error("Uncompress archive error:", error);
    return {
      success: false,
      error: error.message || "Failed to extract archive",
    };
  }
}
