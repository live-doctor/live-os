export function normalizePath(path: string) {
  if (!path.startsWith("/")) return `/${path}`;
  return path;
}
