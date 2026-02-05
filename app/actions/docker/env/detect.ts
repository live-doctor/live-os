/**
 * Detect the store type from the store ID.
 */

import prisma from "@/lib/prisma";

export type StoreType = "umbrel" | "custom";

/**
 * Detect store type from store ID.
 * Looks up the store format from the database first, then falls back to heuristics.
 */
export async function detectStoreType(storeId?: string, composePath?: string): Promise<StoreType> {
  if (!storeId && !composePath) return "custom";

  // Try to look up the store format from the database by ID
  if (storeId) {
    try {
      const store = await prisma.store.findUnique({
        where: { id: storeId },
        select: { format: true },
      });

      if (store?.format) {
        const format = store.format.toLowerCase();
        if (format === "umbrel") return "umbrel";
      }
    } catch {
      // Database lookup failed, fall back to heuristics
    }
  }

  // Fallback: detect from compose path if database lookup failed
  const lowerPath = composePath?.toLowerCase() ?? "";

  if (lowerPath.includes("umbrel-app.yml") || lowerPath.includes("/umbrel/")) {
    return "umbrel";
  }

  // If we have a storeId, assume it's an Umbrel store app
  if (storeId) {
    return "umbrel";
  }

  return "custom";
}
