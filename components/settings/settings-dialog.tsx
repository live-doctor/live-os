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
  TroubleshootSection,
  UpdateSection,
  WallpaperSection,
  WifiSection,
} from "./sections";
import { SettingsSidebar } from "./settings-sidebar";
import { StorageDialog } from "./storage-dialog";
import { SystemDetailsDialog } from "./system-details-dialog";
import { LiveOsTailDialog } from "./troubleshoot/liveos-tail-dialog";
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
        className="max-w-[95vw] sm:max-w-[1200px] max-h-[90vh] bg-white/5 border border-white/10 backdrop-blur-xl shadow-2xl shadow-black/50 p-0 gap-0 overflow-hidden ring-1 ring-white/5"
        aria-describedby="settings-description"
      >
        <div className="flex items-center justify-between px-8 py-6 border-b border-white/5 bg-gradient-to-r from-white/10 via-white/5 to-transparent backdrop-blur">
          <div className="flex items-center gap-4">
            <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.28em] text-white/70">
              Settings
            </span>
            <DialogTitle className="sr-only text-4xl font-semibold text-white drop-shadow">
              Settings
            </DialogTitle>
            <DialogDescription id="settings-description" className="sr-only">
              System settings and configuration
            </DialogDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            className="h-10 w-10 rounded-full border border-white/15 bg-white/10 text-white/60 hover:text-white hover:bg-white/20 transition-colors"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <ScrollArea className="h-[calc(90vh-120px)] w-full">
          <div className="flex min-h-0 w-full overflow-hidden">
            <SettingsSidebar
              currentWallpaper={currentWallpaper}
              systemInfo={d.systemInfo}
              storageInfo={d.storageStats}
              systemStatus={d.systemStats}
              formatBytes={d.formatBytes}
              getMetricColor={d.getMetricColor}
            />
            <div className="w-20 flex-1 min-w-0 bg-white/5 p-6 space-y-4 backdrop-blur-xl">
              <DeviceInfoSection
                systemInfo={d.systemInfo}
                uptimeLabel={d.uptimeLabel}
                onLogout={d.handleLogout}
                onRestart={d.handleRestart}
                onShutdown={d.handleShutdown}
              />
              <AccountSection />
              <WallpaperSection
                wallpapers={d.wallpapers}
                wallpapersLoading={d.wallpapersLoading}
                currentWallpaper={currentWallpaper}
                onSelect={d.handleWallpaperSelect}
                saving={d.savingWallpaper}
              />
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
                  d.bluetoothDisplay?.devices ?? d.hardware?.bluetooth?.devices
                }
                firstDevice={
                  d.bluetoothDisplay?.firstName ??
                  d.hardware?.bluetooth?.firstName
                }
                available={d.bluetoothDisplay?.available}
                error={d.bluetoothError ?? d.bluetoothDisplay?.error ?? null}
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
                onOpenDialog={() => d.setLogsDialogOpen(true)}
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
        {d.logsDialogOpen && (
          <LiveOsTailDialog
            open={d.logsDialogOpen}
            onOpenChange={d.setLogsDialogOpen}
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
