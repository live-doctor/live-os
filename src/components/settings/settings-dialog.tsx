"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { VERSION } from "@/lib/config";
import { X } from "lucide-react";
import { useCallback } from "react";
import { AdvancedSettingsDialog } from "./advanced-settings-dialog";
import { BluetoothDialog } from "./bluetooth-dialog";
import { BluetoothSection } from "./bluetooth-section";
import { FirewallDialog } from "./firewall";
import { NetworkDevicesDialog } from "./network-devices-dialog";
import {
  AccountSection,
  AdvancedSettingsSection,
  DeviceInfoSection,
  FirewallSection,
  LanguageSection,
  NetworkDevicesSection,
  StorageSection,
  SystemDetailsCard,
  ThemeSection,
  TroubleshootSection,
  UpdateSection,
  WallpaperSection,
  WifiSection,
} from "./sections";
import { settingsRowsContainerClass } from "./sections/section-shell";
import { SettingsSidebar } from "./settings-sidebar";
import { StorageDialog } from "./storage-dialog";
import { SystemDetailsDialog } from "./system-details-dialog";
import { TroubleshootDialog } from "./troubleshoot/troubleshoot-dialog";
import { useSettingsDialogData } from "./use-settings-dialog-data";
import { WifiDialog } from "./wifi-dialog";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onWallpaperChange?: (wallpaper: string) => void;
  currentWallpaper?: string;
}

export function SettingsDialog({
  open,
  onOpenChange,
  onWallpaperChange,
  currentWallpaper,
}: SettingsDialogProps) {
  const d = useSettingsDialogData({ open, onWallpaperChange });
  const handleClose = useCallback(() => onOpenChange(false), [onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-h-[92vh] max-w-[95vw] overflow-hidden rounded-[20px] border border-white/10 bg-[rgba(47,51,57,0.72)] p-0 text-white shadow-[0_28px_80px_rgba(0,0,0,0.48)] backdrop-blur-3xl sm:max-w-[1280px]"
        aria-describedby="settings-description"
      >
        <DialogTitle className="sr-only text-4xl font-semibold text-white drop-shadow">
          Settings
        </DialogTitle>
        <DialogDescription id="settings-description" className="sr-only">
          System settings and configuration
        </DialogDescription>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleClose}
          className="absolute right-5 top-5 z-20 h-8 w-8 cursor-pointer rounded-full border border-white/15 bg-white/10 text-white/50 hover:bg-white/20 hover:text-white"
        >
          <X className="h-4 w-4" />
        </Button>

        <ScrollArea
          className="h-[92vh] w-full"
          viewportClassName="umbrel-fade-scroller-y h-full w-full [&>div]:!block [&>div]:!w-full [&>div]:!min-w-0"
        >
          <div className="flex flex-col gap-4 px-3 pt-4 md:px-[28px] md:pt-7 xl:px-[40px]">
            <div className="flex flex-col gap-0.5 px-1">
              <h2 className="text-[20px] font-bold leading-none tracking-[-0.03em] text-white/80 md:text-[32px]">
                Settings
              </h2>
            </div>

            <div className="animate-in fade-in">
              <div className="grid w-full gap-x-[30px] gap-y-[20px] lg:grid-cols-[280px_auto]">
                <div className="flex  justify-center">
                  <SettingsSidebar
                    currentWallpaper={currentWallpaper}
                    systemInfo={d.systemInfo}
                    storageInfo={d.storageStats}
                    systemStatus={d.systemStats}
                    formatBytes={d.formatBytes}
                    getMetricColor={d.getMetricColor}
                  />
                </div>
                <div className="flex min-w-0 flex-col gap-3">
                  <DeviceInfoSection
                    systemInfo={d.systemInfo}
                    uptimeLabel={d.uptimeLabel}
                    onLogout={d.handleLogout}
                    onRestart={d.handleRestart}
                    onShutdown={d.handleShutdown}
                  />
                  <div className={settingsRowsContainerClass}>
                    <AccountSection />
                    <WallpaperSection
                      wallpapers={d.wallpapers}
                      wallpapersLoading={d.wallpapersLoading}
                      currentWallpaper={currentWallpaper}
                      onSelect={d.handleWallpaperSelect}
                      saving={d.savingWallpaper}
                    />
                    <ThemeSection />
                    <WifiSection
                      onOpenDialog={() => d.setWifiDialogOpen(true)}
                      ssid={d.hardware?.wifi?.ssid}
                      quality={d.hardware?.wifi?.quality}
                    />
                    <BluetoothSection
                      powered={d.bluetoothDisplay?.powered}
                      blocked={d.bluetoothDisplay?.blocked}
                      adapter={d.bluetoothDisplay?.adapter}
                      devices={
                        d.bluetoothDisplay?.devices ??
                        d.hardware?.bluetooth?.devices
                      }
                      firstDevice={
                        d.bluetoothDisplay?.firstName ??
                        d.hardware?.bluetooth?.firstName
                      }
                      available={d.bluetoothDisplay?.available}
                      error={
                        d.bluetoothError ?? d.bluetoothDisplay?.error ?? null
                      }
                      onOpenDialog={() => d.setBluetoothDialogOpen(true)}
                    />
                    <NetworkDevicesSection
                      deviceCount={d.lanDevices.length}
                      onOpenDialog={() => d.setNetworkDevicesOpen(true)}
                    />
                    <FirewallSection
                      onOpenDialog={() => d.handleFirewallDialogChange(true)}
                      enabled={d.firewallEnabled}
                    />
                    <StorageSection
                      onOpenDialog={() => d.setStorageDialogOpen(true)}
                    />
                    <LanguageSection />
                    <AdvancedSettingsSection
                      onOpenDialog={() => d.setAdvancedDialogOpen(true)}
                    />
                    <TroubleshootSection
                      onOpenDialog={() => d.setTroubleshootDialogOpen(true)}
                    />
                    <UpdateSection
                      currentVersion={VERSION}
                      status={d.updateStatus?.message}
                      remoteVersion={d.updateStatus?.remoteVersion}
                      hasUpdate={d.updateStatus?.hasUpdate}
                      onCheck={d.handleCheckUpdate}
                      checking={d.checkingUpdate}
                    />
                    {d.hardware && (
                      <SystemDetailsCard
                        hardware={d.hardware}
                        onOpenTabs={() => d.setSystemDetailsOpen(true)}
                      />
                    )}
                  </div>
                </div>
              </div>
              <p className="mx-auto mt-4 text-[12px] font-normal text-white/70 lg:hidden">
                Need help?{" "}
                <a
                  className="text-brand-lighter underline-offset-4 decoration-brand/30 transition-colors hover:text-brand hover:underline"
                  href="https://homeio.com/support"
                  target="_blank"
                >
                  Contact support.
                </a>
              </p>
            </div>

            <div className="h-8 w-full shrink-0" />
          </div>
        </ScrollArea>

        {d.wifiDialogOpen && (
          <WifiDialog
            open={d.wifiDialogOpen}
            onOpenChange={d.setWifiDialogOpen}
          />
        )}
        {d.networkDevicesOpen && (
          <NetworkDevicesDialog
            open={d.networkDevicesOpen}
            onOpenChange={d.setNetworkDevicesOpen}
            onDevicesChange={d.handleNetworkDevicesChange}
            initialDevices={d.lanDevices}
            initialError={d.lanDevicesError}
          />
        )}
        {d.bluetoothDialogOpen && (
          <BluetoothDialog
            open={d.bluetoothDialogOpen}
            onOpenChange={d.setBluetoothDialogOpen}
            status={d.bluetoothDisplay || undefined}
            loading={d.bluetoothLoading}
            error={d.bluetoothError}
            onToggle={d.handleToggleBluetooth}
            onRefresh={d.refreshBluetooth}
          />
        )}
        {d.troubleshootDialogOpen && (
          <TroubleshootDialog
            open={d.troubleshootDialogOpen}
            onOpenChange={d.setTroubleshootDialogOpen}
          />
        )}
        {d.firewallDialogOpen && (
          <FirewallDialog
            open={d.firewallDialogOpen}
            onOpenChange={d.handleFirewallDialogChange}
          />
        )}
        <SystemDetailsDialog
          open={d.systemDetailsOpen}
          onOpenChange={d.setSystemDetailsOpen}
          hardware={d.hardware}
          cpuUsage={d.systemStats?.cpu?.usage}
          cpuPower={d.systemStats?.cpu?.power}
          memory={d.systemStats?.memory}
        />
        <AdvancedSettingsDialog
          open={d.advancedDialogOpen}
          onOpenChange={d.setAdvancedDialogOpen}
        />
        <StorageDialog
          open={d.storageDialogOpen}
          onOpenChange={d.setStorageDialogOpen}
        />
      </DialogContent>
    </Dialog>
  );
}
