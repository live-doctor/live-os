import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";

// Husky should never break installs (especially production installs without .git).
const shouldSkip =
  process.env.HUSKY === "0" ||
  process.env.CI === "true" ||
  process.env.NODE_ENV === "production";

if (shouldSkip) {
  process.exit(0);
}

if (!existsSync(".git")) {
  process.exit(0);
}

if (!existsSync("node_modules/husky") || !existsSync("node_modules/.bin/husky")) {
  process.exit(0);
}

const result = spawnSync("node_modules/.bin/husky", ["install"], {
  stdio: "inherit",
});

process.exit(result.status ?? 0);

