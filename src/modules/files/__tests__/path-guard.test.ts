import fs from "fs/promises";
import path from "path";
import { describe, expect, it } from "vitest";
import {
  ensureHomeRoot,
  isSafeEntryName,
  validatePath,
} from "@/modules/files/domain/path-guard";

describe("path guard", () => {
  it("returns an existing home root", async () => {
    const homeRoot = await ensureHomeRoot();
    const stats = await fs.stat(homeRoot);
    expect(stats.isDirectory()).toBe(true);
  });

  it("accepts in-home paths and rejects outside paths", async () => {
    const homeRoot = await ensureHomeRoot();
    const insidePath = path.join(homeRoot, "path-guard-test");
    const insideResult = await validatePath(insidePath);
    const outsideResult = await validatePath("/etc");

    expect(insideResult.valid).toBe(true);
    expect(insideResult.sanitized).toBe(insidePath);
    expect(outsideResult.valid).toBe(false);
    expect(outsideResult.sanitized).toBe(homeRoot);
  });

  it("sanitizes entry names", () => {
    expect(isSafeEntryName("Documents")).toBe(true);
    expect(isSafeEntryName("My Folder")).toBe(true);
    expect(isSafeEntryName("")).toBe(false);
    expect(isSafeEntryName("../escape")).toBe(false);
    expect(isSafeEntryName("bad/name")).toBe(false);
    expect(isSafeEntryName("bad\\name")).toBe(false);
  });
});

