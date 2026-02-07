import fs from "fs/promises";
import path from "path";
import { execAsync } from "@/lib/exec";
import { checkMutationPolicy } from "../domain/operations-policy";
import { ensureHomeRoot, isSafeEntryName, validatePath } from "../domain/path-guard";
import type {
  ActionResult,
  DiskUsageResult,
  FileContentResult,
} from "../domain/files.types";

function nextDuplicatePath(basePath: string, counter: number): string {
  const ext = path.extname(basePath);
  const nameWithoutExt = path.basename(basePath, ext);
  return path.join(path.dirname(basePath), `${nameWithoutExt} (${counter})${ext}`);
}

export async function createDirectoryService(
  parentPath: string,
  dirName: string,
): Promise<ActionResult> {
  const { valid, sanitized } = await validatePath(parentPath);
  if (!valid) return { success: false, error: "Invalid parent path" };
  if (!isSafeEntryName(dirName)) return { success: false, error: "Invalid directory name" };

  const targetPath = path.join(sanitized, dirName);
  try {
    await fs.access(targetPath);
    return { success: false, error: "Directory already exists" };
  } catch {
    await fs.mkdir(targetPath, { recursive: false });
    return { success: true };
  }
}

export async function deleteItemService(itemPath: string): Promise<ActionResult> {
  const homeRoot = await ensureHomeRoot();
  const { valid, sanitized } = await validatePath(itemPath);
  if (!valid) return { success: false, error: "Invalid path" };

  const policy = checkMutationPolicy("delete", sanitized, homeRoot);
  if (!policy.allowed) return { success: false, error: policy.error };

  const stats = await fs.stat(sanitized);
  if (stats.isDirectory()) {
    await fs.rm(sanitized, { recursive: true, force: true });
  } else {
    await fs.unlink(sanitized);
  }
  return { success: true };
}

export async function renameItemService(
  oldPath: string,
  newName: string,
): Promise<ActionResult> {
  const homeRoot = await ensureHomeRoot();
  const { valid, sanitized } = await validatePath(oldPath);
  if (!valid) return { success: false, error: "Invalid path" };
  if (!isSafeEntryName(newName)) return { success: false, error: "Invalid name" };

  const policy = checkMutationPolicy("rename", sanitized, homeRoot);
  if (!policy.allowed) return { success: false, error: policy.error };

  const parentDir = path.dirname(sanitized);
  const newPath = path.join(parentDir, newName);
  try {
    await fs.access(newPath);
    return { success: false, error: "Target already exists" };
  } catch {
    await fs.rename(sanitized, newPath);
    return { success: true };
  }
}

export async function createFileService(
  parentPath: string,
  fileName: string,
): Promise<ActionResult> {
  const { valid, sanitized } = await validatePath(parentPath);
  if (!valid) return { success: false, error: "Invalid parent path" };
  if (!isSafeEntryName(fileName)) return { success: false, error: "Invalid file name" };

  const filePath = path.join(sanitized, fileName);
  try {
    await fs.access(filePath);
    return { success: false, error: "File already exists" };
  } catch {
    await fs.writeFile(filePath, "");
    return { success: true };
  }
}

export async function writeFileContentService(
  filePath: string,
  content: string,
): Promise<ActionResult> {
  const homeRoot = await ensureHomeRoot();
  const { valid, sanitized } = await validatePath(filePath);
  if (!valid) return { success: false, error: "Invalid path" };

  const policy = checkMutationPolicy("write", sanitized, homeRoot);
  if (!policy.allowed) return { success: false, error: policy.error };

  await fs.writeFile(sanitized, content, "utf-8");
  return { success: true };
}

export async function readFileContentService(
  filePath: string,
): Promise<FileContentResult> {
  const { valid, sanitized } = await validatePath(filePath);
  if (!valid) return { content: "", error: "Invalid path" };

  const stats = await fs.stat(sanitized);
  if (!stats.isFile()) return { content: "", error: "Not a file" };
  if (stats.size > 1024 * 1024) return { content: "", error: "File too large (max 1MB)" };
  const content = await fs.readFile(sanitized, "utf-8");
  return { content };
}

export async function moveItemsService(
  sourcePaths: string[],
  destPath: string,
): Promise<ActionResult> {
  const homeRoot = await ensureHomeRoot();
  const { valid: destValid, sanitized: destSanitized } = await validatePath(destPath);
  if (!destValid) return { success: false, error: "Invalid destination path" };
  if (!(await fs.stat(destSanitized)).isDirectory()) {
    return { success: false, error: "Destination is not a directory" };
  }

  for (const sourcePath of sourcePaths) {
    const { valid, sanitized } = await validatePath(sourcePath);
    if (!valid) return { success: false, error: `Invalid source path: ${sourcePath}` };

    const policy = checkMutationPolicy("move", sanitized, homeRoot);
    if (!policy.allowed) return { success: false, error: policy.error };

    const targetPath = path.join(destSanitized, path.basename(sanitized));
    try {
      await fs.access(targetPath);
      return { success: false, error: `Item already exists: ${path.basename(sanitized)}` };
    } catch {
      await fs.rename(sanitized, targetPath);
    }
  }

  return { success: true };
}

export async function copyItemsService(
  sourcePaths: string[],
  destPath: string,
): Promise<ActionResult> {
  const { valid: destValid, sanitized: destSanitized } = await validatePath(destPath);
  if (!destValid) return { success: false, error: "Invalid destination path" };
  if (!(await fs.stat(destSanitized)).isDirectory()) {
    return { success: false, error: "Destination is not a directory" };
  }

  for (const sourcePath of sourcePaths) {
    const { valid, sanitized } = await validatePath(sourcePath);
    if (!valid) return { success: false, error: `Invalid source path: ${sourcePath}` };

    let targetPath = path.join(destSanitized, path.basename(sanitized));
    let duplicateCounter = 1;
    while (true) {
      try {
        await fs.access(targetPath);
        targetPath = nextDuplicatePath(targetPath, duplicateCounter);
        duplicateCounter += 1;
      } catch {
        break;
      }
    }

    const stats = await fs.stat(sanitized);
    if (stats.isDirectory()) {
      await fs.cp(sanitized, targetPath, { recursive: true });
    } else {
      await fs.copyFile(sanitized, targetPath);
    }
  }

  return { success: true };
}

export async function getDiskUsageService(dirPath: string): Promise<DiskUsageResult> {
  const { valid, sanitized } = await validatePath(dirPath);
  if (!valid) return { size: "0", error: "Invalid path" };

  const { stdout } = await execAsync(`du -sh "${sanitized}" 2>/dev/null || echo "0K"`);
  return { size: stdout.trim().split("\t")[0] };
}

