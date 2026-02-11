#!/bin/bash

# Homeio updater script
# Licensed under Apache 2.0

set -e

INSTALL_DIR="/opt/homeio"
SERVICE_NAME="homeio"
GITHUB_REPO="doctor-io/homeio"

GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() { echo -e "${GREEN}[+]${NC} $1"; }
print_error() { echo -e "${RED}[!]${NC} $1"; }
print_info() { echo -e "${BLUE}[i]${NC} $1"; }

rebuild_native_modules() {
    print_status "Rebuilding native modules for $(node -v)..."
    export npm_config_build_from_source=true

    npm rebuild node-pty --build-from-source 2>&1 | tee /tmp/node-pty-build.log || {
        print_error "Warning: node-pty build failed. Terminal feature will not be available."
        print_error "Check /tmp/node-pty-build.log for details"
        print_info "The application will still work without terminal functionality"
    }

    npm rebuild better-sqlite3 --build-from-source 2>&1 | tee /tmp/better-sqlite3-build.log || {
        print_error "better-sqlite3 build failed. Database cannot start."
        print_error "Check /tmp/better-sqlite3-build.log for details"
        exit 1
    }

    node -e "require('better-sqlite3'); console.log('better-sqlite3:ok')" >/tmp/better-sqlite3-verify.log 2>&1 || {
        print_error "better-sqlite3 verification failed (native ABI mismatch)."
        print_error "Check /tmp/better-sqlite3-verify.log for details"
        exit 1
    }

    print_status "Native modules rebuilt successfully"
}

UPDATE_STATE_FILE="/var/lib/homeio/update-state.json"
UPDATE_MODE=""
UPDATE_CURRENT_VERSION=""
UPDATE_TARGET_VERSION=""

json_escape() {
    echo "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'
}

write_update_state() {
    local phase="$1"
    local status="$2"
    local message="${3:-}"
    local timestamp
    local escaped_message

    timestamp="$(date -Iseconds)"
    escaped_message="$(json_escape "$message")"
    mkdir -p "$(dirname "$UPDATE_STATE_FILE")"
    cat > "$UPDATE_STATE_FILE" <<EOF
{
  "mode": "$(json_escape "$UPDATE_MODE")",
  "phase": "$(json_escape "$phase")",
  "status": "$(json_escape "$status")",
  "currentVersion": "$(json_escape "$UPDATE_CURRENT_VERSION")",
  "targetVersion": "$(json_escape "$UPDATE_TARGET_VERSION")",
  "message": "$escaped_message",
  "timestamp": "$timestamp"
}
EOF
}

# ─── Parse arguments ─────────────────────────────────────────────────────────

FROM_SOURCE=0
while [[ "$#" -gt 0 ]]; do
    case $1 in
        --from-source) FROM_SOURCE=1 ;;
        *) echo "Unknown parameter: $1"; exit 1 ;;
    esac
    shift
done

# ─── Shared helpers ──────────────────────────────────────────────────────────

get_version_from_file() {
    local file="$1"

    if command -v node >/dev/null 2>&1; then
        node -e "const fs=require('fs');const data=fs.readFileSync('$file','utf8');console.log(JSON.parse(data).version);"
        return
    fi

    if command -v python3 >/dev/null 2>&1; then
        python3 - "$file" <<'PY'
import json
import sys
with open(sys.argv[1], "r", encoding="utf-8") as f:
    print(json.load(f).get("version", ""))
PY
        return
    fi

    print_error "Node.js or python3 is required to read package.json"
    exit 1
}

get_version_from_stdin() {
    if command -v node >/dev/null 2>&1; then
        node -e "let data='';process.stdin.on('data',c=>data+=c);process.stdin.on('end',()=>{console.log(JSON.parse(data).version);});"
        return
    fi

    if command -v python3 >/dev/null 2>&1; then
        python3 - <<'PY'
import json
import sys
data = sys.stdin.read()
print(json.loads(data).get("version", ""))
PY
        return
    fi

    print_error "Node.js or python3 is required to read package.json"
    exit 1
}

detect_architecture() {
    local machine
    machine="$(uname -m)"
    case "$machine" in
        x86_64|amd64)   echo "amd64" ;;
        aarch64|arm64)   echo "arm64" ;;
        *)
            print_error "Unsupported architecture: $machine"
            exit 1
            ;;
    esac
}

get_latest_release_tag() {
    local api_url="https://api.github.com/repos/${GITHUB_REPO}/releases/latest"
    local tag

    if command -v curl >/dev/null 2>&1; then
        tag="$(curl -fsSL "$api_url" | grep '"tag_name"' | head -1 | sed -E 's/.*"tag_name":\s*"([^"]+)".*/\1/')"
    elif command -v wget >/dev/null 2>&1; then
        tag="$(wget -qO- "$api_url" | grep '"tag_name"' | head -1 | sed -E 's/.*"tag_name":\s*"([^"]+)".*/\1/')"
    else
        print_error "curl or wget is required."
        exit 1
    fi

    if [ -z "$tag" ]; then
        print_error "Could not determine the latest release."
        exit 1
    fi

    echo "$tag"
}

# Strip leading 'v' from a tag to get a comparable version string
strip_v() { echo "${1#v}"; }

ensure_archive_tools() {
    if command -v unzip >/dev/null 2>&1 || command -v bsdtar >/dev/null 2>&1; then
        print_status "Archive tools present (unzip/bsdtar)"
        return
    fi

    print_info "Installing unzip (required for app store imports)..."

    if [ -x "$(command -v apt-get)" ]; then
        apt-get update
        apt-get install -y unzip || apt-get install -y libarchive-tools
    elif [ -x "$(command -v dnf)" ]; then
        dnf install -y unzip || dnf install -y bsdtar
    elif [ -x "$(command -v yum)" ]; then
        yum install -y unzip || yum install -y bsdtar
    else
        print_error "Unsupported package manager. Please install unzip or bsdtar manually."
        return
    fi

    if command -v unzip >/dev/null 2>&1 || command -v bsdtar >/dev/null 2>&1; then
        print_status "Archive tools installed successfully"
    else
        print_error "Failed to install archive tools. App store imports may fail."
    fi
}

ensure_cifs_utils() {
    print_status "Ensuring cifs-utils is installed (required for Network Storage)..."

    if command -v mount.cifs >/dev/null 2>&1; then
        print_status "cifs-utils already installed"
        return
    fi

    if [ -x "$(command -v apt-get)" ]; then
        apt-get update
        apt-get install -y cifs-utils
    elif [ -x "$(command -v dnf)" ]; then
        dnf install -y cifs-utils
    elif [ -x "$(command -v yum)" ]; then
        yum install -y cifs-utils
    else
        print_error "Unsupported package manager. Please install cifs-utils manually."
        return
    fi

    if command -v mount.cifs >/dev/null 2>&1; then
        print_status "cifs-utils installed successfully"
    else
        print_error "cifs-utils installation failed. Network Storage mounts will not work."
    fi
}

ensure_firewall() {
    print_status "Ensuring UFW firewall is installed and configured..."

    local HOMEIO_port=80
    if [ -f "$INSTALL_DIR/.env" ]; then
        HOMEIO_port=$(grep -E '^PORT=' "$INSTALL_DIR/.env" | tail -1 | cut -d'=' -f2)
        HOMEIO_port=${HOMEIO_port:-80}
    fi

    if ! command -v ufw >/dev/null 2>&1; then
        if [ -x "$(command -v apt-get)" ]; then
            apt-get update
            apt-get install -y ufw
        elif [ -x "$(command -v dnf)" ]; then
            dnf install -y ufw
        elif [ -x "$(command -v yum)" ]; then
            yum install -y ufw
        else
            print_error "Unsupported package manager. Please install UFW manually."
            return
        fi
    fi

    # Allow required services
    ufw allow "${HOMEIO_port}/tcp" comment "Homeio HTTP" 2>/dev/null || true
    ufw allow 443/tcp comment "HTTPS (if enabled)" 2>/dev/null || true
    ufw allow ssh comment "SSH" 2>/dev/null || true
    ufw allow 445/tcp comment "SMB 445" 2>/dev/null || true
    ufw allow 139/tcp comment "SMB 139" 2>/dev/null || true
    ufw allow 137/udp comment "NetBIOS name service" 2>/dev/null || true
    ufw allow 138/udp comment "NetBIOS datagram" 2>/dev/null || true
    ufw allow 3702/udp comment "WSD discovery" 2>/dev/null || true

    if ufw status | grep -q "Status: active"; then
        print_status "UFW already active"
    else
        print_status "Enabling UFW (keeps existing defaults)..."
        ufw --force enable 2>/dev/null || true
    fi
}

ensure_fail2ban() {
    print_status "Ensuring fail2ban is installed and SSH jail enabled..."

    if ! command -v fail2ban-client >/dev/null 2>&1; then
        if [ -x "$(command -v apt-get)" ]; then
            apt-get update
            apt-get install -y fail2ban
        elif [ -x "$(command -v dnf)" ]; then
            dnf install -y fail2ban
        elif [ -x "$(command -v yum)" ]; then
            yum install -y fail2ban
        else
            print_error "Unsupported package manager. Please install fail2ban manually."
            return
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

    if command -v systemctl >/dev/null 2>&1; then
        systemctl enable fail2ban 2>/dev/null || true
        systemctl restart fail2ban 2>/dev/null || true
    else
        service fail2ban restart 2>/dev/null || true
    fi
}

ensure_samba() {
    print_status "Ensuring Samba server is installed (SMB file sharing)..."

    if ! command -v smbd >/dev/null 2>&1; then
        if [ -x "$(command -v apt-get)" ]; then
            apt-get update
            apt-get install -y samba samba-common-bin wsdd2 || apt-get install -y samba samba-common-bin wsdd || true
        elif [ -x "$(command -v dnf)" ]; then
            dnf install -y samba samba-client samba-common-tools wsdd || true
        elif [ -x "$(command -v yum)" ]; then
            yum install -y samba samba-client samba-common wsdd || true
        else
            print_error "Unsupported package manager. Please install Samba manually."
            return
        fi
    else
        print_status "Samba already installed"
    fi

    if command -v systemctl >/dev/null 2>&1; then
        systemctl enable smbd nmbd wsdd2 wsdd 2>/dev/null || true
        systemctl start smbd nmbd wsdd2 wsdd 2>/dev/null || true
    else
        service smbd start 2>/dev/null || true
        service nmbd start 2>/dev/null || true
        service wsdd2 start 2>/dev/null || service wsdd start 2>/dev/null || true
    fi
}

ensure_bluez() {
    print_status "Ensuring Bluetooth tools (bluez + rfkill) are installed..."

    if command -v bluetoothctl >/dev/null 2>&1; then
        print_status "Bluetooth tools already present"
        return
    fi

    if [ -x "$(command -v apt-get)" ]; then
        apt-get update
        apt-get install -y bluez rfkill
    elif [ -x "$(command -v dnf)" ]; then
        dnf install -y bluez rfkill
    elif [ -x "$(command -v yum)" ]; then
        yum install -y bluez rfkill
    else
        print_error "Unsupported package manager. Please install bluez manually (provides bluetoothctl)."
        return
    fi

    if command -v bluetoothctl >/dev/null 2>&1; then
        print_status "Bluetooth tools installed successfully"
    else
        print_error "bluez installation may have failed; bluetoothctl not found."
    fi
}

get_total_memory_mb() {
    awk '/MemTotal:/ { print int($2 / 1024) }' /proc/meminfo 2>/dev/null || echo 0
}

ensure_zram_and_vm_profile() {
    print_status "Ensuring zram + VM tuning profile..."

    local mem_mb zram_percent swappiness dirty_ratio dirty_background_ratio vfs_cache_pressure
    mem_mb="$(get_total_memory_mb)"
    zram_percent=50
    swappiness=100
    dirty_background_ratio=5
    dirty_ratio=20
    vfs_cache_pressure=100

    if [ "$mem_mb" -le 2048 ]; then
        zram_percent=100
        swappiness=180
        dirty_background_ratio=3
        dirty_ratio=10
        vfs_cache_pressure=200
    elif [ "$mem_mb" -le 4096 ]; then
        zram_percent=75
        swappiness=140
        dirty_background_ratio=4
        dirty_ratio=15
        vfs_cache_pressure=150
    fi

    if [ -x "$(command -v apt-get)" ]; then
        apt-get update
        apt-get install -y zram-tools
        cat > /etc/default/zramswap <<EOF
ALGO=zstd
PERCENT=${zram_percent}
PRIORITY=100
EOF
        if command -v systemctl >/dev/null 2>&1; then
            systemctl enable zramswap 2>/dev/null || true
            systemctl restart zramswap 2>/dev/null || true
        fi
    elif [ -d /etc/systemd ]; then
        cat > /etc/systemd/zram-generator.conf <<'EOF'
[zram0]
zram-size = ram / 2
compression-algorithm = zstd
swap-priority = 100
EOF
        if command -v systemctl >/dev/null 2>&1; then
            systemctl daemon-reload 2>/dev/null || true
            systemctl restart systemd-zram-setup@zram0.service 2>/dev/null || true
        fi
    fi

    cat > /etc/sysctl.d/99-homeio-vm.conf <<EOF
vm.swappiness=${swappiness}
vm.dirty_background_ratio=${dirty_background_ratio}
vm.dirty_ratio=${dirty_ratio}
vm.vfs_cache_pressure=${vfs_cache_pressure}
vm.page-cluster=0
EOF
    sysctl --system >/dev/null 2>&1 || true
}

ensure_migrations_ready() {
    print_status "Checking Prisma migration status..."
    if ! npx prisma migrate status --schema=prisma/schema.prisma; then
        print_error "Migration status check failed. Please resolve schema/database issues before updating."
        exit 1
    fi
}

# ─── Root & directory checks ─────────────────────────────────────────────────

# Ensure script is run as root
if [ "$EUID" -ne 0 ]; then
    print_error "Please run as root"
    exit 1
fi

# Check if installation directory exists
if [ ! -d "$INSTALL_DIR" ]; then
    print_error "Homeio installation not found at $INSTALL_DIR"
    exit 1
fi

cd "$INSTALL_DIR"

# Run setup to ensure system deps are present (BlueZ, arp-scan, etc.)
SETUP_SCRIPT="$INSTALL_DIR/scripts/setup.sh"
if [ -x "$SETUP_SCRIPT" ]; then
    print_status "Running setup.sh to ensure dependencies are present..."
    bash "$SETUP_SCRIPT"
else
    print_info "setup.sh not found; skipping dependency refresh"
fi

# Get current local package version
if [ -f package.json ]; then
    LOCAL_VERSION=$(get_version_from_file "package.json")
else
    print_error "package.json not found in $INSTALL_DIR"
    exit 1
fi

print_info "Current installed version: $LOCAL_VERSION"
UPDATE_CURRENT_VERSION="$LOCAL_VERSION"

# ─── Artifact-based update (default) ─────────────────────────────────────────

update_from_artifact() {
    local arch latest_tag latest_version tarball base_url dest
    local backup_dir rollback_dir

    arch="$(detect_architecture)"
    latest_tag="$(get_latest_release_tag)"
    latest_version="$(strip_v "$latest_tag")"

    UPDATE_MODE="artifact"
    UPDATE_TARGET_VERSION="$latest_version"
    write_update_state "prepare" "running" "Preparing artifact update"

    print_info "Latest available version: $latest_version"

    # Ensure system dependencies needed for features are present
    ensure_cifs_utils
    ensure_samba
    ensure_firewall
    ensure_fail2ban
    ensure_zram_and_vm_profile

    if [ "$LOCAL_VERSION" = "$latest_version" ]; then
        write_update_state "complete" "skipped" "Already on latest version"
        print_status "Homeio is already up to date!"
        return 0
    fi

    print_status "Updating Homeio from $LOCAL_VERSION to $latest_version..."
    write_update_state "download" "running" "Downloading release artifact"

    tarball="homeio-${latest_tag}-linux-${arch}.tar.gz"
    base_url="https://github.com/${GITHUB_REPO}/releases/download/${latest_tag}"
    dest="/tmp/${tarball}"
    backup_dir="/tmp/homeio-backup-$$"
    rollback_dir="/tmp/homeio-rollback-$$"

    rollback_artifact_update() {
        if [ -d "$rollback_dir/current" ]; then
            print_info "Rolling back to previous Homeio installation..."
            rm -rf "$INSTALL_DIR"
            mv "$rollback_dir/current" "$INSTALL_DIR"
            systemctl start "$SERVICE_NAME" 2>/dev/null || true
            cd "$INSTALL_DIR"
        fi
    }

    on_artifact_error() {
        local exit_code="$?"
        print_error "Update failed; attempting rollback..."
        write_update_state "rollback" "running" "Update failed, restoring previous version"
        rollback_artifact_update
        write_update_state "rollback" "done" "Rollback completed"
        exit "$exit_code"
    }

    trap on_artifact_error ERR

    if command -v curl >/dev/null 2>&1; then
        curl -fSL -o "$dest" "${base_url}/${tarball}"
        curl -fSL -o "${dest}.sha256" "${base_url}/${tarball}.sha256"
    elif command -v wget >/dev/null 2>&1; then
        wget -q -O "$dest" "${base_url}/${tarball}"
        wget -q -O "${dest}.sha256" "${base_url}/${tarball}.sha256"
    else
        print_error "curl or wget is required."
        exit 1
    fi

    print_status "Verifying checksum..."
    (cd /tmp && sha256sum -c "${tarball}.sha256")
    print_status "Checksum OK"

    write_update_state "backup" "running" "Creating rollback snapshot"
    mkdir -p "$backup_dir" "$rollback_dir"
    cp -a "$INSTALL_DIR" "$rollback_dir/current"

    if [ -f "$INSTALL_DIR/.env" ]; then
        cp "$INSTALL_DIR/.env" "$backup_dir/.env"
    fi

    if [ -f "$INSTALL_DIR/prisma/homeio.db" ]; then
        cp "$INSTALL_DIR/prisma/homeio.db" "$backup_dir/homeio.db"
    fi

    if [ -d "$INSTALL_DIR/external-apps" ]; then
        cp -r "$INSTALL_DIR/external-apps" "$backup_dir/external-apps"
    fi

    write_update_state "apply" "running" "Applying update payload"
    print_status "Stopping Homeio service..."
    systemctl stop "$SERVICE_NAME" 2>/dev/null || true

    rm -rf "$INSTALL_DIR"
    mkdir -p "$INSTALL_DIR"
    tar xzf "$dest" -C "$INSTALL_DIR"
    rm -f "$dest" "${dest}.sha256"

    if [ -f "$backup_dir/.env" ]; then
        cp "$backup_dir/.env" "$INSTALL_DIR/.env"
    fi

    if [ -f "$backup_dir/homeio.db" ]; then
        cp "$backup_dir/homeio.db" "$INSTALL_DIR/prisma/homeio.db"
    fi

    if [ -d "$backup_dir/external-apps" ]; then
        cp -r "$backup_dir/external-apps" "$INSTALL_DIR/external-apps"
    fi

    cd "$INSTALL_DIR"

    if [ ! -d "node_modules" ]; then
        write_update_state "dependencies" "running" "Installing dependencies"
        npm ci --include=dev --ignore-scripts
    fi

    write_update_state "dependencies" "running" "Rebuilding native modules"
    rebuild_native_modules
    npx prisma generate --schema=prisma/schema.prisma

    write_update_state "migrate" "running" "Running database migrations"
    npx prisma migrate deploy --schema=prisma/schema.prisma

    write_update_state "restart" "running" "Starting Homeio service"
    systemctl start "$SERVICE_NAME"
    sleep 3
    systemctl is-active --quiet "$SERVICE_NAME"

    trap - ERR
    rm -rf "$backup_dir" "$rollback_dir"

    write_update_state "complete" "done" "Update completed successfully"
    print_status "Update complete! Homeio is now at version $latest_version"
    print_status "Service is running successfully"
    echo ""
    print_info "View logs with: sudo journalctl -u $SERVICE_NAME -f"
    print_info "Check status with: sudo systemctl status $SERVICE_NAME"
}

# ─── Source-based update (legacy / --from-source) ────────────────────────────

update_from_source() {
    local remote_branch remote_version previous_commit

    UPDATE_MODE="source"
    write_update_state "prepare" "running" "Preparing source update"

    git fetch origin
    remote_branch="$(git rev-parse --abbrev-ref HEAD)"
    remote_version="$(git show origin/$remote_branch:package.json | get_version_from_stdin)"
    UPDATE_TARGET_VERSION="$remote_version"

    print_info "Latest available version: $remote_version"

    if [ "$LOCAL_VERSION" == "$remote_version" ]; then
        write_update_state "complete" "skipped" "Already on latest version"
        print_status "Homeio is already up to date!"
        return 0
    fi

    print_status "Updating Homeio from version $LOCAL_VERSION to $remote_version..."
    previous_commit="$(git rev-parse HEAD)"

    rollback_source_update() {
        print_info "Rolling back source update..."
        git reset --hard "$previous_commit"
        if [ -f "$INSTALL_DIR/.env.backup" ]; then
            cp "$INSTALL_DIR/.env.backup" "$INSTALL_DIR/.env"
            rm -f "$INSTALL_DIR/.env.backup"
        fi
        systemctl restart "$SERVICE_NAME" 2>/dev/null || true
    }

    on_source_error() {
        local exit_code="$?"
        print_error "Source update failed; attempting rollback..."
        write_update_state "rollback" "running" "Source update failed, restoring previous commit"
        rollback_source_update
        write_update_state "rollback" "done" "Rollback completed"
        exit "$exit_code"
    }

    trap on_source_error ERR

    write_update_state "backup" "running" "Backing up runtime configuration"
    if [ -f "$INSTALL_DIR/.env" ]; then
        cp "$INSTALL_DIR/.env" "$INSTALL_DIR/.env.backup"
    fi

    write_update_state "apply" "running" "Applying git update"
    git fetch origin "$remote_branch"
    git reset --hard origin/"$remote_branch"

    write_update_state "dependencies" "running" "Installing dependencies and platform prerequisites"
    npm ci --include=dev --ignore-scripts

    ensure_archive_tools
    ensure_cifs_utils
    ensure_samba
    ensure_firewall
    ensure_fail2ban
    ensure_bluez
    ensure_zram_and_vm_profile
    ensure_migrations_ready

    write_update_state "build" "running" "Rebuilding native modules"
    rebuild_native_modules

    write_update_state "migrate" "running" "Running database migrations"
    npx prisma migrate deploy --schema=prisma/schema.prisma
    npx prisma generate --schema=prisma/schema.prisma

    write_update_state "build" "running" "Building production bundle"
    npm run build

    if [ -f "$INSTALL_DIR/.env.backup" ]; then
        cp "$INSTALL_DIR/.env.backup" "$INSTALL_DIR/.env"
        rm -f "$INSTALL_DIR/.env.backup"
        print_status "Restored .env configuration"
    fi

    write_update_state "restart" "running" "Restarting service"
    systemctl restart "$SERVICE_NAME"
    sleep 3
    systemctl is-active --quiet "$SERVICE_NAME"

    trap - ERR
    write_update_state "complete" "done" "Update completed successfully"
    print_status "Update complete! Homeio is now at version $remote_version"
    print_status "Service is running successfully"
    echo ""
    print_info "View logs with: sudo journalctl -u $SERVICE_NAME -f"
    print_info "Check status with: sudo systemctl status $SERVICE_NAME"
}

# ─── Main ────────────────────────────────────────────────────────────────────

if [ "$FROM_SOURCE" -eq 1 ]; then
    update_from_source
else
    update_from_artifact
fi
