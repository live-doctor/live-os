# mDNS Resolution Fix Guide

## Problem Identified

Your `homeai.local` DNS resolution fails intermittently because of **THREE issues**:

1. **systemd-resolved with mDNS enabled** - Interfering with Avahi
2. **`.local` domain in `/etc/hosts`** - CRITICAL ISSUE causing intermittent failures
3. **Missing Avahi service advertisement** - Service file needed

### The Critical Issue: `/etc/hosts` Conflict

Your `/etc/hosts` file contains:
```
127.0.1.1 homeai.local homeai
```

This tells the system "resolve `homeai.local` to `127.0.1.1` (localhost)" which:
- **Prevents mDNS from working** because the system resolver finds it in `/etc/hosts` first
- **Causes intermittent failures** when the resolver cache switches between `/etc/hosts` and mDNS
- **Makes it work after Avahi restart** because Avahi re-registers and temporarily takes priority
- **Breaks again after a few moments** when a network event triggers cache refresh

The **`.local` domain should NEVER be in `/etc/hosts`** - it must ONLY be resolved via mDNS/Avahi.

## Evidence from Your Server

```bash
# Avahi IS working and advertising the service
$ avahi-browse -at | grep -i homeai
+ wlp0s20f3 IPv4 Homeio on homeai    Web Site    local

# But systemd-resolved is ALSO trying to do mDNS
$ systemctl is-active systemd-resolved
active

# The config shows settings are commented (NOT applied)
$ cat /etc/systemd/resolved.conf | grep -E "MulticastDNS|LLMNR"
#MulticastDNS=no    ← Not active!
#LLMNR=no           ← Not active!

# Avahi logs confirm the conflict
Feb 11 22:26:12 homeai avahi-daemon[271753]: *** WARNING: Detected another IPv4 mDNS stack running on this host. This makes mDNS unreliable ***
```

## The Fix

Run the updated fix script on your server:

```bash
# On your homeai server
sudo bash /path/to/homeio/scripts/fix-avahi-mdns.sh
```

### What the Script Does

1. **Creates drop-in config** for systemd-resolved:
   - Location: `/etc/systemd/resolved.conf.d/90-homeio-mdns.conf`
   - Disables mDNS and LLMNR in systemd-resolved
   - Leaves DNS resolution intact (only disables mDNS)

2. **Restarts systemd-resolved** to apply the changes

3. **Ensures Avahi service file exists** (already present in your case)

4. **Reloads Avahi** to refresh service advertisements

5. **Verifies** no more conflicts in logs

## Why Comments in `/etc/systemd/resolved.conf` Don't Work

The main config file `/etc/systemd/resolved.conf` has **commented defaults**:

```ini
#MulticastDNS=no
#LLMNR=no
```

These comments mean "use the compiled-in default" which is **MulticastDNS=yes** and **LLMNR=yes** on most Ubuntu systems.

To actually disable them, you need:

1. **Option A**: Uncomment and set in main file (gets overwritten on upgrades)
2. **Option B**: Create drop-in file in `/etc/systemd/resolved.conf.d/` (survives upgrades) ✅

We use **Option B** which is the recommended approach.

## After Running the Fix

### Test 1: Verify systemd-resolved Settings

```bash
# Check if drop-in config was created
cat /etc/systemd/resolved.conf.d/90-homeio-mdns.conf

# Check current mDNS status (should show "no")
resolvectl status | grep -E "MulticastDNS|LLMNR"
```

Expected output:
```
MulticastDNS setting: no
LLMNR setting: no
```

### Test 2: Verify No More Conflicts

```bash
# Check Avahi logs for conflicts
sudo journalctl -u avahi-daemon -n 30 --no-pager | grep -i warning

# Should NOT see "another mDNS stack" warnings anymore
```

### Test 3: Test from Your Mac

```bash
# Should resolve immediately without delays
ping homeai.local

# Should work reliably in browser
open http://homeai.local:3000
```

## If It Still Doesn't Work

**You may need to reboot** to fully clear the mDNS conflict:

```bash
sudo reboot
```

After reboot:
- systemd-resolved will start with mDNS disabled
- Avahi will be the only mDNS responder
- No more race conditions

## Why This Affects Ubuntu But Not Always Debian

| Distribution | systemd-resolved | Default mDNS |
|--------------|------------------|--------------|
| Ubuntu 20.04+ | Installed | **Enabled** ⚠️ |
| Ubuntu 18.04 | Installed | Disabled |
| Debian 11+ | Optional | Disabled |
| Raspberry Pi OS | Usually not installed | N/A |

This is why **Umbrel might work fine** - they may be testing on systems where systemd-resolved isn't installed or doesn't have mDNS enabled.

## For Production Deployment

The updated `setup.sh` now includes:

1. `install_avahi()` - Installs Avahi daemon
2. `configure_mdns_stack()` - Disables systemd-resolved mDNS
3. `configure_avahi_http_service()` - Creates service advertisement

All three run during initial setup, preventing this issue for new installations.

## Technical Details

### How mDNS Works

1. Client (Mac) sends multicast DNS query to `224.0.0.251:5353`
2. All mDNS responders on network listen
3. **Only the host named in query should respond**
4. If multiple responders reply → **race condition**

### Why systemd-resolved Interferes

systemd-resolved tries to be helpful by:
- Resolving `.local` domains via mDNS
- But it's **not authoritative** for your hostname
- It may respond with cached/stale data
- Or delay long enough that the client times out

### Why Avahi is the Right Choice

- **Purpose-built** for mDNS/DNS-SD
- Properly implements the protocol
- Advertises services correctly
- Standard on most Linux distributions for mDNS

## Summary

**Problem**: Two mDNS responders fighting = intermittent failures
**Root Cause**: systemd-resolved mDNS not properly disabled
**Solution**: Create drop-in config to disable systemd-resolved mDNS
**Result**: Avahi becomes sole mDNS responder = reliable resolution

This is **not an issue with your Next.js app** - it's purely a server networking configuration issue that affects all services on the host, regardless of the application stack.
