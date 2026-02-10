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
import {
  HOMEIO_DIALOG_CLOSE_BUTTON_CLASS,
  HOMEIO_DIALOG_CONTENT_GUTTER_CLASS,
  HOMEIO_DIALOG_SHELL_CLASS,
  HOMEIO_DIALOG_TITLE_CLASS,
} from "@/components/ui/dialog-chrome";

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
        className={HOMEIO_DIALOG_SHELL_CLASS}
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
          className={HOMEIO_DIALOG_CLOSE_BUTTON_CLASS}
        >
          <X className="h-4 w-4" />
        </Button>

        <ScrollArea
          className="h-[92vh] w-full"
          viewportClassName="homeio-fade-scroller-y h-full w-full [&>div]:!block [&>div]:!w-full [&>div]:!min-w-0"
        >
          <div
            className={`flex flex-col gap-4 pt-4 md:pt-7 ${HOMEIO_DIALOG_CONTENT_GUTTER_CLASS}`}
          >
            <div className="flex flex-col gap-0.5 px-1">
              <h2 className={HOMEIO_DIALOG_TITLE_CLASS}>
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
