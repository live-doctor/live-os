import fs from "fs/promises";
import path from "path";
import type { ValidatePathResult } from "./files.types";

const PRIMARY_HOME_ROOT = process.env.HOMEIO_HOME || "/DATA";
const FALLBACK_HOME_ROOT = path.join(process.cwd(), "DATA");
const BLOCKED_PREFIXES = ["/etc/shadow", "/etc/passwd", "/sys", "/proc"];

let resolvedHomeRoot = PRIMARY_HOME_ROOT;

export async function ensureHomeRoot(): Promise<string> {
  try {
    await fs.mkdir(resolvedHomeRoot, { recursive: true });
    return resolvedHomeRoot;
  } catch (error: unknown) {
    const fallbackError =
      error instanceof Error ? error.message : "unknown error";
    resolvedHomeRoot = FALLBACK_HOME_ROOT;
    await fs.mkdir(resolvedHomeRoot, { recursive: true });
    console.warn(
      `[Filesystem] Falling back to ${resolvedHomeRoot} because ${PRIMARY_HOME_ROOT} is not available (${fallbackError})`,
    );
    return resolvedHomeRoot;
  }
}

export async function validatePath(
  requestedPath: string,
): Promise<ValidatePathResult> {
  try {
    const homeRoot = await ensureHomeRoot();
    if (!requestedPath) {
      return { valid: true, sanitized: homeRoot };
    }

    const resolved = path.resolve(requestedPath);
    const real = await fs.realpath(resolved).catch(() => resolved);
    const insideHome =
      real === homeRoot || real.startsWith(`${homeRoot}${path.sep}`);

    if (!insideHome) {
      return { valid: false, sanitized: homeRoot };
    }

    for (const blockedPrefix of BLOCKED_PREFIXES) {
      if (real.startsWith(blockedPrefix)) {
        return { valid: false, sanitized: homeRoot };
      }
    }

    return { valid: true, sanitized: real };
  } catch {
    const fallback = await ensureHomeRoot();
    return { valid: false, sanitized: fallback };
  }
}

export function isSafeEntryName(name: string): boolean {
  if (!name.trim()) {
    return false;
  }
  if (name.includes("/") || name.includes("\\") || name.includes("..")) {
    return false;
  }
  return true;
}

