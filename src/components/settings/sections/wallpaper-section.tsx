import { Image as ImageIcon } from "lucide-react";
import { SettingsSectionShell, settingsCardClass } from "./section-shell";
import type { WallpaperOption } from "./types";

type WallpaperSectionProps = {
  wallpapers: WallpaperOption[];
  wallpapersLoading: boolean;
  currentWallpaper?: string;
  saving?: boolean;
  onSelect: (path: string) => void;
};

export function WallpaperSection({
  wallpapers,
  wallpapersLoading,
  currentWallpaper,
  saving = false,
  onSelect,
}: WallpaperSectionProps) {
  return (
    <SettingsSectionShell
      icon={<ImageIcon className="h-4 w-4 text-foreground" />}
      title="Wallpaper"
      subtitle={`Your Homeio wallpaper and theme${saving ? " • Saving…" : ""}`}
      className={settingsCardClass}
    >
      <div className="w-full min-w-0 overflow-x-auto py-1 scrollbar-hide">
        <div className="inline-flex min-w-full items-center gap-1">
          <div className="w-1 shrink-0" />
          {wallpapersLoading && (
            <div className="py-2 text-xs text-muted-foreground">
              Loading wallpapers...
            </div>
          )}
          {!wallpapersLoading && wallpapers.length === 0 && (
            <div className="py-2 text-xs text-muted-foreground">
              No wallpapers found in `public/wallpapers`.
            </div>
          )}
          {wallpapers.map((wallpaper) => (
            <button
              key={wallpaper.id}
              onClick={() => onSelect(wallpaper.path)}
            className={`
              h-10 w-16 shrink-0 rounded-lg bg-secondary/60 bg-cover bg-center outline-none transition-all duration-200
              ${
                currentWallpaper === wallpaper.path
                  ? "scale-105 ring-2 ring-primary/60"
                  : "ring-1 ring-border/70 hover:ring-border"
              }
            `}
              style={{ backgroundImage: `url(${wallpaper.path})` }}
            >
              <span className="sr-only">{wallpaper.name}</span>
            </button>
          ))}
          <div className="w-1 shrink-0" />
        </div>
      </div>
    </SettingsSectionShell>
  );
}
