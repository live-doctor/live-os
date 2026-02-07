export function hasConfiguredWallpaper(path: string | null | undefined) {
  return typeof path === "string" && path.trim().length > 0;
}
