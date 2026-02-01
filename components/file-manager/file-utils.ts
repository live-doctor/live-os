import type { FileSystemItem } from "@/app/actions/filesystem";

export const DEFAULT_ROOT = "/DATA";
export const MAX_HISTORY = 50;

export const TEXT_EXTENSIONS =
  /\.(txt|md|log|json|ya?ml|js|ts|jsx|tsx|html|css|scss|less|sh|bash|zsh|env|toml|ini|conf|config|dockerfile|go|rs|py|rb|php|java|c|cpp|h|hpp|sql|prisma)$/i;

const LANGUAGE_BY_EXT: Record<string, string> = {
  json: "json",
  md: "markdown",
  markdown: "markdown",
  yml: "yaml",
  yaml: "yaml",
  ts: "typescript",
  tsx: "typescript",
  js: "javascript",
  jsx: "javascript",
  html: "html",
  css: "css",
  scss: "scss",
  less: "less",
  sh: "shell",
  bash: "shell",
  zsh: "shell",
  env: "properties",
  toml: "toml",
  ini: "properties",
  conf: "properties",
  config: "properties",
  dockerfile: "dockerfile",
  go: "go",
  rs: "rust",
  py: "python",
  rb: "ruby",
  php: "php",
  java: "java",
  c: "c",
  cpp: "cpp",
  h: "cpp",
  hpp: "cpp",
  sql: "sql",
  prisma: "prisma",
};

export const isTextLike = (fileName: string) => {
  if (/dockerfile$/i.test(fileName)) return true;
  return TEXT_EXTENSIONS.test(fileName);
};

export const guessLanguage = (filePath: string) => {
  const lower = filePath.toLowerCase();
  if (lower.endsWith("dockerfile")) return "dockerfile";
  const parts = lower.split(".");
  const ext = parts.length > 1 ? parts.pop() || "" : "";
  return LANGUAGE_BY_EXT[ext] || "plaintext";
};

export const toDirectoryItem = (
  itemPath: string,
  label: string,
): FileSystemItem => ({
  name: label || itemPath.split("/").filter(Boolean).pop() || "folder",
  path: itemPath,
  type: "directory",
  size: 0,
  modified: Date.now(),
  permissions: "",
  isHidden: label.startsWith("."),
});
