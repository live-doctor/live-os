"use client";

import { type DefaultDirectory } from "@/app/actions/filesystem";
import { FolderIcon } from "@/components/icons/files";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Grid3x3, Home, Plus, Star, Trash2, Clock3, Rewind } from "lucide-react";

interface FilesSidebarProps {
  homePath: string;
  shortcuts: DefaultDirectory[];
  favorites: string[];
  trashPath: string;
  trashItemCount: number;
  currentPath: string;
  onNavigate: (path: string) => void;
  getShortcutPath: (name: string) => string;
  onOpenNetwork: () => void;
}

export function FilesSidebar({
  homePath,
  shortcuts,
  favorites,
  trashPath,
  trashItemCount,
  currentPath,
  onNavigate,
  getShortcutPath,
  onOpenNetwork,
}: FilesSidebarProps) {
  const isInTrash = currentPath === trashPath;
  const homeLabel = "Home";
  const favoritesSet = new Set(favorites);
  const getFolderName = (path: string) => {
    const parts = path.split("/").filter(Boolean);
    return parts[parts.length - 1] || path;
  };
  const baseLocations = shortcuts.map((shortcut) => ({
    ...shortcut,
    isFavorite: favoritesSet.has(shortcut.path),
  }));
  const extraFavorites = favorites
    .filter((favPath) => !shortcuts.some((s) => s.path === favPath))
    .map((favPath) => ({
      name: getFolderName(favPath),
      path: favPath,
      isFavorite: true,
    }));
  const appDataPath = getShortcutPath("AppData");
  const locations = [...baseLocations, ...extraFavorites].filter(
    (shortcut) => shortcut.path !== appDataPath,
  );
  const navItemBase =
    "w-full flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-left text-[12px] font-medium text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground";
  const navItemActive =
    "w-full flex items-center gap-1.5 rounded-lg bg-secondary/60 px-2.5 py-1.5 text-left text-[12px] font-semibold text-foreground";

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <ScrollArea className="min-h-0 flex-1 pr-1">
        <div className="space-y-1">
          <button
            className={navItemActive}
            onClick={() => onNavigate(homePath)}
          >
            <Home className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-[12px] font-medium -tracking-[0.01em]">{homeLabel}</span>
          </button>

          <button className={navItemBase} onClick={() => onNavigate(currentPath)}>
            <Clock3 className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-[12px] font-medium -tracking-[0.01em]">Recents</span>
          </button>

          <button className={navItemBase} onClick={() => onNavigate(getShortcutPath("AppData"))}>
            <Grid3x3 className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-[12px] font-medium -tracking-[0.01em]">Apps</span>
          </button>

          <div className="my-2 h-px w-full bg-border/60" />

          <div className="pb-1 pt-2">
            <div className="px-2 text-[10px] font-medium text-muted-foreground -tracking-[0.01em]">
              Favorites
            </div>
          </div>

          {locations.map((shortcut) => (
            <button
              key={shortcut.path}
              className={navItemBase}
              onClick={() => onNavigate(shortcut.path)}
            >
              <div className="h-4 w-5 flex-shrink-0">
                <FolderIcon className="w-full h-full" />
              </div>
              <span className="text-[12px] font-medium -tracking-[0.01em]">
                {shortcut.name === "AppData"
                  ? "App"
                  : shortcut.name.charAt(0).toUpperCase() +
                    shortcut.name.slice(1)}
                {shortcut.isFavorite && (
                  <span className="ml-2 inline-flex items-center gap-1 rounded-lg bg-amber-500/20 px-1.5 py-[1px] text-[9px] uppercase tracking-[0.1em] text-amber-700 dark:text-amber-200">
                    <Star className="h-3 w-3" />
                    Fav
                  </span>
                )}
              </span>
            </button>
          ))}

          <div className="my-2 h-px w-full bg-border/60" />

          <div className="pb-1 pt-2">
            <div className="px-2 text-[10px] font-medium text-muted-foreground -tracking-[0.01em]">
              Network
            </div>
          </div>

          <button
            className={navItemBase}
            onClick={onOpenNetwork}
          >
            <div className="relative h-4 w-4 flex-shrink-0">
              <div className="h-full w-full rounded-sm bg-gradient-to-br from-cyan-300 via-cyan-400 to-cyan-500 shadow-sm">
                <div className="absolute inset-0 rounded-sm bg-gradient-to-b from-white/30 to-transparent" />
                <div className="absolute bottom-0.5 left-1/2 h-0.5 w-2 -translate-x-1/2 rounded-full bg-cyan-700" />
              </div>
            </div>
            <span className="text-[12px] font-medium -tracking-[0.01em]">Devices</span>
            <Plus className="h-3 w-3 ml-auto text-muted-foreground" />
          </button>

          <div className="h-4" />
        </div>
      </ScrollArea>

      <div className="mt-1.5 space-y-1 pb-1 pr-1">
        <button
          className={`w-full flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[12px] font-medium transition-colors ${
            isInTrash
              ? 'bg-secondary/60 text-foreground'
              : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
          }`}
          onClick={() => onNavigate(trashPath)}
        >
          <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-[12px] font-medium -tracking-[0.01em]">Trash</span>
          {trashItemCount > 0 && (
            <span className="ml-auto text-xs text-muted-foreground bg-secondary/60 px-1.5 py-0.5 rounded-lg">
              {trashItemCount}
            </span>
          )}
        </button>
        <button
          disabled
          className="w-full flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[12px] font-medium text-muted-foreground opacity-70 cursor-not-allowed"
        >
          <Rewind className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-[12px] font-medium -tracking-[0.01em]">Rewind</span>
        </button>
      </div>
    </div>
  );
}
