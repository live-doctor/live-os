"use server";

import si from "systeminformation";
import { execAsync } from "@/lib/exec";
import { withActionLogging } from "../maintenance/logger";
import {
  listExternalStorageDevicesService,
  migrateToExternalStorageService,
  mountExternalStorageDeviceService,
  type ExternalStorageDevice,
  unmountExternalStorageDeviceService,
} from "@/modules/files/service/external-storage.service";

export type StorageInfo = {
  disks: si.Systeminformation.DiskLayoutData[];
  partitions: si.Systeminformation.BlockDevicesData[];
  volumes: si.Systeminformation.FsSizeData[];
  dfOutput: string | null;
  lsblkOutput: string | null;
};

export type ExternalStorageInfo = {
  devices: ExternalStorageDevice[];
};

export async function getStorageInfo(): Promise<StorageInfo> {
  return withActionLogging("storage:inspect", async () => {
    const [disks, partitions, volumes, dfOutput, lsblkOutput] = await Promise.all([
      si.diskLayout().catch(() => []),
      si.blockDevices().catch(() => []),
      si.fsSize().catch(() => []),
      runCommandSafe("df -h"),
      runCommandSafe("lsblk -f"),
    ]);

    return {
      disks,
      partitions,
      volumes,
      dfOutput,
      lsblkOutput,
    };
  });
}

async function runCommandSafe(command: string): Promise<string | null> {
  try {
    const { stdout } = await execAsync(command, { maxBuffer: 512 * 1024 });
    return stdout.trim();
  } catch (error) {
    console.warn(`[storage] Failed to run command ${command}:`, error);
    return null;
  }
}

export async function listExternalStorageDevices(): Promise<ExternalStorageInfo> {
  return withActionLogging("storage:external:list", async () => {
    const devices = await listExternalStorageDevicesService();
    return { devices };
  });
}

export async function mountExternalStorageDevice(
  device: string,
): Promise<{ success: boolean; mountPoint?: string; error?: string }> {
  return withActionLogging("storage:external:mount", async () =>
    mountExternalStorageDeviceService(device),
  );
}

export async function unmountExternalStorageDevice(
  device: string,
): Promise<{ success: boolean; error?: string }> {
  return withActionLogging("storage:external:unmount", async () =>
    unmountExternalStorageDeviceService(device),
  );
}

export async function migrateToExternalStorage(input: {
  sourcePath: string;
  destinationPath: string;
  deleteSource?: boolean;
}): Promise<{ success: boolean; error?: string }> {
  return withActionLogging("storage:external:migrate", async () =>
    migrateToExternalStorageService(input),
  );
}
