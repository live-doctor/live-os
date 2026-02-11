"use server";

import { execFileAsync } from "@/lib/exec";
import si from "systeminformation";
import { logAction } from "../maintenance/logger";
import { checkNetworkManagerHealth } from "./service-health";
const EXEC_TIMEOUT = 8000;
const RESOLVE_TIMEOUT = 2000;
const MAX_REVERSE_LOOKUPS = 16;
const MAX_HOSTNAME_LOOKUPS = 12;
const currentUser = () =>
  process.env.SUDO_USER || process.env.LOGNAME || process.env.USER || "unknown";
const logNet = (
  event: string,
  meta: Record<string, unknown> = {},
  level: "info" | "warn" | "error" = "info",
) => logAction(event, { user: currentUser(), ...meta }, level);

export type WifiNetwork = {
  ssid: string;
  security: string;
  signal: number;
  connected?: boolean;
};

export type WifiListResult = {
  networks: WifiNetwork[];
  error?: string;
  warning?: string;
};

export type LanDevice = {
  ip: string;
  name?: string;
  mac?: string;
  source: "avahi" | "arp";
};

export type LanDevicesResult = {
  devices: LanDevice[];
  error?: string;
};

export type WifiRadioState = {
  enabled: boolean | null;
  error?: string;
};

export async function getWifiRadioState(): Promise<WifiRadioState> {
  const health = await checkNetworkManagerHealth();
  if (!health.ok) return { enabled: null, error: health.error };

  try {
    const { stdout } = await execFileAsync("nmcli", ["radio", "wifi"], {
      timeout: EXEC_TIMEOUT,
    });
    const state = stdout.trim().toLowerCase();
    if (state === "enabled" || state === "disabled") {
      return { enabled: state === "enabled" };
    }
    return { enabled: null, error: `Unexpected state: ${state}` };
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    const message = err?.message || "Failed to read WiFi state";
    await logNet("network:wifi:radio:error", { error: message }, "error");
    return { enabled: null, error: message };
  }
}

export async function setWifiRadio(enabled: boolean): Promise<WifiRadioState> {
  const health = await checkNetworkManagerHealth();
  if (!health.ok) return { enabled: null, error: health.error };

  try {
    await execFileAsync("nmcli", ["radio", "wifi", enabled ? "on" : "off"], {
      timeout: EXEC_TIMEOUT,
    });
    await logNet("network:wifi:radio:set", { enabled });
    return { enabled };
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    const message = err?.message || "Failed to change WiFi state";
    await logNet("network:wifi:radio:set:error", { error: message }, "error");
    return { enabled: null, error: message };
  }
}

// Decode avahi escaped characters (e.g. \032 for space)
const decodeAvahiValue = (value: string): string =>
  value
    .replace(/\\(\d{3})/g, (_, oct) =>
      String.fromCharCode(parseInt(oct as string, 10)),
    )
    .trim();

function dedupeNetworks(networks: WifiNetwork[]): WifiNetwork[] {
  const strongestBySsid = new Map<string, WifiNetwork>();

  for (const network of networks) {
    const existing = strongestBySsid.get(network.ssid);
    if (!existing || network.signal > existing.signal) {
      strongestBySsid.set(network.ssid, network);
    } else if (existing) {
      // Preserve connected flag if any duplicate reports a connection
      strongestBySsid.set(network.ssid, {
        ...existing,
        connected: existing.connected || network.connected,
      });
    }
  }

  return Array.from(strongestBySsid.values()).sort(
    (a, b) => b.signal - a.signal,
  );
}

function sanitizeSsid(value: string): string {
  return value
    .replace(/^nmcli\s*/i, "")
    .replace(/^"+|"+$/g, "")
    .trim();
}

function splitNmcliFields(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let escaped = false;

  for (const char of line) {
    if (escaped) {
      current += char;
      escaped = false;
      continue;
    }

    if (char === "\\") {
      escaped = true;
      continue;
    }

    if (char === ":") {
      fields.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  fields.push(current);
  return fields;
}

function parseNmcliActive(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return normalized === "yes" || normalized === "1" || normalized === "true" || normalized === "*";
}

async function getActiveWifiSsids(): Promise<string[]> {
  try {
    const { stdout } = await execFileAsync(
      "nmcli",
      ["-t", "-f", "TYPE,NAME", "connection", "show", "--active"],
      { timeout: EXEC_TIMEOUT },
    );

    return stdout
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => splitNmcliFields(line))
      .filter(([type]) => (type || "").toLowerCase() === "wifi")
      .map(([, name]) => sanitizeSsid(name || ""))
      .filter(Boolean);
  } catch {
    return [];
  }
}

async function getWifiDeviceStatusLine(): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync(
      "nmcli",
      ["-t", "-f", "DEVICE,TYPE,STATE", "device", "status"],
      { timeout: EXEC_TIMEOUT },
    );

    const wifiLines = stdout
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => splitNmcliFields(line))
      .filter(([, type]) => (type || "").toLowerCase() === "wifi");

    if (wifiLines.length === 0) return "No Wi-Fi interface detected";

    return wifiLines
      .map(([device, , state]) => `${device || "wifi"}=${state || "unknown"}`)
      .join(", ");
  } catch {
    return null;
  }
}

export async function listWifiNetworks(): Promise<WifiListResult> {
  await logNet("network:wifi:list:start");
  const errors: string[] = [];
  const connectedSsids = new Set<string>();
  const finish = async (source: string, result: WifiListResult) => {
    await logNet("network:wifi:list:result", {
      source,
      count: result.networks.length,
      warning: result.warning,
      error: result.error,
    });
    return result;
  };
  await logNet("network:wifi:list:debug", {
    message: "Scanning for networks...",
  });

  const health = await checkNetworkManagerHealth();
  if (!health.ok) {
    return finish("health-check", {
      networks: [],
      error: health.error,
    });
  }

  // Try to detect the currently connected SSID
  try {
    if (typeof si.wifiConnections === "function") {
      const connections = await si.wifiConnections();
      connections?.forEach((conn) => {
        if (conn?.ssid) connectedSsids.add(conn.ssid);
      });
    }
  } catch {
    // Ignore connection detection failures
  }

  const activeNmcliSsids = await getActiveWifiSsids();
  activeNmcliSsids.forEach((ssid) => connectedSsids.add(ssid));

  // Try systeminformation first with timeout
  try {
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Timeout after 5s")), 5000),
    );
    const wifiNetworks = await Promise.race([
      si.wifiNetworks(),
      timeoutPromise,
    ]);
    if (Array.isArray(wifiNetworks) && wifiNetworks.length > 0) {
      await logNet("network:wifi:list:systeminformation", {
        count: wifiNetworks.length,
      });
      return finish("systeminformation", {
        networks: dedupeNetworks(
          wifiNetworks
            .map((network) => ({
              ssid: sanitizeSsid(network.ssid || ""),
              security: Array.isArray(network.security)
                ? network.security.join(", ")
                : network.security || "",
              signal: Number(network.quality ?? network.signalLevel ?? 0) || 0,
              connected: connectedSsids.has(sanitizeSsid(network.ssid || "")),
            }))
            .filter((n) => n.ssid),
        ),
      });
    }
  } catch (error) {
    const msg = (error as Error)?.message || "Unknown error";
    await logNet(
      "network:wifi:list:systeminformation:error",
      { error: msg },
      "error",
    );
    errors.push(`systeminformation: ${msg}`);
  }

  // Fallback to nmcli if systeminformation fails or returns nothing
  try {
    // Force rescan before listing
    try {
      await execFileAsync("nmcli", ["device", "wifi", "rescan"], {
        timeout: EXEC_TIMEOUT,
      });
      // Wait a moment for scan to complete
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch {
      // Rescan might fail if already scanning, continue anyway
    }

    const { stdout, stderr } = await execFileAsync(
      "nmcli",
      ["-t", "-f", "ACTIVE,SSID,SECURITY,SIGNAL", "device", "wifi", "list"],
      {
        timeout: EXEC_TIMEOUT,
      },
    );

    const networks = stdout
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [active = "", ssid = "", security = "", signal = "0"] =
          splitNmcliFields(line);
        const isActive = parseNmcliActive(active);
        const cleanSsid = sanitizeSsid(ssid);
        if (isActive && cleanSsid) connectedSsids.add(cleanSsid);
        return {
          ssid: cleanSsid,
          security,
          signal: Number(signal) || 0,
          connected: isActive,
        };
      })
      .filter((n) => n.ssid)
      .sort((a, b) => b.signal - a.signal);

    if (networks.length === 0 && connectedSsids.size > 0) {
      const nmcliStderr = stderr?.trim();
      const deviceState = await getWifiDeviceStatusLine();
      const warningParts = [
        "WiFi scan returned no nearby networks. Showing current connection(s) only.",
      ];
      if (deviceState) warningParts.push(`Interfaces: ${deviceState}`);
      if (nmcliStderr) warningParts.push(`nmcli: ${nmcliStderr.split("\n")[0]}`);
      const connectedOnly = Array.from(connectedSsids).map((ssid) => ({
        ssid,
        security: "",
        signal: 100,
        connected: true,
      }));
      return finish("nmcli-connected-fallback", {
        networks: dedupeNetworks(connectedOnly),
        warning: warningParts.join(" "),
      });
    }

    if (networks.length === 0) {
      return finish("nmcli-empty", {
        networks: [],
        warning:
          "No WiFi networks found. This could mean:\n• No WiFi adapter detected\n• WiFi is disabled\n• No networks in range",
      });
    }

    return finish("nmcli", { networks: dedupeNetworks(networks) });
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    await logNet(
      "network:wifi:list:nmcli:error",
      {
        error: err?.message || "unknown",
        code: err?.code,
      },
      "error",
    );

    if (err.code === "ENOENT") {
      errors.push("nmcli: command not found (NetworkManager not installed)");
    } else if (err.message?.includes("No Wi-Fi device found")) {
      return finish("nmcli-no-adapter", {
        networks: [],
        error: "No WiFi adapter found on this system.",
      });
    } else if (err.message?.includes("not running")) {
      errors.push("nmcli: NetworkManager is not running");
    } else if (err.message?.toLowerCase?.().includes("scanning not allowed")) {
      errors.push(
        "nmcli: Scanning not allowed (device unavailable or unmanaged)",
      );
    } else {
      errors.push(`nmcli: ${err.message || "Unknown error"}`);
    }
  }

  // Both methods failed
  await logNet(
    "network:wifi:list:failed",
    {
      errors: errors.length ? errors : undefined,
      warning: errors.length
        ? "Scanning failed; see errors array"
        : "Unknown WiFi scan failure",
    },
    "error",
  );
  return finish("failed", {
    networks: [],
    error: `Failed to scan WiFi networks.\n${errors.join("\n")}`,
  });
}

export async function connectToWifi(
  ssid: string,
  password?: string,
): Promise<{ success: boolean; error?: string }> {
  const health = await checkNetworkManagerHealth();
  if (!health.ok) return { success: false, error: health.error };

  if (!ssid.trim()) {
    return { success: false, error: "SSID is required" };
  }

  const args = ["device", "wifi", "connect", ssid];
  if (password && password.trim().length > 0) {
    args.push("password", password.trim());
  }

  try {
    await execFileAsync("nmcli", args, { timeout: EXEC_TIMEOUT });
    await logNet("network:wifi:connect:success", { ssid });
    return { success: true };
  } catch (error) {
    await logNet(
      "network:wifi:connect:error",
      {
        ssid,
        error: (error as Error)?.message || "failed",
        output: (error as Error & { stdout?: string })?.stdout || undefined,
      },
      "error",
    );
    return {
      success: false,
      error: (error as Error)?.message || "Failed to connect",
    };
  }
}

/**
 * Discover LAN devices using avahi-browse (mDNS) and arp/arp-scan.
 * Returns a deduped list of devices with best-effort names and IPs.
 */
export async function listLanDevices(): Promise<LanDevicesResult> {
  await logNet("network:lan:list:start");
  const devices = new Map<string, LanDevice>(); // key by IP
  const errors: string[] = [];
  let avahiResolved = false;
  const upsertDevice = (
    ip: string,
    partial: Partial<Omit<LanDevice, "ip">> & { source?: LanDevice["source"] },
  ) => {
    if (!ip) return;
    const current = devices.get(ip);
    const source =
      partial.source === "avahi" || current?.source === "avahi"
        ? "avahi"
        : (partial.source ?? current?.source ?? "arp");
    devices.set(ip, {
      ip,
      mac: partial.mac ?? current?.mac,
      name: partial.name ?? current?.name,
      source,
    });
  };

  // mDNS via avahi-browse
  try {
    const { stdout } = await execFileAsync("avahi-browse", ["-art"], {
      timeout: EXEC_TIMEOUT,
    });
    avahiResolved = true;
    stdout
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.startsWith("="))
      .forEach((line) => {
        const parts = line.split(";");
        // Expected: =;iface;PROTO;NAME;TYPE;DOMAIN;HOST;ADDRESS;PORT;
        if (parts.length >= 8) {
          const name = decodeAvahiValue(parts[3] || "");
          const host = decodeAvahiValue(parts[6] || "").replace(
            /\.local\.?$/,
            "",
          );
          const ip = parts[7];
          const displayName = host || name;
          if (ip)
            upsertDevice(ip, {
              name: displayName || undefined,
              source: "avahi",
            });
        }
      });
  } catch (error) {
    const message = (error as Error)?.message || "failed";
    errors.push(`avahi-browse: ${message}`);
  }

  // Fallback: discover hostnames only and resolve to IPs if possible
  try {
    const { stdout } = await execFileAsync("avahi-browse", ["-at"], {
      timeout: EXEC_TIMEOUT,
    });
    const hosts = new Set<string>();
    stdout
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .forEach((line) => {
        const parts = line.split(/\s+/);
        // Example: = eth0 IPv4 My-Device _workstation._tcp local
        if (parts.length >= 5 && parts[5]?.includes("local")) {
          hosts.add(decodeAvahiValue(parts[3] || ""));
        }
      });

    for (const hostRaw of Array.from(hosts).slice(0, MAX_HOSTNAME_LOOKUPS)) {
      const host = hostRaw.replace(/\.local\.?$/, "");
      if (!host) continue;
      try {
        const { stdout: resolved } = await execFileAsync(
          "avahi-resolve-host-name",
          [`${host}.local`],
          { timeout: RESOLVE_TIMEOUT },
        );
        const ip = resolved.split(/\s+/)[1];
        if (ip) {
          upsertDevice(ip, { name: host, source: "avahi" });
        }
      } catch {
        // Ignore individual resolution failures
      }
    }
  } catch (error) {
    if (!avahiResolved) {
      const message = (error as Error)?.message || "failed";
      errors.push(`avahi-browse(-t): ${message}`);
    }
  }

  // ARP scan (arp-scan or arp -a)

  try {
    const { stdout } = await execFileAsync(
      "arp-scan",
      ["-l", "--numeric", "--plain"],
      { timeout: EXEC_TIMEOUT },
    );
    stdout
      .split("\n")
      .map((line) => line.trim())
      .forEach((line) => {
        // Format: IP<TAB>MAC<TAB>VENDOR
        const parts = line.split(/\s+/);
        if (parts.length >= 2 && parts[0].match(/^\d{1,3}(\.\d{1,3}){3}$/)) {
          upsertDevice(parts[0], { mac: parts[1], source: "arp" });
        }
      });
  } catch {
    // Fallback to arp -a
    try {
      const { stdout } = await execFileAsync("arp", ["-a"], {
        timeout: EXEC_TIMEOUT,
      });
      stdout
        .split("\n")
        .map((line) => line.trim())
        .forEach((line) => {
          // Format: ? (192.168.1.1) at aa:bb:cc:dd:ee:ff [ether] on eth0
          const match = line.match(
            /\((\d{1,3}(?:\.\d{1,3}){3})\).*? at ([0-9a-f:]{11,})/i,
          );
          if (match) {
            upsertDevice(match[1], { mac: match[2], source: "arp" });
          }
        });
    } catch (err: unknown) {
      const message = (err as Error)?.message || "failed";
      errors.push(`arp: ${message}`);
    }
  }

  // Best-effort reverse lookup for entries without names using mDNS
  const toResolve = Array.from(devices.values())
    .filter((d) => !d.name)
    .slice(0, MAX_REVERSE_LOOKUPS);

  for (const device of toResolve) {
    try {
      const { stdout } = await execFileAsync(
        "avahi-resolve-address",
        [device.ip],
        { timeout: RESOLVE_TIMEOUT },
      );
      // Format: 192.168.1.10\tMy-Device.local
      const host = stdout.split(/\s+/)[1]?.replace(/\.local\.?$/, "");
      const cleanHost = host ? decodeAvahiValue(host) : "";
      if (cleanHost) {
        upsertDevice(device.ip, { name: cleanHost });
      }
    } catch {
      // Ignore individual lookup failures
    }
  }

  const result = Array.from(devices.values()).sort((a, b) =>
    a.ip.localeCompare(b.ip),
  );

  await logNet("network:lan:list:done", {
    count: result.length,
    errors: errors.length ? errors : undefined,
  });

  return {
    devices: result,
    error: errors.length ? errors.join("; ") : undefined,
  };
}
