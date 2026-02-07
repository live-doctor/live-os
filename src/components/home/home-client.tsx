"use client";

import { AppStoreDialog } from "@/components/app-store/app-store-dialog";
import { InstallProgressOverlay } from "@/components/app-store/install-progress-overlay";
import { InstalledAppsGrid } from "@/components/installed-apps/installed-apps-grid";
import { KeyboardShortcutsDialog } from "@/components/keyboard-shortcuts/keyboard-shortcuts-dialog";
import { DockOs } from "@/components/layout/dock";
import { StatusBar } from "@/components/layout/status-icons";
import { UserMenu } from "@/components/layout/user-menu";
import { WallpaperLayout } from "@/components/layout/wallpaper-layout";
import { LockScreen } from "@/components/lock-screen";
import { CommandPaletteDialog } from "@/components/search/command-palette-dialog";
import { WifiDialog } from "@/components/settings/wifi-dialog";
import { RebootOverlay } from "@/components/system/reboot-overlay";
import { WidgetGrid, WidgetSelector } from "@/components/widgets";
import { surface } from "@/components/ui/design-tokens";
import { useSystemStatus } from "@/hooks/useSystemStatus";
import { useWidgets } from "@/hooks/useWidgets";
import { VERSION } from "@/lib/config";
import { FilesView } from "@/modules/files/ui";
import { DEFAULT_WALLPAPER, DOCK_APPS, LOCK_STORAGE_KEY } from "@/modules/home/domain";
import { buildHomeShortcutSections } from "@/modules/home/shortcut-sections";
import { useCommandPaletteActions } from "@/modules/home/use-command-palette-actions";
import { useDailyAppUsage } from "@/modules/home/use-daily-app-usage";
import { useHomeKeyboardShortcuts } from "@/modules/home/use-home-keyboard-shortcuts";
import { MonitoringLiveView } from "@/modules/monitoring/ui";
import { SettingsView } from "@/modules/settings/ui";
import { TerminalView } from "@/modules/terminal/ui";
import { LayoutGrid } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
type HomeClientProps = {
  initialWallpaper?: string | null;
};

export function HomeClient({ initialWallpaper }: HomeClientProps) {
  const [openApps, setOpenApps] = useState<string[]>(["finder"]);
  const [appStoreOpen, setAppStoreOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [monitorOpen, setMonitorOpen] = useState(false);
  const [filesOpen, setFilesOpen] = useState(false);
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [widgetSelectorOpen, setWidgetSelectorOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [wifiDialogOpen, setWifiDialogOpen] = useState(false);
  const [wallpaper, setWallpaper] = useState(
    initialWallpaper ?? DEFAULT_WALLPAPER,
  );
  const [locked, setLocked] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(LOCK_STORAGE_KEY) === "1";
  });
  const { installProgress } = useSystemStatus();
  const { dailyAppUsage, trackAppOpen } = useDailyAppUsage();
  const {
    selectedIds,
    widgetData,
    toggleWidget,
    updateCustomWidget,
    isSelected,
    shakeTrigger,
    isLoading: widgetsLoading,
  } = useWidgets();

  const openAppStore = useCallback(() => setAppStoreOpen(true), []);
  const openSettings = useCallback(() => setSettingsOpen(true), []);
  const openMonitor = useCallback(() => setMonitorOpen(true), []);
  const openFiles = useCallback(() => setFilesOpen(true), []);
  const openTerminal = useCallback(() => setTerminalOpen(true), []);
  const openWidgetSelector = useCallback(() => setWidgetSelectorOpen(true), []);
  const openShortcuts = useCallback(() => setShortcutsOpen(true), []);
  const openSearch = useCallback(() => setCommandPaletteOpen(true), []);
  const lockHome = useCallback(() => setLocked(true), []);

  const openDockApp = useCallback(
    (appId: string) => {
      if (appId === "finder") return openFiles();
      if (appId === "store") return openAppStore();
      if (appId === "settings") return openSettings();
      if (appId === "monitor") return openMonitor();
      if (appId === "terminal") return openTerminal();
      setOpenApps((prev) =>
        prev.includes(appId)
          ? prev.filter((id) => id !== appId)
          : [...prev, appId],
      );
    },
    [openAppStore, openFiles, openMonitor, openSettings, openTerminal],
  );

  const handleAppClick = useCallback(
    (appId: string) => {
      trackAppOpen(appId);
      openDockApp(appId);
    },
    [openDockApp, trackAppOpen],
  );
  const { commandPaletteActions, frequentActions } = useCommandPaletteActions({
    commandPaletteOpen,
    dailyAppUsage,
    openAppStore,
    openSettings,
    openMonitor,
    openWidgetSelector,
    onDockAppClick: handleAppClick,
  });

  const shortcutHandlers = useMemo(
    () => ({
      openSearch,
      openSettings,
      lockHome,
      openShortcuts,
      openFiles,
      openTerminal,
      openMonitor,
      openWidgetSelector,
    }),
    [
      lockHome,
      openFiles,
      openMonitor,
      openSearch,
      openSettings,
      openShortcuts,
      openTerminal,
      openWidgetSelector,
    ],
  );

  useHomeKeyboardShortcuts(shortcutHandlers);

  useEffect(() => {
    if (locked) {
      window.localStorage.setItem(LOCK_STORAGE_KEY, "1");
    } else {
      window.localStorage.removeItem(LOCK_STORAGE_KEY);
    }
  }, [locked]);

  const shortcutSections = useMemo(
    () => buildHomeShortcutSections(shortcutHandlers),
    [shortcutHandlers],
  );
  return (
    <WallpaperLayout
      className="flex items-center justify-center font-sans"
      wallpaper={wallpaper}
    >
      <div className="fixed top-4 right-4 z-50 flex items-center gap-3">
        <StatusBar onWifiClick={() => setWifiDialogOpen(true)} />
        <UserMenu onOpenSettings={openSettings} />
      </div>
      <main
        className={`relative flex min-h-screen w-full ${
          selectedIds.length >= 4 ? "max-w-6xl" : "max-w-3xl"
        } z-0 flex-col items-center justify-between px-16 py-32 sm:items-start`}
      >
        <div className="mb-4 w-full">
          {!widgetsLoading && selectedIds.length > 0 && (
            <div className="relative">
              <WidgetGrid selectedIds={selectedIds} widgetData={widgetData} />
              <button
                onClick={openWidgetSelector}
                className="absolute -top-2 -right-2 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-white/10 transition-colors hover:bg-white/20"
                title="Edit widgets"
              >
                <LayoutGrid className="h-4 w-4 text-white/70" />
              </button>
            </div>
          )}
          {!widgetsLoading && selectedIds.length === 0 && (
            <button
              onClick={openWidgetSelector}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-white/20 py-8 transition-colors hover:border-white/30 hover:bg-white/5"
            >
              <LayoutGrid className="h-5 w-5 text-white/50" />
              <span className="text-white/50">Add widgets</span>
            </button>
          )}
        </div>
        <InstalledAppsGrid />
        <div className="pointer-events-none fixed right-0 bottom-0 left-0 z-50 mb-4 flex justify-center">
          <div className="pointer-events-auto relative">
            <button
              type="button"
              onClick={openSearch}
              className={`absolute -top-12 left-1/2 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] ${surface.label} ring-1 ring-white/20 ${surface.panel} ${surface.panelInteractive} hover:scale-105 hover:text-white active:scale-95`}
              title="Search apps"
              aria-label="Search apps"
            >
              <span>Search</span>
              <span className={`px-1 text-[10px] ${surface.labelMuted}`}>⌘K</span>
            </button>
            <DockOs apps={DOCK_APPS} onAppClick={handleAppClick} openApps={openApps} />
          </div>
        </div>
        <CommandPaletteDialog
          open={commandPaletteOpen}
          onOpenChange={setCommandPaletteOpen}
          actions={commandPaletteActions}
          frequentActions={frequentActions}
        />
        <AppStoreDialog open={appStoreOpen} onOpenChange={setAppStoreOpen} />
        <SettingsView
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          onWallpaperChange={setWallpaper}
          currentWallpaper={wallpaper}
        />
        <MonitoringLiveView open={monitorOpen} onOpenChange={setMonitorOpen} />
        <FilesView open={filesOpen} onOpenChange={setFilesOpen} />
        <TerminalView open={terminalOpen} onOpenChange={setTerminalOpen} />
        <WidgetSelector
          open={widgetSelectorOpen}
          onOpenChange={setWidgetSelectorOpen}
          selectedIds={selectedIds}
          widgetData={widgetData}
          toggleWidget={toggleWidget}
          updateCustomWidget={updateCustomWidget}
          isSelected={isSelected}
          shakeTrigger={shakeTrigger}
        />
        <WifiDialog open={wifiDialogOpen} onOpenChange={setWifiDialogOpen} />
        <InstallProgressOverlay installs={installProgress} />
        <KeyboardShortcutsDialog
          open={shortcutsOpen}
          onOpenChange={setShortcutsOpen}
          sections={shortcutSections}
        />
      </main>
      <LockScreen open={locked} onUnlock={() => setLocked(false)} />
      <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end space-y-1">
        <div className="text-xs text-white/50">Homeio - v{VERSION}</div>
      </div>
      <RebootOverlay />
    </WallpaperLayout>
  );
}
