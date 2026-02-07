import fs from "fs/promises";
import os from "os";
import path from "path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  decryptSecret,
  encryptSecret,
  getOrCreateSecretKey,
  isEncryptedValue,
} from "@/lib/secret-crypto";

describe("secret crypto", () => {
  let tempDir = "";
  let keyPath = "";

  beforeAll(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "homeio-secrets-"));
    keyPath = path.join(tempDir, "secrets.key");
  });

  afterAll(async () => {
    if (tempDir) {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });

  it("creates and reuses the same secret key", async () => {
    const keyOne = await getOrCreateSecretKey(keyPath);
    const keyTwo = await getOrCreateSecretKey(keyPath);

    expect(keyOne.length).toBe(32);
    expect(keyTwo.equals(keyOne)).toBe(true);
  });

  it("encrypts and decrypts values", async () => {
    const key = await getOrCreateSecretKey(keyPath);
    const cipher = encryptSecret(key, "password-123");

    expect(isEncryptedValue(cipher)).toBe(true);
    expect(decryptSecret(key, cipher)).toBe("password-123");
  });

  it("rejects unsupported payloads", async () => {
    const key = await getOrCreateSecretKey(keyPath);

    expect(() => decryptSecret(key, "plain-text")).toThrow(
      "Unsupported encrypted payload",
    );
  });
});
