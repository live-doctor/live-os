import Image from "next/image";
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
    <div className="bg-black/30 backdrop-blur-xl rounded-2xl p-6 border border-white/15 shadow-lg shadow-black/25">
      <div className="mb-4">
        <h4 className="text-lg font-semibold text-white mb-1">Wallpaper</h4>
        <p className="text-sm text-white/60">
          Your LiveOS wallpaper and theme{" "}
          {saving && <span className="text-white/70 text-xs">Saving…</span>}
        </p>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide ">
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
    </div>
  );
}
