# Homeio

A self-hosted operating system dashboard for managing your home server infrastructure. Built with Next.js, Homeio combines the best ideas from popular self-hosted dashboards while filling in the gaps they leave behind.

![License](https://img.shields.io/github/license/doctor-io/homeio)
![GitHub release](https://img.shields.io/github/v/release/doctor-io/homeio)

## Why Homeio?

Homeio focuses on:

- Firewall management (UFW)
- Web terminal (host + containers)
- WiFi management UI
- LAN device discovery
- SMB file sharing (create shares)
- NFS/SMB network storage mounting
- System troubleshooting & diagnostics
- Live log streaming (journalctl)
- Custom docker-compose deploy
- File manager with compression (8+ formats)
- Real-time system monitoring with detailed charts
- PIN-based authentication
- App backup before updates

## App Store

Homeio imports app catalogs from supported API endpoints. The LinuxServer.io catalog is included by default and cannot be removed; add more from the App Store dialog as needed.

### Adding community stores

From the App Store dialog, you can import additional API endpoints by URL. For sources that are not supported, use Custom Deploy with your own compose YAML.

## Installation

Install Homeio with a single command:

```bash
curl -fsSL https://raw.githubusercontent.com/doctor-io/homeio/main/scripts/install.sh | sudo bash
```

This downloads a **pre-built release** for your architecture (amd64 or arm64) - no compilation needed on your device.

### Install from source

If you prefer to build on the device (or no release is available yet):

```bash
curl -fsSL https://raw.githubusercontent.com/doctor-io/homeio/main/scripts/install.sh | sudo bash -s -- --from-source
```

This clones the repo, installs dependencies, compiles native modules, and builds the project locally. Requires git, Node.js 20, and build tools (gcc, make, python3).

### Installation options

```bash
# Dry run - preview what would happen
curl -fsSL https://raw.githubusercontent.com/doctor-io/homeio/main/scripts/install.sh | sudo bash -s -- --dry-run

# Install a specific version
curl -fsSL https://raw.githubusercontent.com/doctor-io/homeio/main/scripts/install.sh | sudo bash -s -- --version v1.0.7

# Skip dependency installation
curl -fsSL https://raw.githubusercontent.com/doctor-io/homeio/main/scripts/install.sh | sudo bash -s -- --no-dep

# Build from source using a specific branch
curl -fsSL https://raw.githubusercontent.com/doctor-io/homeio/main/scripts/install.sh | sudo bash -s -- --from-source --branch develop
```

### Custom port & domain

By default, Homeio runs on port 80. To customize:

```bash
export HOMEIO_HTTP_PORT=8080
export HOMEIO_DOMAIN=home.local
curl -fsSL https://raw.githubusercontent.com/doctor-io/homeio/main/scripts/install.sh | sudo -E bash
```

Or enter them when prompted during installation.

During installation you can set a hostname (e.g. "home") and Homeio will install **Avahi** (mDNS), set the system hostname, and make it reachable as `home.local` across your entire network without editing hosts files.

## Quick Start

After installation, access Homeio at:

- `http://localhost` (or your custom port)
- `http://your-server-ip`
- `http://home.local` (if you set a custom domain)

## Updating

```bash
cd /opt/homeio && sudo bash scripts/update.sh
```

This checks the latest GitHub release, downloads the new build, backs up your `.env`, database, and external apps, then restores everything after extraction.

To update from source instead:

```bash
cd /opt/homeio && sudo bash scripts/update.sh --from-source
```

## Uninstalling

```bash
cd /opt/homeio && sudo bash scripts/uninstall.sh
```

This stops the service, removes the systemd unit, and deletes the installation directory. Optionally cleans up Docker resources and data.

## Managing the Service

```bash
sudo systemctl start homeio
sudo systemctl stop homeio
sudo systemctl restart homeio
sudo systemctl status homeio

# View logs
sudo journalctl -u homeio -f
```

## Features

### System Monitoring

Real-time CPU, RAM, storage, and network charts with per-container resource breakdown for Docker workloads.

### Web Terminal

Access your host OS shell or exec into any running Docker container directly from the browser using xterm.js and WebSocket.

### File Manager

Browse, create, rename, move, copy, and delete files. Edit text files with Monaco editor (syntax highlighting). Compress to tar.gz and decompress 8+ archive formats. Keyboard shortcuts (Cmd+X/C/V).

### Docker App Management

Install apps from the store, manage container lifecycle (start/stop/restart), view logs, and edit docker-compose configurations. Deploy custom containers via docker-compose or single docker run commands.

### Firewall Management

Full UFW integration: enable/disable firewall, create/delete rules, set default policies, configure port/protocol/direction, with IPv6 support.

### Network Management

Scan and connect to WiFi networks. Discover devices on your LAN via mDNS/ARP. Mount NFS and SMB network shares. Create and manage SMB file shares via Samba.

### Troubleshooting

Run system diagnostics (disk, memory, Docker, network, DNS). Browse and stream system logs from journalctl. Check and restart services. Export diagnostic reports.

### Settings

Scan and connect to WiFi networks. Discover devices on your LAN via mDNS/ARP. Mount NFS and SMB network shares. Create and manage SMB file shares via Samba.

### Troubleshooting

Run system diagnostics (disk, memory, Docker, network, DNS). Browse and stream system logs from journalctl. Check and restart services. Export diagnostic reports.

### Settings

Detailed hardware info tabs: CPU, memory, battery, graphics, network interfaces, thermals. Storage and partition overview.

## Architecture

- **Frontend**: Next.js 16, React 19, Tailwind CSS 4, Framer Motion
- **Backend**: Next.js Server Actions (no separate API server)
- **Database**: SQLite via Prisma ORM
- **Terminal**: xterm.js + node-pty over WebSocket
- **Target**: Debian LTS on amd64/arm64 (optimized for Raspberry Pi 4)

## Development

```bash
git clone https://github.com/doctor-io/homeio.git
cd homeio
npm install
npm run dev
```

Runs on `http://localhost:3000`.

## License

[Apache License 2.0](LICENSE)
