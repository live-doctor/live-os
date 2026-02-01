/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { getFirewallStatus } from "@/app/actions/firewall";
import { getBluetoothStatus, setBluetoothPower } from "@/app/actions/bluetooth";
import { type LanDevice, listLanDevices } from "@/app/actions/network";
import { getWallpapers, updateSettings } from "@/app/actions/settings";
import { getSystemInfo, getUptime } from "@/app/actions/system";
import { type UpdateStatus, checkForUpdates } from "@/app/actions/update";
import { useRebootTracker } from "@/hooks/useRebootTracker";
import { useSystemStatus } from "@/hooks/useSystemStatus";
import { VERSION } from "@/lib/config";
import { formatBytes, formatUptime } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type { HardwareInfo } from "./hardware-utils";
import type { WallpaperOption } from "./sections";

export const getMetricColor = (
  percentage: number,
): "cyan" | "green" | "yellow" | "red" => {
  if (percentage < 80) return "cyan";
  if (percentage < 90) return "yellow";
  return "red";
};

type Params = {
  open: boolean;
  onWallpaperChange?: (wallpaper: string) => void;
};

export function useSettingsDialogData({ open, onWallpaperChange }: Params) {
  const router = useRouter();
  const { systemStats, storageStats } = useSystemStatus();
  const { requestReboot } = useRebootTracker();

  // Static data
  const [systemInfo, setSystemInfo] = useState<any>(null);
  const [wallpapers, setWallpapers] = useState<WallpaperOption[]>([]);
  const [wallpapersLoading, setWallpapersLoading] = useState(false);
  const [firewallEnabled, setFirewallEnabled] = useState<boolean | undefined>(undefined);
  const [uptimeSeconds, setUptimeSeconds] = useState(0);
  const [lanDevices, setLanDevices] = useState<LanDevice[]>([]);
  const [lanDevicesLoading, setLanDevicesLoading] = useState(false);
  const [lanDevicesError, setLanDevicesError] = useState<string | null>(null);
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus | null>(null);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [savingWallpaper, setSavingWallpaper] = useState(false);

  // Bluetooth
  const [bluetoothStatus, setBtStatus] = useState<HardwareInfo["bluetooth"] | null>(null);
  const [bluetoothLoading, setBtLoading] = useState(false);
  const [bluetoothError, setBtError] = useState<string | null>(null);

  // Dialog open states
  const [wifiDialogOpen, setWifiDialogOpen] = useState(false);
  const [firewallDialogOpen, setFirewallDialogOpen] = useState(false);
  const [systemDetailsOpen, setSystemDetailsOpen] = useState(false);
  const [storageDialogOpen, setStorageDialogOpen] = useState(false);
  const [networkDevicesOpen, setNetworkDevicesOpen] = useState(false);
  const [logsDialogOpen, setLogsDialogOpen] = useState(false);
  const [advancedDialogOpen, setAdvancedDialogOpen] = useState(false);

  // Fetch helpers
  const fetchSystemInfo = useCallback(async () => {
    const info = await getSystemInfo();
    setSystemInfo(info);
  }, []);

  const fetchUptime = useCallback(async () => {
    try {
      setUptimeSeconds(await getUptime());
    } catch {
      /* non-critical */
    }
  }, []);

  const fetchFirewallStatus = useCallback(async () => {
    try {
      const r = await getFirewallStatus();
      setFirewallEnabled(r.status.enabled);
    } catch {
      /* show unknown */
    }
  }, []);

  const fetchLanDevices = useCallback(async () => {
    setLanDevicesLoading(true);
    setLanDevicesError(null);
    try {
      const result = await listLanDevices();
      setLanDevices(result.devices);
      if (result.error) setLanDevicesError(result.error);
    } catch {
      setLanDevicesError("Failed to scan network devices");
      setLanDevices([]);
    } finally {
      setLanDevicesLoading(false);
    }
  }, []);

  const fetchWallpapers = useCallback(async () => {
    setWallpapersLoading(true);
    try {
      setWallpapers(await getWallpapers());
    } catch {
      setWallpapers([]);
    } finally {
      setWallpapersLoading(false);
    }
  }, []);

  const refreshBluetooth = useCallback(async () => {
    setBtLoading(true);
    setBtError(null);
    try {
      const status = await getBluetoothStatus();
      setBtStatus((prev) => ({
        ...(prev ?? {}),
        ...status,
        devices: prev?.devices,
        firstName: prev?.firstName,
        error: status.error ?? null,
      }));
    } catch (err) {
      setBtError((err as Error)?.message || "Failed to refresh Bluetooth status");
    } finally {
      setBtLoading(false);
    }
  }, []);

  // Bootstrap on open
  useEffect(() => {
    if (open) {
      fetchSystemInfo();
      fetchWallpapers();
      fetchUptime();
      fetchFirewallStatus();
      refreshBluetooth();
    }
  }, [open, fetchSystemInfo, fetchWallpapers, fetchUptime, fetchFirewallStatus, refreshBluetooth]);

  const hardware: HardwareInfo | undefined = systemStats?.hardware;

  // Merge SSE bluetooth into local state
  useEffect(() => {
    setBtStatus((prev) => {
      const next = hardware?.bluetooth ?? null;
      if (!next) return next;
      return {
        ...next,
        devices: next.devices ?? prev?.devices,
        firstName: next.firstName ?? prev?.firstName,
        error: next.error ?? prev?.error ?? null,
      };
    });
  }, [hardware?.bluetooth]);

  // Handlers
  const handleWallpaperSelect = useCallback(
    async (path: string) => {
      onWallpaperChange?.(path);
      setSavingWallpaper(true);
      try {
        await updateSettings({ currentWallpaper: path });
      } catch {
        toast.error("Wallpaper could not be saved. It will reset on refresh.");
      } finally {
        setSavingWallpaper(false);
      }
    },
    [onWallpaperChange],
  );

  const handleLogout = useCallback(async () => {
    const res = await fetch("/api/auth/logout", { method: "POST" });
    if (res.ok) {
      toast.success("Logged out");
      router.push("/login");
    } else {
      toast.error("Failed to log out");
    }
  }, [router]);

  const handleRestart = useCallback(async () => {
    const result = await requestReboot();
    if (result.ok) toast.success("Restarting system...");
    else toast.error(result.error ?? "Restart failed");
  }, [requestReboot]);

  const handleShutdown = useCallback(async () => {
    const res = await fetch("/api/system/shutdown", { method: "POST" });
    if (res.ok) toast.success("Shutting down...");
    else toast.error("Shutdown failed");
  }, []);

  const handleCheckUpdate = useCallback(async () => {
    setCheckingUpdate(true);
    try {
      const status = await checkForUpdates();
      setUpdateStatus(status);
      toast.success(status.message || "Update check completed");
    } catch {
      toast.error("Failed to check for updates");
    } finally {
      setCheckingUpdate(false);
    }
  }, []);

  const handleToggleBluetooth = useCallback(async (enabled: boolean) => {
    setBtLoading(true);
    setBtError(null);
    try {
      const result = await setBluetoothPower(enabled);
      setBtStatus((prev) => ({
        ...(prev ?? {}),
        ...result.status,
        devices: prev?.devices,
        firstName: prev?.firstName,
        error: result.status.error ?? null,
      }));
      if (result.success) {
        toast.success(enabled ? "Bluetooth enabled" : "Bluetooth disabled");
      } else {
        const msg = result.error || "Failed to change Bluetooth state";
        setBtError(msg);
        toast.error(msg);
      }
    } catch (error) {
      const msg = (error as Error)?.message || "Failed to change Bluetooth state";
      setBtError(msg);
      toast.error(msg);
    } finally {
      setBtLoading(false);
    }
  }, []);

  const handleFirewallDialogChange = useCallback(
    (isOpen: boolean) => {
      setFirewallDialogOpen(isOpen);
      if (!isOpen) fetchFirewallStatus();
    },
    [fetchFirewallStatus],
  );

  const handleNetworkDevicesChange = useCallback(
    (devices: LanDevice[], error: string | null) => {
      setLanDevices(devices);
      setLanDevicesError(error);
    },
    [],
  );

  const bluetoothDisplay = bluetoothStatus ?? hardware?.bluetooth ?? null;

  return {
    // SSE data
    systemStats,
    storageStats,
    hardware,
    // Static data
    systemInfo,
    wallpapers,
    wallpapersLoading,
    firewallEnabled,
    lanDevices,
    lanDevicesLoading,
    lanDevicesError,
    updateStatus,
    checkingUpdate,
    savingWallpaper,
    uptimeLabel: formatUptime(uptimeSeconds || 0),
    // Bluetooth
    bluetoothDisplay,
    bluetoothLoading,
    bluetoothError,
    // Dialog states
    wifiDialogOpen,
    setWifiDialogOpen,
    firewallDialogOpen,
    systemDetailsOpen,
    setSystemDetailsOpen,
    storageDialogOpen,
    setStorageDialogOpen,
    networkDevicesOpen,
    setNetworkDevicesOpen,
    logsDialogOpen,
    setLogsDialogOpen,
    advancedDialogOpen,
    setAdvancedDialogOpen,
    // Handlers
    fetchLanDevices,
    handleWallpaperSelect,
    handleLogout,
    handleRestart,
    handleShutdown,
    handleCheckUpdate,
    handleToggleBluetooth,
    refreshBluetooth,
    handleFirewallDialogChange,
    handleNetworkDevicesChange,
    formatBytes,
    getMetricColor,
  };
}
