#!/bin/bash

# Quick fix for Avahi mDNS resolution issues
# This script fixes systemd-resolved conflicts with Avahi

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() { echo -e "${GREEN}[+]${NC} $1"; }
print_error() { echo -e "${RED}[!]${NC} $1"; }
print_info() { echo -e "${BLUE}[i]${NC} $1"; }

# Get HTTP port from environment or default to 3000 (or 80 if in /opt/homeio)
if [ -d "/opt/homeio" ]; then
  HTTP_PORT=${HOMEIO_HTTP_PORT:-80}
else
  HTTP_PORT=${HOMEIO_HTTP_PORT:-3000}
fi

if [ "$EUID" -ne 0 ]; then
  print_error "This script must be run as root (sudo)"
  exit 1
fi

print_info "Fixing Avahi mDNS conflicts and service advertisement on port ${HTTP_PORT}"

# Check if Avahi is installed
if ! command -v avahi-daemon >/dev/null 2>&1; then
  print_error "Avahi is not installed. Run setup.sh first."
  exit 1
fi

# ─── Fix systemd-resolved mDNS conflict ─────────────────────────────────────

if command -v systemctl >/dev/null 2>&1 && systemctl list-unit-files 2>/dev/null | grep -q '^systemd-resolved'; then
  print_info "Detected systemd-resolved, checking for mDNS conflicts..."

  RESOLVED_DROPIN_DIR="/etc/systemd/resolved.conf.d"
  RESOLVED_DROPIN_FILE="${RESOLVED_DROPIN_DIR}/90-homeio-mdns.conf"

  # Create drop-in directory
  mkdir -p "$RESOLVED_DROPIN_DIR"

  # Create drop-in configuration to disable mDNS/LLMNR
  print_status "Creating systemd-resolved override to disable mDNS/LLMNR..."
  cat > "$RESOLVED_DROPIN_FILE" <<'EOF'
[Resolve]
MulticastDNS=no
LLMNR=no
EOF

  print_status "Created: $RESOLVED_DROPIN_FILE"

  # Restart systemd-resolved to apply changes
  if systemctl is-active --quiet systemd-resolved; then
    print_status "Restarting systemd-resolved to apply mDNS override..."
    systemctl restart systemd-resolved
    print_status "systemd-resolved mDNS/LLMNR disabled successfully"
  fi
else
  print_info "systemd-resolved not detected, skipping conflict resolution"
fi

# ─── Fix /etc/hosts conflicting with mDNS ──────────────────────────────────

print_info "Checking /etc/hosts for .local domain conflicts..."

# Remove .local from /etc/hosts if present (it should only be resolved via mDNS)
if grep -q "\.local" /etc/hosts; then
  print_status "Removing .local entries from /etc/hosts (these should be resolved via Avahi mDNS only)..."

  # Create backup
  cp /etc/hosts /etc/hosts.backup-$(date +%Y%m%d-%H%M%S)

  # Remove .local from all entries
  sed -i 's/\([[:space:]]\)\([^[:space:]]*\.local\)/\1/g' /etc/hosts

  # Clean up any duplicate spaces and empty lines that might have been created
  sed -i 's/[[:space:]]\+/ /g' /etc/hosts

  print_status "Cleaned /etc/hosts - removed .local domain entries"
else
  print_status "/etc/hosts is clean - no .local conflicts"
fi

# ─── Configure Avahi HTTP service ───────────────────────────────────────────

# Create service directory if it doesn't exist
SERVICE_DIR="/etc/avahi/services"
SERVICE_FILE="${SERVICE_DIR}/homeio-http.service"

if [ ! -d "$SERVICE_DIR" ]; then
  print_error "Avahi services directory not found: $SERVICE_DIR"
  exit 1
fi

# Create Avahi service file
print_status "Creating Avahi HTTP service file..."
cat > "$SERVICE_FILE" <<EOF
<?xml version="1.0" standalone='no'?>
<!DOCTYPE service-group SYSTEM "avahi-service.dtd">
<service-group>
  <name replace-wildcards="yes">Homeio on %h</name>
  <service>
    <type>_http._tcp</type>
    <port>${HTTP_PORT}</port>
  </service>
</service-group>
EOF

print_status "Created: $SERVICE_FILE"

# Reload Avahi daemon
if command -v systemctl >/dev/null 2>&1; then
  if systemctl is-active --quiet avahi-daemon; then
    print_status "Reloading Avahi daemon..."
    systemctl reload avahi-daemon 2>/dev/null || systemctl restart avahi-daemon
    print_status "Avahi daemon reloaded successfully"
  else
    print_info "Starting Avahi daemon..."
    systemctl start avahi-daemon
    systemctl enable avahi-daemon
    print_status "Avahi daemon started"
  fi
else
  print_info "systemctl not available, you may need to restart avahi-daemon manually"
fi

# Wait a moment for service to register
sleep 2

# Test the service
print_info "Testing mDNS service advertisement..."
if command -v avahi-browse >/dev/null 2>&1; then
  HOSTNAME=$(hostname)
  avahi-browse -t -r _http._tcp 2>&1 | grep -A 5 "Homeio on" || {
    print_error "Service not yet visible. Wait a few seconds and try: avahi-browse -t _http._tcp"
  }
  print_status "Success! Your server should now be accessible at: http://${HOSTNAME}.local:${HTTP_PORT}"
else
  print_info "avahi-browse not available for testing, but service should be active"
  print_status "Your server should now be accessible at: http://$(hostname).local:${HTTP_PORT}"
fi

print_status "Done! Try accessing your server from your Mac browser."

echo ""
print_info "Verifying configuration..."
echo ""

# Verify systemd-resolved mDNS is disabled
if command -v resolvectl >/dev/null 2>&1; then
  print_info "Current systemd-resolved mDNS status:"
  resolvectl status 2>/dev/null | grep -E "(MulticastDNS|LLMNR)" | head -5 || echo "  Unable to check status"
else
  print_info "resolvectl not available, checking config file:"
  if [ -f "$RESOLVED_DROPIN_FILE" ]; then
    cat "$RESOLVED_DROPIN_FILE"
  fi
fi

echo ""
print_info "Checking for mDNS stack conflicts in Avahi logs..."
if journalctl -u avahi-daemon -n 50 --no-pager 2>/dev/null | grep -q "WARNING.*another.*mDNS stack"; then
  print_error "⚠️  Still detecting mDNS conflicts. You may need to reboot the server."
  print_info "After reboot, check with: sudo journalctl -u avahi-daemon -n 20"
else
  print_status "✓ No mDNS conflicts detected!"
fi

echo ""
print_info "Checking /etc/hosts for .local conflicts..."
if grep -q "\.local" /etc/hosts; then
  print_error "⚠️  Found .local entries in /etc/hosts - these may cause resolution conflicts"
  print_info "Conflicting entries:"
  grep "\.local" /etc/hosts | sed 's/^/  /'
else
  print_status "✓ No .local conflicts in /etc/hosts"
fi
