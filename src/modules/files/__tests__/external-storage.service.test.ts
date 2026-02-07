import path from "path";
import { describe, expect, it } from "vitest";
import { ensureHomeRoot } from "@/modules/files/domain/path-guard";
import {
  isAllowedExternalDestination,
  migrateToExternalStorageService,
  mountExternalStorageDeviceService,
  parseLsblkDevices,
  unmountExternalStorageDeviceService,
} from "@/modules/files/service/external-storage.service";

describe("external storage service", () => {
  it("parses and filters external devices from lsblk payload", () => {
    const payload = JSON.stringify({
      blockdevices: [
        {
          name: "sda",
          kname: "sda",
          type: "disk",
          size: "931.5G",
          rm: 0,
          tran: "sata",
        },
        {
          name: "sdb",
          kname: "sdb",
          type: "disk",
          size: "58.6G",
          rm: 1,
          tran: "usb",
          children: [
            {
              name: "sdb1",
              kname: "sdb1",
              type: "part",
              size: "58.6G",
              rm: 1,
              tran: "usb",
              fstype: "ext4",
              mountpoint: "/media/usb",
              label: "USB",
            },
          ],
        },
        {
          name: "zram0",
          kname: "zram0",
          type: "disk",
          size: "2G",
          rm: 0,
          tran: null,
        },
      ],
    });

    const devices = parseLsblkDevices(payload);

    expect(devices.some((item) => item.device === "/dev/sda")).toBe(false);
    expect(devices.some((item) => item.device === "/dev/zram0")).toBe(false);
    expect(devices.some((item) => item.device === "/dev/sdb")).toBe(true);
    expect(devices.some((item) => item.device === "/dev/sdb1")).toBe(true);
  });

  it("only allows external migration destinations under /mnt or /media", () => {
    expect(isAllowedExternalDestination("/mnt/usb-drive")).toBe(true);
    expect(isAllowedExternalDestination("/media/user/usb-drive")).toBe(true);
    expect(isAllowedExternalDestination("/run/media/user/usb-drive")).toBe(
      true,
    );
    expect(isAllowedExternalDestination("/opt/data")).toBe(false);
  });

  it("rejects migration to disallowed destinations", async () => {
    const homeRoot = await ensureHomeRoot();
    const sourcePath = path.join(homeRoot, "Documents");

    const result = await migrateToExternalStorageService({
      sourcePath,
      destinationPath: "/opt/external",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Destination must be under /mnt or /media");
  });

  it("rejects invalid mount and unmount device paths", async () => {
    const mountResult = await mountExternalStorageDeviceService("sdb1");
    const unmountResult = await unmountExternalStorageDeviceService("sdb1");

    expect(mountResult.success).toBe(false);
    expect(unmountResult.success).toBe(false);
    expect(mountResult.error).toBe("Invalid device path");
    expect(unmountResult.error).toBe("Invalid device path");
  });
});
