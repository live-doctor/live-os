"use client";

import { SettingsDialog } from "@/components/settings/settings-dialog";

type SettingsViewProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onWallpaperChange?: (wallpaper: string) => void;
  currentWallpaper?: string;
};

export function SettingsView({
  open,
  onOpenChange,
  onWallpaperChange,
  currentWallpaper,
}: SettingsViewProps) {
  return (
    <SettingsDialog
      open={open}
      onOpenChange={onOpenChange}
      onWallpaperChange={onWallpaperChange}
      currentWallpaper={currentWallpaper}
    />
  );
}
