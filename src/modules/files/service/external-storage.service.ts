import fs from "fs/promises";
import path from "path";
import { execFileAsync } from "@/lib/exec";
import { validatePath } from "../domain/path-guard";
import type { ActionResult } from "../domain/files.types";

type LsblkNode = {
  name?: string;
  kname?: string;
  type?: string;
  size?: string;
  fstype?: string | null;
  mountpoint?: string | null;
  rm?: number;
  ro?: number;
  tran?: string | null;
  model?: string | null;
  label?: string | null;
  uuid?: string | null;
  children?: LsblkNode[];
};

export type ExternalStorageDevice = {
  id: string;
  device: string;
  kind: "disk" | "partition";
  size: string;
  fsType?: string;
  mountPoint?: string;
  removable: boolean;
  transport?: string;
  model?: string;
  label?: string;
  readOnly: boolean;
};

const EXTERNAL_DESTINATION_ROOTS = ["/mnt", "/media", "/run/media"];

function isExternalTransport(value?: string | null): boolean {
  if (!value) {
    return false;
  }
  return ["usb", "mmc", "nvme"].includes(value.toLowerCase());
}

export function isAllowedExternalDestination(destinationPath: string): boolean {
  const resolved = path.resolve(destinationPath);
  return EXTERNAL_DESTINATION_ROOTS.some(
    (root) => resolved === root || resolved.startsWith(`${root}${path.sep}`),
  );
}

function collectNodes(node: LsblkNode, sink: LsblkNode[]): void {
  sink.push(node);
  for (const child of node.children || []) {
    collectNodes(child, sink);
  }
}

export function parseLsblkDevices(payload: string): ExternalStorageDevice[] {
  const parsed = JSON.parse(payload) as { blockdevices?: LsblkNode[] };
  const nodes: LsblkNode[] = [];
  for (const root of parsed.blockdevices || []) {
    collectNodes(root, nodes);
  }

  return nodes
    .filter((node) => node.type === "disk" || node.type === "part")
    .filter((node) => node.name && node.kname)
    .filter((node) => {
      if ((node.rm ?? 0) === 1) {
        return true;
      }
      return isExternalTransport(node.tran);
    })
    .filter((node) => !String(node.kname).startsWith("loop"))
    .filter((node) => !String(node.kname).startsWith("zram"))
    .map((node) => ({
      id: node.uuid || node.kname || node.name || "unknown",
      device: `/dev/${node.kname}`,
      kind: node.type === "part" ? "partition" : "disk",
      size: node.size || "0B",
      fsType: node.fstype || undefined,
      mountPoint: node.mountpoint || undefined,
      removable: (node.rm ?? 0) === 1,
      transport: node.tran || undefined,
      model: node.model || undefined,
      label: node.label || undefined,
      readOnly: (node.ro ?? 0) === 1,
    }));
}

export async function listExternalStorageDevicesService(): Promise<
  ExternalStorageDevice[]
> {
  const { stdout } = await execFileAsync("lsblk", [
    "-J",
    "-o",
    "NAME,KNAME,TYPE,SIZE,FSTYPE,MOUNTPOINT,RM,RO,TRAN,MODEL,LABEL,UUID",
  ]);
  return parseLsblkDevices(stdout);
}

export async function mountExternalStorageDeviceService(
  device: string,
): Promise<ActionResult & { mountPoint?: string }> {
  if (!device.startsWith("/dev/")) {
    return { success: false, error: "Invalid device path" };
  }

  try {
    const { stdout } = await execFileAsync("udisksctl", ["mount", "-b", device], {
      timeout: 15000,
    });
    const match = stdout.match(/ at (.+)\.?$/i);
    return { success: true, mountPoint: match?.[1]?.trim() };
  } catch {
    // Fallback for systems without udisksctl.
    try {
      const target = path.join("/mnt", path.basename(device));
      await fs.mkdir(target, { recursive: true });
      await execFileAsync("mount", [device, target], { timeout: 15000 });
      return { success: true, mountPoint: target };
    } catch (error) {
      return {
        success: false,
        error: (error as Error)?.message || "Failed to mount device",
      };
    }
  }
}

export async function unmountExternalStorageDeviceService(
  device: string,
): Promise<ActionResult> {
  if (!device.startsWith("/dev/")) {
    return { success: false, error: "Invalid device path" };
  }

  try {
    await execFileAsync("udisksctl", ["unmount", "-b", device], {
      timeout: 15000,
    });
    return { success: true };
  } catch {
    try {
      await execFileAsync("umount", [device], { timeout: 15000 });
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: (error as Error)?.message || "Failed to unmount device",
      };
    }
  }
}

export async function migrateToExternalStorageService(input: {
  sourcePath: string;
  destinationPath: string;
  deleteSource?: boolean;
}): Promise<ActionResult> {
  const sourceValidation = await validatePath(input.sourcePath);
  if (!sourceValidation.valid) {
    return { success: false, error: "Invalid source path" };
  }

  if (!isAllowedExternalDestination(input.destinationPath)) {
    return { success: false, error: "Destination must be under /mnt or /media" };
  }

  try {
    await fs.mkdir(input.destinationPath, { recursive: true });
    await execFileAsync(
      "rsync",
      ["-a", "--human-readable", `${sourceValidation.sanitized}/`, `${input.destinationPath}/`],
      { timeout: 120000 },
    );

    if (input.deleteSource) {
      await fs.rm(sourceValidation.sanitized, { recursive: true, force: true });
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: (error as Error)?.message || "Failed to migrate files",
    };
  }
}
