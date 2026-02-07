import fs from "fs/promises";
import path from "path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ensureHomeRoot } from "@/modules/files/domain/path-guard";
import {
  createDirectoryService,
  createFileService,
  deleteItemService,
  renameItemService,
} from "@/modules/files/service/files-ops.service";

describe("files ops service", () => {
  let homeRoot = "";
  let sandboxRoot = "";

  beforeAll(async () => {
    homeRoot = await ensureHomeRoot();
    sandboxRoot = path.join(homeRoot, ".tests-files-ops");
    await fs.rm(sandboxRoot, { recursive: true, force: true });
    await fs.mkdir(sandboxRoot, { recursive: true });
  });

  afterAll(async () => {
    await fs.rm(sandboxRoot, { recursive: true, force: true });
  });

  it("creates and renames files/directories", async () => {
    const createDir = await createDirectoryService(sandboxRoot, "FolderA");
    expect(createDir.success).toBe(true);

    const createFile = await createFileService(
      path.join(sandboxRoot, "FolderA"),
      "note.txt",
    );
    expect(createFile.success).toBe(true);

    const rename = await renameItemService(
      path.join(sandboxRoot, "FolderA", "note.txt"),
      "note-renamed.txt",
    );
    expect(rename.success).toBe(true);

    const renamedExists = await fs
      .access(path.join(sandboxRoot, "FolderA", "note-renamed.txt"))
      .then(() => true)
      .catch(() => false);
    expect(renamedExists).toBe(true);
  });

  it("blocks deleting the home root", async () => {
    const result = await deleteItemService(homeRoot);
    expect(result.success).toBe(false);
    expect(result.error).toBe("This operation is not allowed on home root");
  });
});

