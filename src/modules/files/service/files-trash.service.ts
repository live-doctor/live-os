import fs from "fs/promises";
import path from "path";
import { checkMutationPolicy } from "../domain/operations-policy";
import { ensureHomeRoot, validatePath } from "../domain/path-guard";
import type { ActionResult, EmptyTrashResult, TrashInfo } from "../domain/files.types";

function withDuplicateSuffix(targetPath: string, count: number): string {
  const ext = path.extname(targetPath);
  const basename = path.basename(targetPath, ext);
  return path.join(path.dirname(targetPath), `${basename} (${count})${ext}`);
}

export async function getTrashPathService(): Promise<string> {
  const homeRoot = await ensureHomeRoot();
  return path.join(homeRoot, ".Trash");
}

export async function getTrashInfoService(): Promise<TrashInfo> {
  const trashPath = await getTrashPathService();
  try {
    await fs.mkdir(trashPath, { recursive: true });
    const entries = await fs.readdir(trashPath);

    let totalSize = 0;
    for (const entry of entries) {
      try {
        const entryPath = path.join(trashPath, entry);
        const stats = await fs.stat(entryPath);
        totalSize += stats.size;
      } catch {
        // Ignore single unreadable entry
      }
    }

    return { path: trashPath, itemCount: entries.length, totalSize };
  } catch {
    return { path: trashPath, itemCount: 0, totalSize: 0 };
  }
}

export async function trashItemService(itemPath: string): Promise<ActionResult> {
  const homeRoot = await ensureHomeRoot();
  const { valid, sanitized } = await validatePath(itemPath);
  if (!valid) return { success: false, error: "Invalid path" };

  const policy = checkMutationPolicy("trash", sanitized, homeRoot);
  if (!policy.allowed) return { success: false, error: policy.error };

  const trashDir = await getTrashPathService();
  await fs.mkdir(trashDir, { recursive: true });

  const basename = path.basename(sanitized);
  let trashPath = path.join(trashDir, basename);
  let duplicateCounter = 1;

  while (true) {
    try {
      await fs.access(trashPath);
      trashPath = withDuplicateSuffix(trashPath, duplicateCounter);
      duplicateCounter += 1;
    } catch {
      break;
    }
  }

  try {
    await fs.rename(sanitized, trashPath);
    return { success: true };
  } catch (error: unknown) {
    const moveError = error as { code?: string };
    if (moveError.code !== "EXDEV") {
      const message =
        error instanceof Error ? error.message : "Failed to move item to trash";
      return { success: false, error: message };
    }
  }

  try {
    await fs.cp(sanitized, trashPath, { recursive: true, force: true });
    const stats = await fs.lstat(sanitized);
    if (stats.isDirectory()) {
      await fs.rm(sanitized, { recursive: true, force: true });
    } else {
      await fs.unlink(sanitized);
    }
    return { success: true };
  } catch (copyError: unknown) {
    const message =
      copyError instanceof Error
        ? copyError.message
        : "Failed to move item to trash";
    return { success: false, error: message };
  }
}

export async function emptyTrashService(): Promise<EmptyTrashResult> {
  const trashDir = await getTrashPathService();
  let deletedCount = 0;

  try {
    const entries = await fs.readdir(trashDir);
    for (const entry of entries) {
      const entryPath = path.join(trashDir, entry);
      try {
        const stats = await fs.stat(entryPath);
        if (stats.isDirectory()) {
          await fs.rm(entryPath, { recursive: true, force: true });
        } else {
          await fs.unlink(entryPath);
        }
        deletedCount += 1;
      } catch {
        // Continue deleting other entries
      }
    }
    return { success: true, deletedCount };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to empty trash";
    return { success: false, deletedCount, error: message };
  }
}

export async function permanentDeleteService(
  itemPath: string,
): Promise<ActionResult> {
  const homeRoot = await ensureHomeRoot();
  const { valid, sanitized } = await validatePath(itemPath);
  if (!valid) return { success: false, error: "Invalid path" };

  const policy = checkMutationPolicy("permanent-delete", sanitized, homeRoot);
  if (!policy.allowed) return { success: false, error: policy.error };

  const stats = await fs.stat(sanitized);
  if (stats.isDirectory()) {
    await fs.rm(sanitized, { recursive: true, force: true });
  } else {
    await fs.unlink(sanitized);
  }
  return { success: true };
}

