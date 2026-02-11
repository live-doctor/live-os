#!/bin/bash

# Homeio installation script
# Licensed under the Apache License, Version 2.0

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print with color
print_status() {
    echo -e "${GREEN}[+]${NC} $1"
}

print_error() {
    echo -e "${RED}[!]${NC} $1"
}

print_dry() {
    echo -e "${BLUE}[DRY]${NC} Would: $1"
}

print_info() {
    echo -e "${BLUE}[!]${NC} $1"
}

# Parse command line arguments
DRY_RUN=0
NO_DEP=0
FROM_SOURCE=0
BRANCH="develop"
INSTALL_VERSION=""
while [[ "$#" -gt 0 ]]; do
    case $1 in
        -d|--dry-run) DRY_RUN=1 ;;
        -n|--no-dep) NO_DEP=1 ;;
        -b|--branch) BRANCH="$2"; shift ;;
        --from-source) FROM_SOURCE=1 ;;
        --version) INSTALL_VERSION="$2"; shift ;;
        *) echo "Unknown parameter passed: $1"; exit 1 ;;
    esac
    shift
done

# Default configuration
HTTP_PORT=${HOMEIO_HTTP_PORT:-80}
DOMAIN=${HOMEIO_DOMAIN:-""}
HOSTNAME_ONLY="homeio"

# Installation directory
INSTALL_DIR="/opt/homeio"

# GitHub repository
REPO_URL="https://github.com/doctor-io/homeio.git"
GITHUB_REPO="doctor-io/homeio"

# ─── Architecture detection ───────────────────────────────────────────────────

detect_architecture() {
    local machine
    machine="$(uname -m)"
    case "$machine" in
        x86_64|amd64)   echo "amd64" ;;
        aarch64|arm64)   echo "arm64" ;;
        *)
            print_error "Unsupported architecture: $machine"
            print_error "Homeio supports amd64 and arm64 only."
            exit 1
            ;;
    esac
}

# ─── GitHub Release helpers ───────────────────────────────────────────────────

get_latest_version() {
    local api_url="https://api.github.com/repos/${GITHUB_REPO}/releases/latest"
    local tag

    if command -v curl >/dev/null 2>&1; then
        tag="$(curl -fsSL "$api_url" | grep '"tag_name"' | head -1 | sed -E 's/.*"tag_name":\s*"([^"]+)".*/\1/')"
    elif command -v wget >/dev/null 2>&1; then
        tag="$(wget -qO- "$api_url" | grep '"tag_name"' | head -1 | sed -E 's/.*"tag_name":\s*"([^"]+)".*/\1/')"
    else
        print_error "curl or wget is required to download releases."
        exit 1
    fi

    if [ -z "$tag" ]; then
        print_error "Could not determine the latest release version."
        print_error "Check https://github.com/${GITHUB_REPO}/releases"
        exit 1
    fi

    echo "$tag"
}

download_and_verify() {
    local version="$1"
    local arch="$2"
    local tarball="homeio-${version}-linux-${arch}.tar.gz"
    local base_url="https://github.com/${GITHUB_REPO}/releases/download/${version}"
    local dest="/tmp/${tarball}"

    print_status "Downloading ${tarball}..."
    if command -v curl >/dev/null 2>&1; then
        curl -fSL -o "$dest" "${base_url}/${tarball}"
        curl -fSL -o "${dest}.sha256" "${base_url}/${tarball}.sha256"
    elif command -v wget >/dev/null 2>&1; then
        wget -q -O "$dest" "${base_url}/${tarball}"
        wget -q -O "${dest}.sha256" "${base_url}/${tarball}.sha256"
    fi

    print_status "Verifying checksum..."
    (cd /tmp && sha256sum -c "${tarball}.sha256")
    if [ $? -ne 0 ]; then
        print_error "Checksum verification failed! The download may be corrupted."
        rm -f "$dest" "${dest}.sha256"
        exit 1
    fi
    print_status "Checksum OK"
}

install_from_artifact() {
    local version="$1"
    local arch="$2"
    local tarball="homeio-${version}-linux-${arch}.tar.gz"
    local dest="/tmp/${tarball}"

    if [ "$DRY_RUN" -eq 1 ]; then
        print_dry "Download release ${tarball} from GitHub"
        print_dry "Verify SHA256 checksum"
        print_dry "Extract to ${INSTALL_DIR}"
        print_dry "Create .env configuration file"
        print_dry "Run prisma migrate deploy"
        return
    fi

    # Download and verify
    download_and_verify "$version" "$arch"

    # Remove existing installation if present
    if [ -d "$INSTALL_DIR" ]; then
        print_status "Removing existing installation..."
        rm -rf "$INSTALL_DIR"
    fi

    # Extract
    print_status "Extracting to ${INSTALL_DIR}..."
    mkdir -p "$INSTALL_DIR"
    tar xzf "$dest" -C "$INSTALL_DIR"

    # Cleanup download
    rm -f "$dest" "${dest}.sha256"

    cd "$INSTALL_DIR"

    # Create .env (no Node.js needed)
    print_status "Creating environment configuration..."
    create_env_file

    print_status "Artifact extraction complete!"
}

# ─── Prompt helpers ───────────────────────────────────────────────────────────

# Prompt for port
prompt_port() {
    if [ "$DRY_RUN" -eq 1 ]; then
        return
    fi

    # Only prompt if environment variable is not set
    if [ -z "$HOMEIO_HTTP_PORT" ]; then
        echo -n -e "${BLUE}Enter HTTP port (default: 80):${NC} "
        read -r user_http_port < /dev/tty
        if [ -n "$user_http_port" ]; then
            HTTP_PORT=$user_http_port
        fi
    fi

    print_status "Using HTTP port: $HTTP_PORT"
}

# Update /etc/hosts with hostname (overrides existing entries)
update_hosts_entry() {
    local hostname="$1"
    local ip="$2"
    local hosts_file="/etc/hosts"

    if [ -z "$hostname" ] || [ -z "$ip" ]; then
        print_error "Unable to update $hosts_file: missing hostname or IP."
        return
    fi

    if [ ! -w "$hosts_file" ]; then
        print_error "Cannot write to $hosts_file. Please add: $ip $hostname"
        return
    fi

    local tmp_file
    tmp_file="$(mktemp)" || {
        print_error "Failed to create temporary file. Hosts update skipped."
        return
    }

    awk -v host="$hostname" '
        /^[[:space:]]*#/ { print; next }
        {
            line = $0
            comment = ""
            hash = index(line, "#")
            if (hash > 0) {
                comment = substr(line, hash)
                line = substr(line, 1, hash - 1)
            }
            sub(/^[[:space:]]+/, "", line)
            sub(/[[:space:]]+$/, "", line)
            if (line == "") { print $0; next }
            n = split(line, fields, /[[:space:]]+/)
            ip = fields[1]
            out = ""
            for (i = 2; i <= n; i++) {
                if (fields[i] != host) {
                    out = out " " fields[i]
                }
            }
            if (out != "") {
                if (comment != "") {
                    print ip out " " comment
                } else {
                    print ip out
                }
            }
        }
    ' "$hosts_file" > "$tmp_file"

    echo "$ip $hostname" >> "$tmp_file"
    cat "$tmp_file" > "$hosts_file"
    rm -f "$tmp_file"
    print_status "Updated $hosts_file with: $ip $hostname"
}

# Set system hostname for mDNS
set_hostname() {
    if [ "$DRY_RUN" -eq 1 ]; then
        print_dry "Set system hostname"
        return
    fi

    local hostname_only="${1%.local}"  # Remove .local if present

    if [ -z "$hostname_only" ]; then
        return
    fi

    HOSTNAME_ONLY="$hostname_only"

    print_status "Setting system hostname to: $hostname_only"

    # Set hostname using hostnamectl (modern method)
    if command -v hostnamectl >/dev/null 2>&1; then
        hostnamectl set-hostname "$hostname_only"
    else
        # Fallback for older systems
        echo "$hostname_only" > /etc/hostname
        hostname "$hostname_only"
    fi

    # Update /etc/hosts to include the new hostname
    local primary_ip
    primary_ip="$(hostname -I | awk '{print $1}')"

    if [ -n "$primary_ip" ]; then
        # Remove old hostname entries
        sed -i "/127.0.1.1/d" /etc/hosts 2>/dev/null || true

        # Add new hostname
        echo "127.0.1.1 $hostname_only.local $hostname_only" >> /etc/hosts
    fi

    print_status "Hostname set to: $hostname_only (accessible as ${hostname_only}.local)"
}

# Restart Avahi/mDNS so the new .local hostname is advertised immediately
restart_mdns() {
    if [ "$DRY_RUN" -eq 1 ]; then
        print_dry "Restart avahi-daemon to refresh mDNS hostname"
        return
    fi

    if command -v systemctl >/dev/null 2>&1 && systemctl list-unit-files | grep -q "^avahi-daemon"; then
        print_status "Restarting avahi-daemon for mDNS refresh..."
        local attempt
        for attempt in 1 2 3; do
            if systemctl restart avahi-daemon; then
                break
            fi
            sleep 1
        done
        if ! systemctl is-active --quiet avahi-daemon; then
            print_error "avahi-daemon restart failed; mDNS might be stale"
        fi
    elif command -v service >/dev/null 2>&1 && service avahi-daemon status >/dev/null 2>&1; then
        print_status "Restarting avahi-daemon for mDNS refresh..."
        service avahi-daemon restart || print_error "avahi-daemon restart failed; mDNS might be stale"
    else
        print_info "avahi-daemon not found; skipping mDNS restart"
    fi
}

verify_mdns_hostname() {
    if [ "$DRY_RUN" -eq 1 ]; then
        print_dry "Verify mDNS resolves ${HOSTNAME_ONLY}.local"
        return
    fi

    local hostname_only="${1%.local}"
    [ -z "$hostname_only" ] && return
    local fqdn="${hostname_only}.local"
    local attempt

    if command -v avahi-resolve-host-name >/dev/null 2>&1; then
        for attempt in 1 2 3 4 5; do
            if avahi-resolve-host-name -n "$fqdn" >/dev/null 2>&1; then
                print_status "mDNS resolution verified for ${fqdn}"
                return
            fi
            sleep 1
        done
        print_error "Could not verify mDNS for ${fqdn}. If discovery fails, run: sudo systemctl restart avahi-daemon"
        return
    fi

    if command -v getent >/dev/null 2>&1 && getent hosts "$fqdn" >/dev/null 2>&1; then
        print_status "Name resolution verified for ${fqdn}"
    fi
}

# Prompt for domain
prompt_domain() {
    if [ "$DRY_RUN" -eq 1 ]; then
        return
    fi

    local primary_ip
    primary_ip="$(hostname -I | awk '{print $1}')"

    # Only prompt if environment variable is not set
    if [ -z "$HOMEIO_DOMAIN" ]; then
        echo ""
        print_status "Domain Configuration"
        echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo ""
        echo -e "  You can access Homeio via:"
        echo -e "  • Local IP:   ${GREEN}http://$primary_ip:$HTTP_PORT${NC}"
        echo -e "  • localhost:  ${GREEN}http://localhost:$HTTP_PORT${NC}"
        echo -e "  • Custom hostname (optional)"
        echo ""
        echo -e "  ${BLUE}Examples of hostnames (auto .local domain):${NC}"
        echo -e "    - home      → ${GREEN}http://home.local:$HTTP_PORT${NC}"
        echo -e "    - homeio    → ${GREEN}http://homeio.local:$HTTP_PORT${NC}"
        echo ""
        echo -e "  ${BLUE}Note:${NC} With Avahi/mDNS, .local domains work automatically"
        echo -e "        on all devices in your network (no hosts file needed!)"
        echo ""
        echo -n -e "${BLUE}Enter hostname (leave empty for default):${NC} "
        read -r user_host < /dev/tty

        if [ -n "$user_host" ]; then
            DOMAIN="${user_host}.local"

            # Set system hostname for mDNS
            set_hostname "$user_host"

            restart_mdns

            print_status "Hostname set: $DOMAIN"
            echo ""
            echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
            echo -e "  ${GREEN}✓${NC} mDNS enabled: ${GREEN}http://$DOMAIN:$HTTP_PORT${NC}"
            echo ""
            echo -e "  ${GREEN}🎉 Works automatically on:${NC}"
            echo -e "     • Linux (with Avahi)"
            echo ""
            echo ""
            echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
            echo ""
        else
            print_status "Using default hostname: homeio"
            DOMAIN="homeio.local"
            set_hostname "homeio"
            restart_mdns
        fi
    else
        DOMAIN=$HOMEIO_DOMAIN
        hostname_only="${DOMAIN%.local}"

        set_hostname "$hostname_only"

        restart_mdns

        print_status "Using domain from environment: $DOMAIN"
        echo ""
        echo -e "${GREEN}✓${NC} mDNS enabled: ${GREEN}http://$DOMAIN:$HTTP_PORT${NC}"
        echo ""
    fi
}

# ─── Dependency installers ────────────────────────────────────────────────────

# Check if script is run as root
if [ "$EUID" -ne 0 ] && [ "$DRY_RUN" -eq 0 ]; then
    print_error "Please run as root"
    exit 1
fi

# Install Node.js and npm
# Minimal git bootstrap for --from-source (full install handled by setup.sh)
ensure_git() {
    if [ "$DRY_RUN" -eq 1 ]; then
        print_dry "Ensure git is available"
        return
    fi
    command -v git >/dev/null 2>&1 && return
    print_status "Installing git (required to clone repository)..."
    if [ -x "$(command -v apt-get)" ]; then
        apt-get update && apt-get install -y git
    elif [ -x "$(command -v dnf)" ]; then
        dnf install -y git
    elif [ -x "$(command -v yum)" ]; then
        yum install -y git
    else
        print_error "Please install git manually before running with --from-source."
        exit 1
    fi
}

# ─── Source-based setup (legacy) ──────────────────────────────────────────────

# Clone the repository (git only, no build tools needed yet)
clone_HOMEIO() {
    if [ "$DRY_RUN" -eq 1 ]; then
        print_dry "Clone repository from $REPO_URL (branch: $BRANCH)"
        return
    fi

    # Change to a safe directory before removing installation
    cd /tmp || cd /

    # Remove existing installation if present
    if [ -d "$INSTALL_DIR" ]; then
        print_status "Removing existing installation..."
        rm -rf "$INSTALL_DIR"
    fi

    print_status "Cloning Homeio repository (branch: $BRANCH)..."
    git clone -b "$BRANCH" "$REPO_URL" "$INSTALL_DIR"
}

# Build the project (requires Node.js and build tools from setup.sh)
build_HOMEIO() {
    if [ "$DRY_RUN" -eq 1 ]; then
        print_dry "Install dependencies with npm install (skipping Husky)"
        print_dry "Build project with npm run build"
        print_dry "Create .env configuration file"
        return
    fi

    cd "$INSTALL_DIR"

    print_status "Installing dependencies (skipping Husky for production)..."
    # Install all dependencies but skip Husky setup scripts
    # Note: TypeScript is needed for build even in production
    export HUSKY=0
    npm install --ignore-scripts
    export npm_config_build_from_source=true

    print_status "Building native modules (node-pty for terminal)..."
    # node-pty requires compilation - rebuild it after install
    npm rebuild node-pty --build-from-source 2>&1 | tee /tmp/node-pty-build.log || {
        print_error "Warning: node-pty build failed. Terminal feature will not be available."
        print_error "Check /tmp/node-pty-build.log for details"
        print_info "The application will still work without terminal functionality"
    }

    print_status "Building native modules (better-sqlite3 for database)..."
    npm rebuild better-sqlite3 --build-from-source 2>&1 | tee /tmp/better-sqlite3-build.log || {
        print_error "Error: better-sqlite3 build failed. Database will not work."
        print_error "Check /tmp/better-sqlite3-build.log for details"
        exit 1
    }

    print_status "Verifying better-sqlite3 native module..."
    node -e "require('better-sqlite3'); console.log('better-sqlite3:ok')" >/tmp/better-sqlite3-verify.log 2>&1 || {
        print_error "Error: better-sqlite3 verification failed (ABI mismatch or missing native binary)."
        print_error "Check /tmp/better-sqlite3-verify.log for details"
        exit 1
    }

    # Regenerate Prisma client to match installed runtime
    print_status "Generating Prisma client..."
    npx prisma generate --schema=prisma/schema.prisma

    print_status "Building project..."
    npm run build

    print_status "Build completed successfully!"
}

# Create .env file with configuration
create_env_file() {
    if [ "$DRY_RUN" -eq 1 ]; then
        print_dry "Create .env file with configuration"
        return
    fi

    # Generate a stable Server Actions encryption key if not provided
    if [ -z "$NEXT_SERVER_ACTIONS_ENCRYPTION_KEY" ]; then
        if command -v openssl >/dev/null 2>&1; then
            NEXT_SERVER_ACTIONS_ENCRYPTION_KEY="$(openssl rand -base64 32)"
            print_status "Generated NEXT_SERVER_ACTIONS_ENCRYPTION_KEY"
        else
            print_error "openssl not found; unable to auto-generate NEXT_SERVER_ACTIONS_ENCRYPTION_KEY"
            print_error "Set NEXT_SERVER_ACTIONS_ENCRYPTION_KEY manually in the environment before rerunning install.sh"
            exit 1
        fi
    else
        print_status "Using provided NEXT_SERVER_ACTIONS_ENCRYPTION_KEY"
    fi

    print_status "Creating .env file..."

    cat > "$INSTALL_DIR/.env" <<EOF
# Homeio Configuration
# Generated on $(date)

# Server Configuration
PORT=$HTTP_PORT
HOMEIO_HTTP_PORT=$HTTP_PORT
NODE_ENV=production

# Domain Configuration
EOF

    if [ -n "$DOMAIN" ]; then
        echo "HOMEIO_DOMAIN=$DOMAIN" >> "$INSTALL_DIR/.env"
        echo "# Access URL: http://$DOMAIN:$HTTP_PORT" >> "$INSTALL_DIR/.env"
    else
        echo "# HOMEIO_DOMAIN=home.local" >> "$INSTALL_DIR/.env"
        echo "# Uncomment and set your custom domain above" >> "$INSTALL_DIR/.env"
    fi

    cat >> "$INSTALL_DIR/.env" <<EOF

# Docker Configuration (for future use)
# DOCKER_SOCKET=/var/run/docker.sock

# App Data Directory
# APP_DATA_DIR=/opt/homeio/app-data

# Database (Prisma/SQLite)
DATABASE_URL="file:./prisma/homeio.db"

# Next.js Server Actions (keep stable across builds)
NEXT_SERVER_ACTIONS_ENCRYPTION_KEY="$NEXT_SERVER_ACTIONS_ENCRYPTION_KEY"
EOF

    print_status ".env file created successfully"
}

# Create systemd service
install_service() {
    if [ "$DRY_RUN" -eq 1 ]; then
        print_dry "Create systemd service for Homeio"
        print_dry "Enable and start Homeio service"
        return
    fi

    print_status "Creating systemd service..."

    cat > /etc/systemd/system/homeio.service <<EOF
[Unit]
Description=Homeio - Self-hosted Operating System
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=$INSTALL_DIR
EnvironmentFile=$INSTALL_DIR/.env
ExecStart=$INSTALL_DIR/node_modules/.bin/tsx server.ts
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=homeio

[Install]
WantedBy=multi-user.target
EOF

    print_status "Reloading systemd daemon..."
    systemctl daemon-reload

    print_status "Enabling Homeio service..."
    systemctl enable homeio

    print_status "Starting Homeio service..."
    systemctl start homeio

    # Wait a moment for service to start
    sleep 2

    # Check service status
    if systemctl is-active --quiet homeio; then
        print_status "Homeio service started successfully!"
    else
        print_error "Homeio service failed to start. Check logs with: journalctl -u homeio -n 50"
        exit 1
    fi
}

# Check if port is in use
check_port() {
    if [ "$DRY_RUN" -eq 1 ]; then
        print_dry "Check if port $HTTP_PORT is available"
        return
    fi

    if command -v lsof >/dev/null 2>&1; then
        if lsof -Pi :$HTTP_PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
            print_error "Port $HTTP_PORT is already in use. Please choose a different port or stop the service using it."
            print_error "You can check what's using the port with: sudo lsof -i :$HTTP_PORT"
            exit 1
        fi
    elif command -v netstat >/dev/null 2>&1; then
        if netstat -tuln | grep -q ":$HTTP_PORT "; then
            print_error "Port $HTTP_PORT is already in use. Please choose a different port or stop the service using it."
            exit 1
        fi
    fi
}

# ─── Main installation flow ──────────────────────────────────────────────────

if [ "$DRY_RUN" -eq 1 ]; then
    print_status "Running in dry-run mode - no changes will be made"
fi

# Prompt for port if not set via environment variables
prompt_port

# Prompt for domain
prompt_domain

# Check if port is available
check_port

# Step 1: Clone or extract the application (so setup.sh is available)
if [ "$FROM_SOURCE" -eq 1 ]; then
    ensure_git
    clone_HOMEIO
else
    # Artifact-based install (default)
    ARCH="$(detect_architecture)"
    if [ -n "$INSTALL_VERSION" ]; then
        VERSION="$INSTALL_VERSION"
    else
        VERSION="$(get_latest_version)"
    fi
    print_status "Installing Homeio ${VERSION} for ${ARCH}..."
    install_from_artifact "$VERSION" "$ARCH"
fi

# Step 2: Install system dependencies (Node.js, Docker, build tools, etc.)
if [ "$NO_DEP" -eq 0 ]; then
    SETUP_SCRIPT="${INSTALL_DIR}/scripts/setup.sh"
    if [ -x "$SETUP_SCRIPT" ]; then
        print_status "Running system setup (dependencies and hardening)..."
        SETUP_ARGS=(--http-port "$HTTP_PORT")
        [ "$DRY_RUN" -eq 1 ] && SETUP_ARGS+=("--dry-run")
        [ "$FROM_SOURCE" -eq 1 ] && SETUP_ARGS+=("--from-source")
        bash "$SETUP_SCRIPT" "${SETUP_ARGS[@]}"
    else
        print_error "setup.sh not found or not executable. Please ensure scripts/setup.sh is present."
        exit 1
    fi
fi

if [ "$DRY_RUN" -eq 0 ]; then
    restart_mdns
    verify_mdns_hostname "${HOSTNAME_ONLY:-${DOMAIN%.local}}"
fi

# Step 3: Create .env and run database migrations (requires Node.js from setup.sh)
if [ "$FROM_SOURCE" -eq 1 ]; then
    cd "$INSTALL_DIR"
    print_status "Creating environment configuration..."
    create_env_file
fi
if [ "$DRY_RUN" -eq 1 ]; then
    print_dry "Run prisma migrate deploy"
else
    cd "$INSTALL_DIR"
    print_status "Running database migrations (Prisma)..."
    if ! npx prisma migrate deploy --schema=prisma/schema.prisma; then
        print_error "Prisma migrations failed. Check DATABASE_URL in .env and rerun:"
        print_error "  npx prisma migrate deploy --schema=prisma/schema.prisma"
        exit 1
    fi
fi

# Step 4: Build from source (requires Node.js + build tools installed by setup.sh)
if [ "$FROM_SOURCE" -eq 1 ]; then
    build_HOMEIO
fi

# Install and start service
install_service

# Created update.sh to check for updates and update the project
# Usage: ./update.sh

if [ "$DRY_RUN" -eq 1 ]; then
    print_status "Dry run complete. Above actions would be performed during actual installation."
else
    echo ""
    echo -e "${GREEN}╭────────────────────────────────────────────────────╮${NC}"
    echo -e "${GREEN}│         Installation Complete! 🎉                  │${NC}"
    echo -e "${GREEN}├────────────────────────────────────────────────────┤${NC}"
    echo -e "${GREEN}│${NC}  Homeio is now running and accessible via:      ${GREEN}│${NC}"
    echo -e "${GREEN}│${NC}                                                  ${GREEN}│${NC}"
    if [ -n "$DOMAIN" ]; then
        LOCAL_URL="http://$DOMAIN:$HTTP_PORT"
        LOCAL_LABEL="Hostname"
    else
        LOCAL_URL="http://localhost:$HTTP_PORT"
        LOCAL_LABEL="Local"
    fi
    echo -e "${GREEN}│${NC}  ${BLUE}✓${NC} ${LOCAL_LABEL}:   ${BLUE}$LOCAL_URL${NC}"
    echo -e "${GREEN}│${NC}  ${BLUE}✓${NC} Network:    ${BLUE}http://$(hostname -I | awk '{print $1}'):$HTTP_PORT${NC}"

    echo -e "${GREEN}│${NC}                                                  ${GREEN}│${NC}"
    echo -e "${GREEN}╰────────────────────────────────────────────────────╯${NC}"
    echo ""

    if [ -n "$DOMAIN" ]; then
        echo -e "${BLUE}🌐 Access Homeio:${NC}"
        echo -e "   ${GREEN}http://$DOMAIN:$HTTP_PORT${NC}"
        echo ""
        echo -e "   Works automatically on most devices!"
        echo -e "   ${BLUE}(mDNS/.local domain via Avahi)${NC}"
        echo ""
    fi

    echo -e "${BLUE}🔧 Manage the service:${NC}"
    echo -e "   sudo systemctl [start|stop|restart|status] homeio"
    echo ""
    echo -e "${BLUE}📋 View logs:${NC}"
    echo -e "   sudo journalctl -u homeio -f"
    echo ""
    echo -e "${BLUE}⚙️  Configuration:${NC}"
    echo -e "   Edit: $INSTALL_DIR/.env"
    echo ""
    echo -e "${BLUE}🔄 Update Homeio:${NC}"
    echo -e "   cd $INSTALL_DIR && sudo bash update.sh"
    echo ""
fi
