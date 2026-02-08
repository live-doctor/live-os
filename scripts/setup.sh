#!/bin/bash

# Homeio system prerequisites installer
# Installs runtime dependencies, firewall rules, and basic hardening before install.sh

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() { echo -e "${GREEN}[+]${NC} $1"; }
print_error() { echo -e "${RED}[!]${NC} $1"; }
print_info() { echo -e "${BLUE}[i]${NC} $1"; }
print_dry() { echo -e "${BLUE}[DRY]${NC} Would: $1"; }

DRY_RUN=0
FROM_SOURCE=0
HTTP_PORT=${HOMEIO_HTTP_PORT:-80}

while [[ "$#" -gt 0 ]]; do
  case $1 in
    -d|--dry-run) DRY_RUN=1 ;;
    --from-source) FROM_SOURCE=1 ;;
    --http-port) HTTP_PORT="$2"; shift ;;
    *) echo "Unknown parameter: $1"; exit 1 ;;
  esac
  shift
done

if [ "$EUID" -ne 0 ] && [ "$DRY_RUN" -eq 0 ]; then
  print_error "Run setup.sh as root"
  exit 1
fi

# ─── Helpers ────────────────────────────────────────────────────────────────

install_git() {
  if [ "$DRY_RUN" -eq 1 ]; then print_dry "Install git"; return; fi
  command -v git >/dev/null 2>&1 && { print_status "git already installed"; return; }
  if [ -x "$(command -v apt-get)" ]; then
    apt-get update && apt-get install -y git
  elif [ -x "$(command -v dnf)" ]; then
    dnf install -y git
  elif [ -x "$(command -v yum)" ]; then
    yum install -y git
  else
    print_error "Unsupported package manager for git"; exit 1
  fi
}

install_build_tools() {
  if [ "$DRY_RUN" -eq 1 ]; then print_dry "Install build tools (gcc/g++/make/python3)"; return; fi
  if [ -x "$(command -v apt-get)" ]; then
    apt-get update && apt-get install -y build-essential python3
  elif [ -x "$(command -v dnf)" ]; then
    dnf groupinstall -y "Development Tools" && dnf install -y python3
  elif [ -x "$(command -v yum)" ]; then
    yum groupinstall -y "Development Tools" && yum install -y python3
  else
    print_error "Unsupported package manager for build tools"; exit 1
  fi
}

install_archive_tools() {
  if [ "$DRY_RUN" -eq 1 ]; then print_dry "Ensure unzip/bsdtar available"; return; fi
  command -v unzip >/dev/null 2>&1 || command -v bsdtar >/dev/null 2>&1 || {
    if [ -x "$(command -v apt-get)" ]; then
      apt-get update && (apt-get install -y unzip || apt-get install -y libarchive-tools)
    elif [ -x "$(command -v dnf)" ]; then
      dnf install -y unzip || dnf install -y bsdtar
    elif [ -x "$(command -v yum)" ]; then
      yum install -y unzip || yum install -y bsdtar
    else
      print_error "Unsupported package manager for archive tools"
    fi
  }
}

install_cifs_utils() {
  if [ "$DRY_RUN" -eq 1 ]; then print_dry "Install cifs-utils"; return; fi
  command -v mount.cifs >/dev/null 2>&1 && { print_status "cifs-utils present"; return; }
  if [ -x "$(command -v apt-get)" ]; then
    apt-get update && apt-get install -y cifs-utils
  elif [ -x "$(command -v dnf)" ]; then
    dnf install -y cifs-utils
  elif [ -x "$(command -v yum)" ]; then
    yum install -y cifs-utils
  else
    print_error "Unsupported package manager for cifs-utils"
  fi
}

install_samba() {
  if [ "$DRY_RUN" -eq 1 ]; then print_dry "Install Samba server (smbd/nmbd/wsdd)"; return; fi
  if ! command -v smbd >/dev/null 2>&1; then
    if [ -x "$(command -v apt-get)" ]; then
      apt-get update
      apt-get install -y samba samba-common-bin wsdd2 || apt-get install -y samba samba-common-bin wsdd || true
    elif [ -x "$(command -v dnf)" ]; then
      dnf install -y samba samba-client samba-common-tools wsdd || true
    elif [ -x "$(command -v yum)" ]; then
      yum install -y samba samba-client samba-common wsdd || true
    else
      print_error "Unsupported package manager for Samba"; return
    fi
  fi
  command -v systemctl >/dev/null 2>&1 && {
    systemctl enable smbd nmbd wsdd2 wsdd 2>/dev/null || true
    systemctl start smbd nmbd wsdd2 wsdd 2>/dev/null || true
  }
}

install_firewall() {
  if [ "$DRY_RUN" -eq 1 ]; then print_dry "Install and enable UFW with Homeio/SSH/SMB rules"; return; fi
  if ! command -v ufw >/dev/null 2>&1; then
    if [ -x "$(command -v apt-get)" ]; then
      apt-get update && apt-get install -y ufw
    elif [ -x "$(command -v dnf)" ]; then
      dnf install -y ufw
    elif [ -x "$(command -v yum)" ]; then
      yum install -y ufw
    else
      print_error "Unsupported package manager for UFW"; return
    fi
  fi
  ufw --force default deny incoming 2>/dev/null || true
  ufw --force default allow outgoing 2>/dev/null || true
  ufw allow "${HTTP_PORT}/tcp" comment "Homeio HTTP" 2>/dev/null || true
  ufw allow ssh comment "SSH" 2>/dev/null || true
  ufw allow 445/tcp comment "SMB 445" 2>/dev/null || true
  ufw allow 139/tcp comment "SMB 139" 2>/dev/null || true
  ufw allow 137/udp comment "NetBIOS name service" 2>/dev/null || true
  ufw allow 138/udp comment "NetBIOS datagram" 2>/dev/null || true
  ufw allow 3702/udp comment "WSD discovery" 2>/dev/null || true
  ufw --force enable 2>/dev/null || true
}

install_fail2ban() {
  if [ "$DRY_RUN" -eq 1 ]; then print_dry "Install fail2ban with SSH jail"; return; fi
  if ! command -v fail2ban-client >/dev/null 2>&1; then
    if [ -x "$(command -v apt-get)" ]; then
      apt-get update && apt-get install -y fail2ban
    elif [ -x "$(command -v dnf)" ]; then
      dnf install -y fail2ban
    elif [ -x "$(command -v yum)" ]; then
      yum install -y fail2ban
    else
      print_error "Unsupported package manager for fail2ban"; return
    fi
  fi
  if [ -d /etc/fail2ban/jail.d ]; then
    cat > /etc/fail2ban/jail.d/homeio-ssh.conf <<'EOF'
[sshd]
enabled = true
port    = ssh
maxretry = 5
findtime = 10m
bantime  = 15m
EOF
  fi
  command -v systemctl >/dev/null 2>&1 && {
    systemctl enable fail2ban 2>/dev/null || true
    systemctl restart fail2ban 2>/dev/null || true
  }
}

install_nodejs() {
  if [ "$DRY_RUN" -eq 1 ]; then print_dry "Install Node.js 20.x"; return; fi
  command -v node >/dev/null 2>&1 && { print_status "Node.js present: $(node -v)"; return; }
  if [ -x "$(command -v apt-get)" ]; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
  elif [ -x "$(command -v dnf)" ]; then
    curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
    dnf install -y nodejs
  elif [ -x "$(command -v yum)" ]; then
    curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
    yum install -y nodejs
  else
    print_error "Unsupported package manager for Node.js"; exit 1
  fi
}

install_docker() {
  if [ "$DRY_RUN" -eq 1 ]; then print_dry "Install Docker Engine + compose plugin"; return; fi
  if command -v docker >/dev/null 2>&1; then
    print_status "Docker present: $(docker --version)"
    return
  fi
  if [ -x "$(command -v apt-get)" ]; then
    apt-get update
    apt-get install -y ca-certificates curl gnupg lsb-release
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
      $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
    apt-get update
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    systemctl start docker && systemctl enable docker
  elif [ -x "$(command -v dnf)" ]; then
    dnf -y install dnf-plugins-core
    dnf config-manager --add-repo https://download.docker.com/linux/fedora/docker-ce.repo
    dnf install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    systemctl start docker && systemctl enable docker
  elif [ -x "$(command -v yum)" ]; then
    yum install -y yum-utils
    yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
    yum install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    systemctl start docker && systemctl enable docker
  else
    print_error "Unsupported package manager for Docker"; exit 1
  fi
}

ensure_docker_permissions() {
  if [ "$DRY_RUN" -eq 1 ]; then print_dry "Add runtime user to docker group"; return; fi
  getent group docker >/dev/null || groupadd docker
  TARGET_USER="$(logname 2>/dev/null || echo "$SUDO_USER" || echo "$USER")"
  if ! id -nG "$TARGET_USER" | grep -qw docker; then
    usermod -aG docker "$TARGET_USER"
    print_info "Log out/in or restart service to apply docker group membership."
  fi
}

install_avahi() {
  if [ "$DRY_RUN" -eq 1 ]; then print_dry "Install Avahi (mDNS)"; return; fi
  if ! command -v avahi-daemon >/dev/null 2>&1; then
    if [ -x "$(command -v apt-get)" ]; then
      apt-get update && apt-get install -y avahi-daemon avahi-utils libnss-mdns
    elif [ -x "$(command -v dnf)" ]; then
      dnf install -y avahi avahi-tools nss-mdns || dnf install -y avahi avahi-tools
    elif [ -x "$(command -v yum)" ]; then
      yum install -y avahi avahi-tools nss-mdns || yum install -y avahi avahi-tools
    else
      print_error "Unsupported package manager for Avahi"; return
    fi
  fi
  command -v systemctl >/dev/null 2>&1 && {
    systemctl enable avahi-daemon 2>/dev/null || true
    systemctl start avahi-daemon 2>/dev/null || true
  }
}

ensure_nsswitch_mdns() {
  if [ "$DRY_RUN" -eq 1 ]; then print_dry "Ensure /etc/nsswitch.conf hosts includes mDNS resolver"; return; fi

  local conf="/etc/nsswitch.conf"
  if [ ! -f "$conf" ]; then
    print_info "Skipping nsswitch mDNS configuration: $conf not found"
    return
  fi

  if grep -Eq '^[[:space:]]*hosts:.*(mdns4_minimal|mdns4|mdns)' "$conf"; then
    print_status "nsswitch hosts already includes mDNS lookup"
    return
  fi

  local tmp_file
  tmp_file="$(mktemp)" || {
    print_error "Failed to create temporary file for nsswitch update"
    return
  }

  awk '
    BEGIN { updated = 0 }
    /^[[:space:]]*hosts:/ && updated == 0 {
      line = $0
      if (line ~ /[[:space:]]dns([[:space:]]|$)/) {
        sub(/[[:space:]]dns([[:space:]]|$)/, " mdns4_minimal [NOTFOUND=return] dns mdns4 ", line)
      } else {
        line = line " mdns4_minimal [NOTFOUND=return] mdns4"
      }
      gsub(/[[:space:]]+$/, "", line)
      print line
      updated = 1
      next
    }
    { print }
    END {
      if (updated == 0) {
        print "hosts: files mdns4_minimal [NOTFOUND=return] dns mdns4"
      }
    }
  ' "$conf" > "$tmp_file"

  cat "$tmp_file" > "$conf"
  rm -f "$tmp_file"
  print_status "Configured nsswitch hosts for mDNS resolution"
}

install_nmcli() {
  if [ "$DRY_RUN" -eq 1 ]; then print_dry "Install NetworkManager (nmcli)"; return; fi
  command -v nmcli >/dev/null 2>&1 && { print_status "nmcli already installed"; return; }
  if [ -x "$(command -v apt-get)" ]; then
    apt-get update && apt-get install -y network-manager
  elif [ -x "$(command -v dnf)" ]; then
    dnf install -y NetworkManager
  elif [ -x "$(command -v yum)" ]; then
    yum install -y NetworkManager
  else
    print_error "Unsupported package manager for NetworkManager"; return
  fi
  command -v systemctl >/dev/null 2>&1 && {
    systemctl enable NetworkManager 2>/dev/null || true
    systemctl start NetworkManager 2>/dev/null || true
  }
}

ensure_nm_manages_wifi() {
  if [ "$DRY_RUN" -eq 1 ]; then print_dry "Configure NetworkManager to manage WiFi devices"; return; fi
  command -v nmcli >/dev/null 2>&1 || { print_info "Skipping NM WiFi management (nmcli not installed)"; return; }

  local conf="/etc/NetworkManager/NetworkManager.conf"
  if [ -f "$conf" ]; then
    # Force managed=true under [ifupdown]
    if grep -q "^[[:space:]]*managed=" "$conf"; then
      sed -i 's/^[[:space:]]*managed=.*/managed=true/' "$conf"
    elif grep -q "^[[:space:]]*\\[ifupdown\\]" "$conf"; then
      sed -i '/^\[ifupdown\]/a managed=true' "$conf"
    else
      cat <<'EOF' >> "$conf"
[ifupdown]
managed=true
EOF
    fi
  else
    cat <<'EOF' > "$conf"
[ifupdown]
managed=true
EOF
  fi

  # Clear any unmanaged-devices entries that might block WiFi
  sed -i '/^unmanaged-devices=/d' "$conf" 2>/dev/null || true

  # Mark existing WiFi devices as managed
  local wifi_devices
  wifi_devices=$(nmcli -t -f DEVICE,TYPE device 2>/dev/null | awk -F: '$2=="wifi"{print $1}')
  for dev in $wifi_devices; do
    nmcli device set "$dev" managed yes 2>/dev/null || true
  done

  command -v systemctl >/dev/null 2>&1 && systemctl restart NetworkManager 2>/dev/null || true
  print_status "NetworkManager configured to manage WiFi interfaces"
}

install_bluez() {
  if [ "$DRY_RUN" -eq 1 ]; then print_dry "Install Bluetooth stack (bluez + rfkill)"; return; fi
  command -v bluetoothctl >/dev/null 2>&1 && { print_status "Bluetooth tools already present"; return; }
  if [ -x "$(command -v apt-get)" ]; then
    apt-get update && apt-get install -y bluez rfkill
  elif [ -x "$(command -v dnf)" ]; then
    dnf install -y bluez rfkill
  elif [ -x "$(command -v yum)" ]; then
    yum install -y bluez rfkill
  else
    print_error "Unsupported package manager for bluez"; return
  fi
}

get_total_memory_mb() {
  awk '/MemTotal:/ { print int($2 / 1024) }' /proc/meminfo 2>/dev/null || echo 0
}

install_zram_swap() {
  if [ "$DRY_RUN" -eq 1 ]; then print_dry "Install and configure zram swap"; return; fi

  local mem_mb zram_percent
  mem_mb="$(get_total_memory_mb)"
  zram_percent=50

  if [ "$mem_mb" -le 2048 ]; then
    zram_percent=100
  elif [ "$mem_mb" -le 4096 ]; then
    zram_percent=75
  fi

  if [ -x "$(command -v apt-get)" ]; then
    apt-get update && apt-get install -y zram-tools
    cat > /etc/default/zramswap <<EOF
ALGO=zstd
PERCENT=${zram_percent}
PRIORITY=100
EOF
    command -v systemctl >/dev/null 2>&1 && {
      systemctl enable zramswap 2>/dev/null || true
      systemctl restart zramswap 2>/dev/null || true
    }
    print_status "zram configured (PERCENT=${zram_percent}, RAM=${mem_mb}MB)"
    return
  fi

  # Best-effort fallback for non-apt systems that support zram-generator
  if [ -x "$(command -v dnf)" ]; then
    dnf install -y zram-generator-defaults 2>/dev/null || true
  elif [ -x "$(command -v yum)" ]; then
    yum install -y zram-generator-defaults 2>/dev/null || true
  fi

  if [ -d /etc/systemd ]; then
    cat > /etc/systemd/zram-generator.conf <<'EOF'
[zram0]
zram-size = ram / 2
compression-algorithm = zstd
swap-priority = 100
EOF
    command -v systemctl >/dev/null 2>&1 && {
      systemctl daemon-reload 2>/dev/null || true
      systemctl restart systemd-zram-setup@zram0.service 2>/dev/null || true
    }
    print_status "zram-generator profile written"
  else
    print_info "Skipping zram setup: unsupported distribution"
  fi
}

apply_sysctl_tuning() {
  if [ "$DRY_RUN" -eq 1 ]; then print_dry "Apply sysctl tuning"; return; fi
  local conf="/etc/sysctl.d/99-homeio-tuning.conf"
  local vm_conf="/etc/sysctl.d/99-homeio-vm.conf"
  local mem_mb swappiness dirty_ratio dirty_background_ratio vfs_cache_pressure

  mem_mb="$(get_total_memory_mb)"
  swappiness=100
  dirty_background_ratio=5
  dirty_ratio=20
  vfs_cache_pressure=100

  # Prefer responsiveness on low-memory systems (e.g. Raspberry Pi).
  if [ "$mem_mb" -le 2048 ]; then
    swappiness=180
    dirty_background_ratio=3
    dirty_ratio=10
    vfs_cache_pressure=200
  elif [ "$mem_mb" -le 4096 ]; then
    swappiness=140
    dirty_background_ratio=4
    dirty_ratio=15
    vfs_cache_pressure=150
  fi

  cat > "$conf" <<'EOF'
fs.inotify.max_user_watches=524288
fs.inotify.max_user_instances=512
net.core.somaxconn=65535
EOF

  cat > "$vm_conf" <<EOF
vm.swappiness=${swappiness}
vm.dirty_background_ratio=${dirty_background_ratio}
vm.dirty_ratio=${dirty_ratio}
vm.vfs_cache_pressure=${vfs_cache_pressure}
vm.page-cluster=0
EOF

  sysctl --system >/dev/null 2>&1 || true
  print_status "VM profile applied (RAM=${mem_mb}MB, swappiness=${swappiness})"
}

limit_journald() {
  if [ "$DRY_RUN" -eq 1 ]; then print_dry "Limit journald size"; return; fi
  if [ -f /etc/systemd/journald.conf ]; then
    sed -i \
      -e 's/^#\?SystemMaxUse=.*/SystemMaxUse=500M/' \
      -e 's/^#\?RuntimeMaxUse=.*/RuntimeMaxUse=200M/' \
      /etc/systemd/journald.conf
    systemctl restart systemd-journald 2>/dev/null || true
  fi
}

install_monitoring_tools() {
  if [ "$DRY_RUN" -eq 1 ]; then print_dry "Install smartmontools lm-sensors sysstat"; return; fi
  if [ -x "$(command -v apt-get)" ]; then
    apt-get update
    apt-get install -y smartmontools lm-sensors sysstat
    systemctl enable --now sysstat 2>/dev/null || true
  fi
}

enable_unattended_upgrades() {
  if [ "$DRY_RUN" -eq 1 ]; then print_dry "Enable unattended-upgrades"; return; fi
  if [ -x "$(command -v apt-get)" ]; then
    apt-get update
    apt-get install -y unattended-upgrades
    dpkg-reconfigure -f noninteractive unattended-upgrades || true
  fi
}

install_tlp() {
  if [ "$DRY_RUN" -eq 1 ]; then print_dry "Install tlp and enable service"; return; fi
  if [ -x "$(command -v apt-get)" ]; then
    apt-get update
    apt-get install -y tlp
    systemctl enable --now tlp 2>/dev/null || true
  fi
}

disable_sleep_targets() {
  if [ "$DRY_RUN" -eq 1 ]; then print_dry "Mask sleep/suspend/hibernate targets"; return; fi
  systemctl mask sleep.target suspend.target hibernate.target hybrid-sleep.target 2>/dev/null || true
}

install_arp_scan() {
  if [ "$DRY_RUN" -eq 1 ]; then print_dry "Install arp-scan (or net-tools fallback)"; return; fi

  if command -v arp-scan >/dev/null 2>&1; then
    print_status "arp-scan already installed"
    return;
  fi

  if [ -x "$(command -v apt-get)" ]; then
    apt-get update && apt-get install -y arp-scan || apt-get install -y net-tools
  elif [ -x "$(command -v dnf)" ]; then
    dnf install -y arp-scan || dnf install -y net-tools
  elif [ -x "$(command -v yum)" ]; then
    yum install -y arp-scan || yum install -y net-tools
  else
    print_error "Unsupported package manager for arp-scan/net-tools"
    return
  fi

  if command -v arp-scan >/dev/null 2>&1 || command -v arp >/dev/null 2>&1; then
    print_status "ARP scanning tools installed"
  else
    print_error "Failed to install arp-scan/net-tools; LAN discovery may be limited"
  fi
}

# ─── Run sequence ───────────────────────────────────────────────────────────

if [ "$DRY_RUN" -eq 1 ]; then
  print_status "Setup running in dry-run mode (no changes will be made)"
fi

if [ "$FROM_SOURCE" -eq 1 ]; then
  install_git
  install_build_tools
fi

install_archive_tools
install_cifs_utils
install_samba
install_firewall
install_fail2ban
install_nodejs
install_docker
ensure_docker_permissions
install_avahi
ensure_nsswitch_mdns
install_nmcli
ensure_nm_manages_wifi
install_bluez
install_zram_swap
install_arp_scan
install_tlp
disable_sleep_targets

# Optional hardening/monitoring (apt-based)
apply_sysctl_tuning
limit_journald
install_monitoring_tools
enable_unattended_upgrades

print_status "Setup prerequisites complete"
