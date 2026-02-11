#!/bin/bash

# Quick fix for Avahi mDNS resolution issues
# This script creates the missing Avahi HTTP service advertisement

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

print_info "Configuring Avahi HTTP service advertisement on port ${HTTP_PORT}"

# Check if Avahi is installed
if ! command -v avahi-daemon >/dev/null 2>&1; then
  print_error "Avahi is not installed. Run setup.sh first."
  exit 1
fi

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
