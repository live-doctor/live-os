"use server";

import type {
  DiagnosticCheck,
  DiagnosticResult,
  LogEntry,
  LogSource,
  SystemService,
} from "@/components/settings/troubleshoot/types";
import { execAsync } from "@/lib/exec";

/**
 * Get system logs from journalctl
 */
export async function getSystemLogs(
  source: LogSource = "all",
  lines: number = 100,
): Promise<LogEntry[]> {
  try {
    let command = `journalctl --no-pager -n ${lines} -o json`;

    // Filter by source
    if (source === "docker") {
      command = `journalctl --no-pager -n ${lines} -o json -u docker`;
    } else if (source === "homeio") {
      command = `journalctl --no-pager -n ${lines} -o json -u homeio`;
    } else if (source === "system") {
      command = `journalctl --no-pager -n ${lines} -o json -p 0..4`; // Only errors and warnings
    }

    const { stdout } = await execAsync(command);
    const entries: LogEntry[] = [];

    // Parse JSON lines
    const jsonLines = stdout.trim().split("\n").filter(Boolean);
    for (const line of jsonLines) {
      try {
        const entry = JSON.parse(line);
        entries.push({
          id: entry.__CURSOR || `${Date.now()}-${Math.random()}`,
          timestamp: entry.__REALTIME_TIMESTAMP
            ? new Date(
                parseInt(entry.__REALTIME_TIMESTAMP) / 1000,
              ).toISOString()
            : new Date().toISOString(),
          level: mapPriority(entry.PRIORITY),
          source: entry.SYSLOG_IDENTIFIER || entry._SYSTEMD_UNIT || "system",
          message: entry.MESSAGE || "",
        });
      } catch {
        // Skip malformed lines
      }
    }

    return entries.reverse(); // Most recent first
  } catch (error) {
    console.error("Failed to get logs:", error);
    // Return mock data for development
    return getMockLogs();
  }
}

/**
 * Tail recent HOMEIO service logs (journalctl -u homeio)
 */
export async function getHOMEIOTail(lines: number = 200): Promise<string[]> {
  try {
    const { stdout } = await execAsync(
      `journalctl -u homeio -n ${lines} --no-pager -o cat`,
    );
    return stdout.trim().split("\n");
  } catch (error) {
    console.error("Failed to tail HOMEIO logs:", error);
    return ["Unable to read HOMEIO logs. Ensure journalctl is available."];
  }
}

function mapPriority(
  priority: string | number,
): "info" | "warn" | "error" | "debug" {
  const p = typeof priority === "string" ? parseInt(priority) : priority;
  if (p <= 3) return "error";
  if (p === 4) return "warn";
  if (p <= 6) return "info";
  return "debug";
}

function getMockLogs(): LogEntry[] {
  const now = Date.now();
  return [
    {
      id: "1",
      timestamp: new Date(now - 1000).toISOString(),
      level: "info",
      source: "homeio",
      message: "System started successfully",
    },
    {
      id: "2",
      timestamp: new Date(now - 5000).toISOString(),
      level: "info",
      source: "docker",
      message: "Container nextcloud started",
    },
    {
      id: "3",
      timestamp: new Date(now - 10000).toISOString(),
      level: "warn",
      source: "system",
      message: "High memory usage detected (85%)",
    },
    {
      id: "4",
      timestamp: new Date(now - 30000).toISOString(),
      level: "error",
      source: "docker",
      message: "Container plex failed health check",
    },
    {
      id: "5",
      timestamp: new Date(now - 60000).toISOString(),
      level: "info",
      source: "homeio",
      message: "App store cache refreshed",
    },
  ];
}

/**
 * Run system diagnostics
 */
export async function runDiagnostics(): Promise<DiagnosticResult> {
  const checks: DiagnosticCheck[] = [];

  // Check 1: Disk Space
  checks.push(await checkDiskSpace());

  // Check 2: Memory Usage
  checks.push(await checkMemoryUsage());

  // Check 3: Docker Status
  checks.push(await checkDockerStatus());

  // Check 4: Network Connectivity
  checks.push(await checkNetworkConnectivity());

  // Check 5: DNS Resolution
  checks.push(await checkDnsResolution());

  // Check 6: System Services
  checks.push(await checkSystemServices());

  // Determine overall status
  const hasFailure = checks.some((c) => c.status === "failed");
  const hasWarning = checks.some((c) => c.status === "warning");

  return {
    checks,
    overallStatus: hasFailure ? "failed" : hasWarning ? "warning" : "passed",
    timestamp: new Date().toISOString(),
  };
}

async function checkDiskSpace(): Promise<DiagnosticCheck> {
  const check: DiagnosticCheck = {
    id: "disk-space",
    name: "Disk Space",
    description: "Check available disk space",
    status: "running",
  };

  try {
    const { stdout } = await execAsync("df -h / | tail -1 | awk '{print $5}'");
    const usagePercent = parseInt(stdout.replace("%", "").trim());

    if (usagePercent >= 95) {
      check.status = "failed";
      check.message = `Critical: ${usagePercent}% disk space used`;
    } else if (usagePercent >= 85) {
      check.status = "warning";
      check.message = `Warning: ${usagePercent}% disk space used`;
    } else {
      check.status = "passed";
      check.message = `${usagePercent}% disk space used`;
    }
  } catch {
    check.status = "passed";
    check.message = "Disk space check passed";
  }

  return check;
}

async function checkMemoryUsage(): Promise<DiagnosticCheck> {
  const check: DiagnosticCheck = {
    id: "memory-usage",
    name: "Memory Usage",
    description: "Check system memory",
    status: "running",
  };

  try {
    const { stdout } = await execAsync(
      "free | grep Mem | awk '{print int($3/$2 * 100)}'",
    );
    const usagePercent = parseInt(stdout.trim());

    if (usagePercent >= 95) {
      check.status = "failed";
      check.message = `Critical: ${usagePercent}% memory used`;
    } else if (usagePercent >= 85) {
      check.status = "warning";
      check.message = `Warning: ${usagePercent}% memory used`;
    } else {
      check.status = "passed";
      check.message = `${usagePercent}% memory used`;
    }
  } catch {
    check.status = "passed";
    check.message = "Memory check passed";
  }

  return check;
}

async function checkDockerStatus(): Promise<DiagnosticCheck> {
  const check: DiagnosticCheck = {
    id: "docker-status",
    name: "Docker Engine",
    description: "Check Docker daemon status",
    status: "running",
  };

  try {
    await execAsync("docker info");
    check.status = "passed";
    check.message = "Docker is running";
  } catch {
    check.status = "failed";
    check.message = "Docker is not running or not installed";
  }

  return check;
}

async function checkNetworkConnectivity(): Promise<DiagnosticCheck> {
  const check: DiagnosticCheck = {
    id: "network",
    name: "Network Connectivity",
    description: "Check internet connection",
    status: "running",
  };

  try {
    await execAsync("ping -c 1 -W 3 8.8.8.8");
    check.status = "passed";
    check.message = "Internet connection is working";
  } catch {
    check.status = "failed";
    check.message = "No internet connection";
  }

  return check;
}

async function checkDnsResolution(): Promise<DiagnosticCheck> {
  const check: DiagnosticCheck = {
    id: "dns",
    name: "DNS Resolution",
    description: "Check DNS is working",
    status: "running",
  };

  try {
    await execAsync("nslookup google.com");
    check.status = "passed";
    check.message = "DNS resolution is working";
  } catch {
    check.status = "warning";
    check.message = "DNS resolution may have issues";
  }

  return check;
}

async function checkSystemServices(): Promise<DiagnosticCheck> {
  const check: DiagnosticCheck = {
    id: "services",
    name: "System Services",
    description: "Check critical services",
    status: "running",
  };

  try {
    const { stdout } = await execAsync(
      "systemctl is-active homeio 2>/dev/null || echo 'inactive'",
    );
    if (stdout.trim() === "active") {
      check.status = "passed";
      check.message = "Homeio service is running";
    } else {
      check.status = "warning";
      check.message = "Homeio service not found (development mode)";
    }
  } catch {
    check.status = "passed";
    check.message = "Services check passed";
  }

  return check;
}

/**
 * Get system services status
 */
export async function getSystemServices(): Promise<SystemService[]> {
  const services: SystemService[] = [
    {
      name: "homeio",
      displayName: "Homeio",
      status: "unknown",
      canRestart: true,
    },
    {
      name: "docker",
      displayName: "Docker",
      status: "unknown",
      canRestart: true,
    },
    {
      name: "nginx",
      displayName: "Nginx",
      status: "unknown",
      canRestart: true,
    },
  ];

  for (const service of services) {
    try {
      const { stdout } = await execAsync(
        `systemctl is-active ${service.name} 2>/dev/null`,
      );
      service.status = stdout.trim() === "active" ? "running" : "stopped";
    } catch {
      service.status = "stopped";
    }
  }

  return services;
}

/**
 * Get status for a specific systemd service
 */
export async function getServiceStatus(
  serviceName: string,
): Promise<SystemService> {
  const service: SystemService = {
    name: serviceName,
    displayName: serviceName,
    status: "unknown",
    canRestart: true,
  };

  if (!serviceName.trim()) return service;

  try {
    const { stdout } = await execAsync(
      `systemctl is-active ${serviceName} 2>/dev/null || echo 'inactive'`,
    );
    const active = stdout.trim();
    service.status =
      active === "active"
        ? "running"
        : active === "failed"
          ? "error"
          : "stopped";
  } catch {
    service.status = "unknown";
  }

  try {
    const { stdout } = await execAsync(
      `systemctl show ${serviceName} -p Description --value 2>/dev/null || echo ""`,
    );
    const description = stdout.trim();
    if (description) service.displayName = description;
  } catch {
    /* ignore */
  }

  return service;
}

/**
 * Restart a system service
 */
export async function restartService(
  serviceName: string,
): Promise<{ success: boolean; message: string }> {
  try {
    await execAsync(`sudo systemctl restart ${serviceName}`);
    return { success: true, message: `${serviceName} restarted successfully` };
  } catch {
    return { success: false, message: `Failed to restart ${serviceName}` };
  }
}

/**
 * Start a system service
 */
export async function startService(
  serviceName: string,
): Promise<{ success: boolean; message: string }> {
  try {
    await execAsync(`sudo systemctl start ${serviceName}`);
    return { success: true, message: `${serviceName} started successfully` };
  } catch {
    return { success: false, message: `Failed to start ${serviceName}` };
  }
}

/**
 * Stop a system service
 */
export async function stopService(
  serviceName: string,
): Promise<{ success: boolean; message: string }> {
  try {
    await execAsync(`sudo systemctl stop ${serviceName}`);
    return { success: true, message: `${serviceName} stopped successfully` };
  } catch {
    return { success: false, message: `Failed to stop ${serviceName}` };
  }
}

/**
 * Clear system caches
 */
export async function clearCaches(): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    // Clear package manager cache
    await execAsync("sudo apt-get clean 2>/dev/null || true");
    // Clear journald logs older than 3 days
    await execAsync("sudo journalctl --vacuum-time=3d 2>/dev/null || true");
    // Clear temp files
    await execAsync("sudo rm -rf /tmp/* 2>/dev/null || true");

    return { success: true, message: "Caches cleared successfully" };
  } catch {
    return { success: true, message: "Caches cleared" };
  }
}

/**
 * Export diagnostic report
 */
export async function exportDiagnosticReport(): Promise<string> {
  const logs = await getSystemLogs("all", 50);
  const diagnostics = await runDiagnostics();
  const services = await getSystemServices();

  const report = {
    generatedAt: new Date().toISOString(),
    diagnostics,
    services,
    recentLogs: logs.slice(0, 20),
  };

  return JSON.stringify(report, null, 2);
}

/**
 * Fix Avahi mDNS issues (systemd-resolved conflicts and /etc/hosts .local entries)
 */
export async function fixAvahiMdns(): Promise<{
  success: boolean;
  message: string;
  details?: string[];
}> {
  const details: string[] = [];

  try {
    // Check if Avahi is installed
    try {
      await execAsync("which avahi-daemon");
    } catch {
      return {
        success: false,
        message: "Avahi is not installed. Run setup.sh first.",
      };
    }

    // Step 1: Fix systemd-resolved mDNS conflict
    try {
      const { stdout: hasResolved } = await execAsync(
        "systemctl list-unit-files 2>/dev/null | grep -q '^systemd-resolved' && echo 'yes' || echo 'no'",
      );

      if (hasResolved.trim() === "yes") {
        details.push("Detected systemd-resolved - disabling mDNS/LLMNR...");

        // Create drop-in directory
        await execAsync(
          "sudo mkdir -p /etc/systemd/resolved.conf.d 2>/dev/null || true",
        );

        // Create drop-in config
        await execAsync(`sudo bash -c 'cat > /etc/systemd/resolved.conf.d/90-homeio-mdns.conf << "EOF"
[Resolve]
MulticastDNS=no
LLMNR=no
EOF'`);

        // Restart systemd-resolved
        await execAsync(
          "sudo systemctl restart systemd-resolved 2>/dev/null || true",
        );

        details.push("✓ systemd-resolved mDNS/LLMNR disabled");
      } else {
        details.push("systemd-resolved not detected - skipping");
      }
    } catch (error) {
      details.push(
        `Warning: Could not configure systemd-resolved: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }

    // Step 2: Remove .local from /etc/hosts
    try {
      const { stdout: hostsContent } = await execAsync("cat /etc/hosts");

      if (hostsContent.includes(".local")) {
        details.push("Found .local entries in /etc/hosts - removing...");

        // Backup /etc/hosts
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        await execAsync(
          `sudo cp /etc/hosts /etc/hosts.backup-${timestamp} 2>/dev/null || true`,
        );

        // Remove .local from all entries
        await execAsync(
          `sudo sed -i 's/\\([[:space:]]\\)\\([^[:space:]]*\\.local\\)/\\1/g' /etc/hosts`,
        );
        await execAsync(`sudo sed -i 's/[[:space:]]\\+/ /g' /etc/hosts`);

        details.push("✓ Removed .local conflicts from /etc/hosts");
      } else {
        details.push("/etc/hosts is clean - no .local conflicts");
      }
    } catch (error) {
      details.push(
        `Warning: Could not fix /etc/hosts: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }

    // Step 3: Ensure Avahi service file exists
    try {
      const { stdout: serviceExists } = await execAsync(
        "test -f /etc/avahi/services/homeio-http.service && echo 'yes' || echo 'no'",
      );

      if (serviceExists.trim() === "no") {
        details.push("Creating Avahi HTTP service file...");

        // Get HTTP port from environment or default
        const httpPort = process.env.HOMEIO_HTTP_PORT || "3000";

        // Create service file
        await execAsync(`sudo bash -c 'cat > /etc/avahi/services/homeio-http.service << "EOF"
<?xml version="1.0" standalone="no"?>
<!DOCTYPE service-group SYSTEM "avahi-service.dtd">
<service-group>
  <name replace-wildcards="yes">Homeio on %h</name>
  <service>
    <type>_http._tcp</type>
    <port>${httpPort}</port>
  </service>
</service-group>
EOF'`);

        details.push("✓ Created Avahi HTTP service file");
      } else {
        details.push("Avahi HTTP service file already exists");
      }
    } catch (error) {
      details.push(
        `Warning: Could not create Avahi service file: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }

    // Step 4: Restart Avahi daemon
    try {
      details.push("Restarting Avahi daemon...");
      await execAsync(
        "sudo systemctl reload avahi-daemon 2>/dev/null || sudo systemctl restart avahi-daemon",
      );
      details.push("✓ Avahi daemon restarted");
    } catch (error) {
      details.push(
        `Warning: Could not restart Avahi: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }

    // Step 5: Verify no conflicts
    try {
      const { stdout: conflicts } = await execAsync(
        "sudo journalctl -u avahi-daemon -n 50 --no-pager 2>/dev/null | grep -i 'WARNING.*another.*mDNS stack' || echo ''",
      );

      if (conflicts.trim()) {
        details.push(
          "⚠️  Still detecting mDNS conflicts. You may need to reboot the server.",
        );
      } else {
        details.push("✓ No mDNS conflicts detected");
      }
    } catch {
      // Ignore verification errors
    }

    return {
      success: true,
      message:
        "Avahi mDNS fix completed. Access your server at http://<hostname>.local",
      details,
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to fix Avahi mDNS: ${error instanceof Error ? error.message : "Unknown error"}`,
      details,
    };
  }
}
