import Image from "next/image";
import { Image as ImageIcon } from "lucide-react";
import {
  SettingsSectionShell,
  settingsCardClass,
} from "./section-shell";
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
      subtitle={`Your LiveOS wallpaper and theme${saving ? " • Saving…" : ""}`}
      className={settingsCardClass}
    >
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {wallpapersLoading && (
          <div className="text-xs text-white/60 py-2">
            Loading wallpapers...
          </div>
        )}
        {!wallpapersLoading && wallpapers.length === 0 && (
          <div className="text-xs text-white/60 py-2">
            No wallpapers found in `public/wallpapers`.
          </div>
        )}
        {wallpapers.map((wallpaper) => (
          <button
            key={wallpaper.id}
            onClick={() => onSelect(wallpaper.path)}
            className={`
              relative flex-shrink-0 w-24 h-16 rounded-xl overflow-hidden border transition-all shadow-sm
              ${
                currentWallpaper === wallpaper.path
                  ? "border-white/80 ring-2 ring-white/40"
                  : "border-white/15 hover:border-white/30"
              }
            `}
          >
            <Image
              src={wallpaper.path}
              alt={wallpaper.name}
              className="w-full h-full object-cover"
              width={500}
              height={500}
            />
          </button>
        ))}
      </div>
    </SettingsSectionShell>
  );
}
