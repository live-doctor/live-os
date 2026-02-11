import { createRequire } from "module";
import { execFileSync } from "child_process";
import { PrismaClient } from "../app/generated/prisma/client";

const require = createRequire(import.meta.url);
const DEFAULT_DB_URL = "file:./prisma/homeio.db";
const DATABASE_URL = process.env.DATABASE_URL || DEFAULT_DB_URL;
type PrismaAdapter = NonNullable<
  Exclude<ConstructorParameters<typeof PrismaClient>[0], undefined>["adapter"]
>;

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isNativeModuleLoadError(error: unknown): boolean {
  const message = toErrorMessage(error).toLowerCase();
  return (
    message.includes("err_dlopen_failed") ||
    message.includes("did not self-register") ||
    message.includes("module was compiled against a different node.js version")
  );
}

function clearBetterSqliteCache() {
  try {
    const resolved = require.resolve("better-sqlite3");
    delete require.cache[resolved];
  } catch {
    // ignore cache clear failures
  }
}

function clearAdapterCache() {
  try {
    const resolved = require.resolve("@prisma/adapter-better-sqlite3");
    delete require.cache[resolved];
  } catch {
    // ignore cache clear failures
  }
}

function verifyBetterSqlite3OrThrow() {
  require("better-sqlite3");
}

function tryAutoRebuildBetterSqlite3(originalError: unknown): void {
  if (!isNativeModuleLoadError(originalError)) {
    throw originalError;
  }

  console.warn(
    `[Prisma] better-sqlite3 failed to load (${toErrorMessage(originalError)}). Attempting rebuild...`,
  );

  try {
    execFileSync("npm", ["rebuild", "better-sqlite3", "--build-from-source"], {
      cwd: process.cwd(),
      stdio: "pipe",
      env: process.env,
    });
  } catch (rebuildError) {
    const reason = toErrorMessage(rebuildError);
    throw new Error(
      `[Prisma] better-sqlite3 rebuild failed: ${reason}. Run 'npm rebuild better-sqlite3 --build-from-source'.`,
    );
  }

  clearBetterSqliteCache();
  clearAdapterCache();

  try {
    verifyBetterSqlite3OrThrow();
    console.warn("[Prisma] better-sqlite3 rebuilt successfully.");
  } catch (verifyError) {
    throw new Error(
      `[Prisma] better-sqlite3 still failed after rebuild: ${toErrorMessage(verifyError)}`,
    );
  }
}

function createPrismaClient(): PrismaClient {
  try {
    verifyBetterSqlite3OrThrow();
  } catch (error) {
    tryAutoRebuildBetterSqlite3(error);
  }

  const { PrismaBetterSqlite3 } = require("@prisma/adapter-better-sqlite3") as {
    PrismaBetterSqlite3: new (
      config: { url: string },
      options: { timestampFormat: "unixepoch-ms" },
    ) => PrismaAdapter;
  };
  const adapter = new PrismaBetterSqlite3(
    { url: DATABASE_URL },
    { timestampFormat: "unixepoch-ms" },
  );

  return new PrismaClient({ adapter });
}

const prisma = createPrismaClient();

export { prisma };
export default prisma;
