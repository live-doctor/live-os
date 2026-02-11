"use client";

import { VERSION } from "@/lib/config";
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
import type { SettingsDialogData } from "./use-settings-dialog-data";
import { BluetoothSection } from "./bluetooth-section";

type SettingsSectionsContentProps = {
  data: SettingsDialogData;
  currentWallpaper?: string;
};

const sectionDomId = (id: string) => `settings-section-${id}`;

export function SettingsSectionsContent({
  data,
  currentWallpaper,
}: SettingsSectionsContentProps) {
  return (
    <div className="min-w-0 overflow-x-hidden animate-in fade-in">
      <div className="min-w-0 space-y-5">
          <div className="space-y-2">
            <p className="px-1 text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
              Overview
            </p>
            <div className={settingsRowsContainerClass}>
              <section id={sectionDomId("device-info")}>
                <DeviceInfoSection
                  systemInfo={data.systemInfo}
                  uptimeLabel={data.uptimeLabel}
                />
              </section>
            </div>
          </div>

          <div className="space-y-2">
            <p className="px-1 text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
              Personal
            </p>
            <div className={settingsRowsContainerClass}>
              <section id={sectionDomId("account")}>
                <AccountSection />
              </section>
              <section id={sectionDomId("wallpaper")}>
                <WallpaperSection
                  wallpapers={data.wallpapers}
                  wallpapersLoading={data.wallpapersLoading}
                  currentWallpaper={currentWallpaper}
                  onSelect={data.handleWallpaperSelect}
                  saving={data.savingWallpaper}
                />
              </section>
              <section id={sectionDomId("theme")}>
                <ThemeSection />
              </section>
              <section id={sectionDomId("language")}>
                <LanguageSection />
              </section>
            </div>
          </div>

          <div className="space-y-2">
            <p className="px-1 text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
              Network
            </p>
            <div className={settingsRowsContainerClass}>
              <section id={sectionDomId("wifi")}>
                <WifiSection
                  onOpenDialog={() => data.setWifiDialogOpen(true)}
                  ssid={data.hardware?.wifi?.ssid}
                  quality={data.hardware?.wifi?.quality}
                />
              </section>
              <section id={sectionDomId("bluetooth")}>
                <BluetoothSection
                  powered={data.bluetoothDisplay?.powered}
                  blocked={data.bluetoothDisplay?.blocked}
                  adapter={data.bluetoothDisplay?.adapter}
                  devices={
                    data.bluetoothDisplay?.devices ??
                    data.hardware?.bluetooth?.devices
                  }
                  firstDevice={
                    data.bluetoothDisplay?.firstName ??
                    data.hardware?.bluetooth?.firstName
                  }
                  available={data.bluetoothDisplay?.available}
                  error={data.bluetoothError ?? data.bluetoothDisplay?.error ?? null}
                  onOpenDialog={() => data.setBluetoothDialogOpen(true)}
                />
              </section>
              <section id={sectionDomId("network-devices")}>
                <NetworkDevicesSection
                  deviceCount={data.lanDevices.length}
                  onOpenDialog={() => data.setNetworkDevicesOpen(true)}
                />
              </section>
              <section id={sectionDomId("firewall")}>
                <FirewallSection
                  onOpenDialog={() => data.handleFirewallDialogChange(true)}
                  enabled={data.firewallEnabled}
                />
              </section>
            </div>
          </div>

          <div className="space-y-2">
            <p className="px-1 text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
              System
            </p>
            <div className={settingsRowsContainerClass}>
              <section id={sectionDomId("storage")}>
                <StorageSection onOpenDialog={() => data.setStorageDialogOpen(true)} />
              </section>
              <section id={sectionDomId("updates")}>
                <UpdateSection
                  currentVersion={VERSION}
                  status={data.updateStatus?.message}
                  remoteVersion={data.updateStatus?.remoteVersion}
                  hasUpdate={data.updateStatus?.hasUpdate}
                  onCheck={data.handleCheckUpdate}
                  checking={data.checkingUpdate}
                />
              </section>
              <section id={sectionDomId("advanced")}>
                <AdvancedSettingsSection
                  onOpenDialog={() => data.setAdvancedDialogOpen(true)}
                />
              </section>
              <section id={sectionDomId("troubleshoot")}>
                <TroubleshootSection
                  onOpenDialog={() => data.setTroubleshootDialogOpen(true)}
                />
              </section>
              {data.hardware && (
                <section id={sectionDomId("system-details")}>
                  <SystemDetailsCard
                    hardware={data.hardware}
                    onOpenTabs={() => data.setSystemDetailsOpen(true)}
                  />
                </section>
              )}
            </div>
          </div>
      </div>

      <p className="mx-auto mt-4 text-[12px] font-normal text-muted-foreground lg:hidden">
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
  );
}
