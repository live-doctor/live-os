"use server";

import { execFileAsync } from "@/lib/exec";

const HEALTH_TIMEOUT_MS = 4000;

export type ServiceHealth = {
  ok: boolean;
  error?: string;
};

type ExecError = NodeJS.ErrnoException & {
  stdout?: string;
  stderr?: string;
};

const shouldSkipSystemdCheck = (error: ExecError): boolean => {
  const output = `${error.stdout || ""}\n${error.stderr || ""}`.toLowerCase();
  return (
    output.includes("system has not been booted with systemd") ||
    output.includes("failed to connect to bus")
  );
};

async function commandExists(cmd: string, args: string[]): Promise<boolean> {
  try {
    await execFileAsync(cmd, args, { timeout: HEALTH_TIMEOUT_MS });
    return true;
  } catch (error) {
    const err = error as ExecError;
    return err.code !== "ENOENT";
  }
}

async function readServiceState(service: string): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync("systemctl", ["is-active", service], {
      timeout: HEALTH_TIMEOUT_MS,
    });
    const state = stdout.trim().toLowerCase();
    return state || "unknown";
  } catch (error) {
    const err = error as ExecError;
    if (err.code === "ENOENT" || shouldSkipSystemdCheck(err)) return null;

    const state = (err.stdout || "").trim().toLowerCase();
    return state || "unknown";
  }
}

async function tryStartService(service: string): Promise<void> {
  try {
    await execFileAsync(
      "systemctl",
      ["enable", "--now", service],
      { timeout: HEALTH_TIMEOUT_MS },
    );
  } catch {
    // Best effort only. If this fails we return a user-facing hint.
  }
}

async function checkServiceIsActive(
  service: string,
  hint: string,
): Promise<ServiceHealth> {
  const initialState = await readServiceState(service);
  if (initialState === null || initialState === "active") return { ok: true };

  await tryStartService(service);
  const nextState = await readServiceState(service);
  if (nextState === null || nextState === "active") return { ok: true };

  return {
    ok: false,
    error: `${service} service is ${nextState}. ${hint}`,
  };
}

export async function checkNetworkManagerHealth(): Promise<ServiceHealth> {
  const hasNmcli = await commandExists("nmcli", ["--version"]);
  if (!hasNmcli) {
    return {
      ok: false,
      error:
        "nmcli not found. Install NetworkManager: sudo apt-get install -y network-manager",
    };
  }

  return checkServiceIsActive(
    "NetworkManager",
    "Run: sudo systemctl enable --now NetworkManager",
  );
}

export async function checkBluetoothDaemonHealth(): Promise<ServiceHealth> {
  const hasBluetoothctl = await commandExists("bluetoothctl", ["--version"]);
  if (!hasBluetoothctl) {
    return {
      ok: false,
      error: "bluetoothctl not found. Install bluez utilities.",
    };
  }

  return checkServiceIsActive(
    "bluetooth",
    "Run: sudo systemctl enable --now bluetooth",
  );
}
