# Quick Fix for node-pty Error

**Issue:** Service failing with "Failed to load native module: pty.node"

**Root Cause:** `node-pty` is a native module that requires compilation, but `npm install --ignore-scripts` skipped the build step.

---

## Fix on Your Ubuntu Server

Run these commands on your Ubuntu server:

```bash
# Stop the service
sudo systemctl stop homeio

# Install build tools (required for compiling native modules)
sudo apt-get update
sudo apt-get install -y build-essential python3

# Go to installation directory
cd /opt/homeio

# Rebuild node-pty
sudo npm rebuild node-pty

# Restart the service
sudo systemctl restart homeio

# Check status
sudo systemctl status homeio

# View logs
sudo journalctl -u homeio -n 50
```

---

## Expected Output

After `npm rebuild node-pty`, you should see:

```
> node-pty@1.1.0 install /opt/homeio/node_modules/node-pty
> node scripts/post-install.js

[Success] Build complete
```

After `systemctl status homeio`, you should see:

```
● homeio.service - Homeio - Self-hosted Operating System
     Active: active (running)
```

In the logs (`journalctl -u homeio`), you should see:

```
✓ Terminal WebSocket server initialized
> Ready on http://localhost:3000
```

---

## If Build Fails

If `npm rebuild node-pty` fails, the application will still work **without** the terminal feature.

You'll see in logs:

```
⚠ Terminal feature not available
  The application will work without terminal functionality
```

This is **normal and acceptable** - all other features (app store, monitoring, etc.) will work fine.

---

## Permanent Fix (Already in Updated Scripts)

The updated `install.sh` and `update.sh` scripts now:

1. ✅ Install build tools (`build-essential`, `python3`)
2. ✅ Run `npm rebuild node-pty` after installation
3. ✅ Handle failures gracefully (app works without terminal)

**Next time you install or update, this issue won't occur!**

---

## Alternative: Install from Scratch

If you want a clean install with all fixes:

```bash
# Backup .env if you have custom settings
sudo cp /opt/homeio/.env /tmp/homeio-env-backup

# Remove old installation
sudo systemctl stop homeio
sudo systemctl disable homeio
sudo rm -rf /opt/homeio
sudo rm /etc/systemd/system/homeio.service

# Fresh install with updated script
curl -fsSL https://raw.githubusercontent.com/doctor-io/homeio/develop/install.sh -o install.sh
sudo bash install.sh

# Restore .env if you had custom settings
sudo cp /tmp/homeio-env-backup /opt/homeio/.env
sudo systemctl restart homeio
```

---

## Verify Everything Works

```bash
# Check service status
sudo systemctl status homeio

# Check if port is listening
sudo ss -tulpn | grep 3000

# Check logs for errors
sudo journalctl -u homeio -n 100 --no-pager

# Test web access
curl http://localhost:3000
```

You should see HTML response from Homeio dashboard!

---

## Summary

**Immediate fix:**

```bash
sudo apt-get install -y build-essential python3
cd /opt/homeio && sudo npm rebuild node-pty
sudo systemctl restart homeio
```

**Check it worked:**

```bash
sudo journalctl -u homeio -n 20
```

Should show: `✓ Terminal WebSocket server initialized` or `⚠ Terminal feature not available` (both are OK!)

---

## What Changed in the Codebase

I've updated:

1. **`install.sh`**: Now installs build tools and rebuilds node-pty
2. **`update.sh`**: Now rebuilds node-pty after updates
3. **`server.ts`**: Gracefully handles node-pty failures (app won't crash)

**Your service will work now!** 🚀
