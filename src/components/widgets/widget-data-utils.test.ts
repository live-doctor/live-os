import { describe, expect, it } from "vitest";
import {
  buildNetworkWidgetData,
  DEFAULT_CUSTOM_WIDGETS,
  mergeCustomWidgets,
} from "./widget-data-utils";

describe("mergeCustomWidgets", () => {
  it("returns defaults when input is invalid", () => {
    const merged = mergeCustomWidgets(null);
    expect(merged).toEqual(DEFAULT_CUSTOM_WIDGETS);
  });

  it("sanitizes custom text and keeps fallback values", () => {
    const merged = mergeCustomWidgets({
      "homeio:custom-1": {
        title: "  Deploy   Checklist  ",
        body: "  Restart api container  ",
      },
      "homeio:custom-2": {
        title: " ",
        body: "",
      },
    });

    expect(merged["homeio:custom-1"].title).toBe("Deploy Checklist");
    expect(merged["homeio:custom-1"].body).toBe("Restart api container");
    expect(merged["homeio:custom-2"].title).toBe(
      DEFAULT_CUSTOM_WIDGETS["homeio:custom-2"].title,
    );
    expect(merged["homeio:custom-2"].body).toBe(
      DEFAULT_CUSTOM_WIDGETS["homeio:custom-2"].body,
    );
  });
});

describe("buildNetworkWidgetData", () => {
  it("builds network widget payload from runtime stats", () => {
    const data = buildNetworkWidgetData(
      { uploadMbps: 12.34, downloadMbps: 56.78 },
      {
        cpu: { usage: 0, temperature: 0, power: 0 },
        memory: { usage: 0, total: 0, used: 0, free: 0 },
        hardware: {
          network: {
            iface: "eth0",
            type: "wired",
            ip4: "192.168.1.5",
            mac: "00:00:00:00:00:00",
            speed: 1000,
            mtu: 1500,
          },
        },
      },
    );

    expect(data.uploadMbps).toBe(12.34);
    expect(data.downloadMbps).toBe(56.78);
    expect(data.interfaceName).toBe("eth0");
    expect(data.ip4).toBe("192.168.1.5");
    expect(data.connected).toBe(true);
  });

  it("falls back safely on missing/invalid stats", () => {
    const data = buildNetworkWidgetData(
      { uploadMbps: Number.NaN, downloadMbps: -1 },
      null,
    );

    expect(data.uploadMbps).toBe(0);
    expect(data.downloadMbps).toBe(0);
    expect(data.interfaceName).toBe("Unknown");
    expect(data.ip4).toBe("Unavailable");
    expect(data.connected).toBe(false);
  });
});
