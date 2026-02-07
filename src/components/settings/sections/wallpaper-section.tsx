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
      icon={<ImageIcon className="h-4 w-4 text-white" />}
      title="Wallpaper"
      subtitle={`Your Homeio wallpaper and theme${saving ? " • Saving…" : ""}`}
      className={settingsCardClass}
    >
      <div className="w-full overflow-x-auto py-1 scrollbar-hide">
        <div className="flex items-center gap-1">
          <div className="w-1 shrink-0" />
        {wallpapersLoading && (
          <div className="py-2 text-xs text-white/60">
            Loading wallpapers...
          </div>
        )}
        {!wallpapersLoading && wallpapers.length === 0 && (
          <div className="py-2 text-xs text-white/60">
            No wallpapers found in `public/wallpapers`.
          </div>
        )}
        {wallpapers.map((wallpaper) => (
          <button
            key={wallpaper.id}
            onClick={() => onSelect(wallpaper.path)}
            className={`
              h-6 w-10 shrink-0 rounded-[5px] bg-white/10 bg-cover bg-center outline-none transition-all duration-200
              ${
                currentWallpaper === wallpaper.path
                  ? "mx-2 scale-[1.4] ring-2 ring-white/50"
                  : "ring-1 ring-white/30 hover:ring-white/50"
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
