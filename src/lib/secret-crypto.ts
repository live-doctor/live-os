import crypto from "crypto";
import fs from "fs/promises";
import path from "path";

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;
const KEY_BYTES = 32;
const PREFIX = "enc:v1";

export function isEncryptedValue(value?: string): boolean {
  return typeof value === "string" && value.startsWith(`${PREFIX}:`);
}

export async function getOrCreateSecretKey(filePath: string): Promise<Buffer> {
  await fs.mkdir(path.dirname(filePath), { recursive: true, mode: 0o700 });

  try {
    const existing = (await fs.readFile(filePath, "utf8")).trim();
    if (/^[a-f0-9]{64}$/i.test(existing)) {
      return Buffer.from(existing, "hex");
    }
  } catch {
    // Fall through and create a key.
  }

  const key = crypto.randomBytes(KEY_BYTES);
  await fs.writeFile(filePath, key.toString("hex"), { mode: 0o600 });
  return key;
}

export async function writeSecretKey(
  filePath: string,
  key: Buffer,
): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true, mode: 0o700 });
  await fs.writeFile(filePath, key.toString("hex"), { mode: 0o600 });
}

export function encryptSecret(key: Buffer, plaintext: string): string {
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}:${iv.toString("base64")}:${tag.toString("base64")}:${encrypted.toString("base64")}`;
}

export function decryptSecret(key: Buffer, payload: string): string {
  const parts = payload.split(":");
  if (parts.length !== 5 || `${parts[0]}:${parts[1]}` !== PREFIX) {
    throw new Error("Unsupported encrypted payload");
  }

  const iv = Buffer.from(parts[2], "base64");
  const tag = Buffer.from(parts[3], "base64");
  const encrypted = Buffer.from(parts[4], "base64");
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);
  return plaintext.toString("utf8");
}
