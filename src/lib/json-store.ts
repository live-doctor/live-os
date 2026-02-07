import fs from "fs/promises";

/**
 * Read and parse a JSON file. Returns `fallback` when the file is missing or
 * contains invalid JSON.
 */
export async function readJsonFile<T>(
  filePath: string,
  fallback: T,
): Promise<T> {
  try {
    const content = await fs.readFile(filePath, "utf-8");
    return JSON.parse(content) as T;
  } catch {
    return fallback;
  }
}

/**
 * Serialise `data` as pretty-printed JSON and write it atomically.
 * An optional `mode` (e.g. 0o600) can restrict file permissions.
 */
export async function writeJsonFile<T>(
  filePath: string,
  data: T,
  mode?: number,
): Promise<void> {
  const payload = JSON.stringify(data, null, 2);
  await fs.writeFile(filePath, payload, { encoding: "utf-8", ...(mode != null ? { mode } : {}) });
}
