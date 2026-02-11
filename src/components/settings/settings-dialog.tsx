"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  HOMEIO_DIALOG_CLOSE_BUTTON_CLASS,
  HOMEIO_DIALOG_SHELL_CLASS,
  HOMEIO_DIALOG_TITLE_CLASS,
} from "@/components/ui/dialog-chrome";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { X } from "lucide-react";
import { useCallback } from "react";
import { AdvancedSettingsDialog } from "./advanced-settings-dialog";
import { BluetoothDialog } from "./bluetooth-dialog";
import { FirewallDialog } from "./firewall";
import { NetworkDevicesDialog } from "./network-devices-dialog";
import { SettingsSectionsContent } from "./settings-sections-content";
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
        className={HOMEIO_DIALOG_SHELL_CLASS}
        aria-describedby="settings-description"
      >
        <DialogTitle className="sr-only text-4xl font-semibold text-foreground">
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
          className="h-[92vh] w-full min-w-0"
          viewportClassName="homeio-fade-scroller-y h-full w-full [&>div]:!block [&>div]:!w-full [&>div]:!min-w-0"
        >
          <div className="flex min-w-0 flex-col gap-4 px-2 pt-4 md:px-3 md:pt-7 lg:px-4">
            <div className="flex min-w-0 flex-col gap-0.5 px-1">
              <h2 className={HOMEIO_DIALOG_TITLE_CLASS}>Settings</h2>
            </div>

            {d.initialLoading ? (
              <div className="space-y-5">
                {Array.from({ length: 4 }).map((_, sectionIndex) => (
                  <div key={`settings-skeleton-${sectionIndex}`} className="space-y-2">
                    <Skeleton className="h-3 w-24" />
                    <div className="space-y-2 rounded-lg border border-border bg-secondary/20 p-3">
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <SettingsSectionsContent
                data={d}
                currentWallpaper={currentWallpaper}
              />
            )}

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
