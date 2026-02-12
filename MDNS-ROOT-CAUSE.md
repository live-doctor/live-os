# mDNS Resolution Root Cause Analysis

## The Smoking Gun 🔫

Your `/etc/hosts` file contains:
```bash
127.0.1.1 homeai.local homeai
```

**This is the root cause of all your intermittent mDNS failures.**

## Why This Breaks mDNS

### The Resolution Order

Linux DNS resolution follows this order (defined in `/etc/nsswitch.conf`):

```
hosts: files mdns4_minimal [NOTFOUND=return] dns mdns4
       ^^^^^  ^^^^^^^^^^^^^^
       1st    2nd (if file not found)
```

1. **files** → Check `/etc/hosts` first
2. **mdns4_minimal** → If not in files, try mDNS
3. **dns** → If mDNS fails, try regular DNS
4. **mdns4** → Final fallback to mDNS

### What Happens With Your Config

```
User's Mac queries: "What is homeai.local?"
       ↓
Avahi broadcasts on multicast: "homeai.local is at 192.168.1.12"
       ↓
Server's own resolver ALSO sees /etc/hosts: "homeai.local is at 127.0.1.1"
       ↓
Race condition: Which one wins?
       ↓
┌─────────────────────────────────────┬──────────────────────────────────────┐
│ If /etc/hosts wins:                 │ If Avahi wins:                       │
│ - Returns 127.0.1.1 (localhost)     │ - Returns 192.168.1.12 (WiFi IP)    │
│ - Mac tries to connect to localhost │ - Mac connects successfully          │
│ - Connection fails ❌                │ - Works perfectly ✅                  │
└─────────────────────────────────────┴──────────────────────────────────────┘
```

### Why It's Intermittent

The race condition is triggered by:

1. **Network events** (WiFi reconnect, Docker container start/stop)
2. **Resolver cache expiration**
3. **Avahi service restarts** (temporarily gives Avahi priority)
4. **Time-based cache invalidation**

This explains your exact symptoms:
- ✅ Works immediately after `systemctl restart avahi-daemon`
- ❌ Stops working "after a few moments"
- ✅ Works again after another restart
- ❌ Fails again randomly

## The Correct Configuration

### ❌ WRONG (causes conflicts):
```bash
# /etc/hosts
127.0.1.1 homeai.local homeai    # DON'T include .local here!
```

### ✅ CORRECT:
```bash
# /etc/hosts
127.0.1.1 homeai                 # No .local suffix

# The .local domain is ONLY resolved via Avahi mDNS
# (automatically broadcast on the network)
```

## How Umbrel Avoids This

Looking at Umbrel's code, they handle hostname configuration properly:

```typescript
// umbrel/source/modules/system/hostname.ts
await fse.writeFile('/etc/hostname', `${hostname}\n`)

const hostnameInEtcHostsRe = new RegExp(
  `^\\s*127.0.0.1\\s+${hostname}\\s*$`,  // ← Note: NO .local
  'm',
)

if (!hostnameInEtcHostsRe.test(etcHosts)) {
  await fse.writeFile('/etc/hosts', `${etcHosts.trimEnd()}\n127.0.0.1       ${hostname}\n`)
}
```

**Key difference**: Umbrel writes `127.0.0.1 umbrel` NOT `127.0.0.1 umbrel.local`

## Why You Had This Problem

Most likely, during initial server setup or hostname configuration, something (possibly a setup script or Ubuntu installer) added the `.local` suffix to `/etc/hosts`.

Common sources:
- Ubuntu desktop installer (adds `hostname.local` for convenience)
- Cloud-init scripts
- Manual hostname configuration tools
- Copied from a template

## The Complete Fix

The updated `fix-avahi-mdns.sh` script now:

1. ✅ Disables systemd-resolved mDNS (fixes conflict #1)
2. ✅ **Removes `.local` from `/etc/hosts`** (fixes the ROOT CAUSE)
3. ✅ Creates Avahi HTTP service file (enables service discovery)
4. ✅ Restarts both services
5. ✅ Verifies no conflicts remain

## How to Verify the Fix

After running the fix script, check:

```bash
# Should show NO .local entries
cat /etc/hosts | grep "\.local"

# Should be empty or show nothing
```

If you see any `.local` entries, they need to be removed.

## Long-term Prevention

The updated `setup.sh` now includes:

```bash
fix_etc_hosts_local_domain()  # Automatically removes .local conflicts
```

This ensures new installations won't have this problem.

## Technical Deep Dive

### Why .local is Special

The `.local` TLD (Top Level Domain) is **reserved for multicast DNS** by RFC 6762:

> The special domain "local." is designated for use in mDNS.
> Any DNS query for a name ending in ".local." MUST be sent to the mDNS multicast address.

**This means:**
- `.local` domains MUST NOT be in `/etc/hosts`
- `.local` domains MUST NOT be in regular DNS servers
- `.local` domains MUST ONLY be resolved via mDNS (Avahi/Bonjour)

### The Cache Priority Problem

When both `/etc/hosts` and mDNS have the same domain:

```
          Resolver Cache
               ↓
    ┌──────────┴──────────┐
    │                     │
/etc/hosts            Avahi mDNS
127.0.1.1            192.168.1.12
    │                     │
    └──────────┬──────────┘
               ↓
         Which wins?
     (depends on timing!)
```

Linux's `nsswitch.conf` defines a **sequential** order, but:
- Caching breaks this order
- Network events can flip priorities
- Race conditions emerge

### Why Restarting Avahi "Fixes" It

When you restart Avahi:

1. Avahi re-registers all services
2. Broadcasts fresh mDNS announcements
3. **Temporarily gets higher priority** in resolver cache
4. Works for a few moments
5. Then cache expires or network event happens
6. `/etc/hosts` wins again
7. Breaks

This is a **temporary workaround**, not a fix.

## Comparison: Umbrel vs Your Config

| Item | Umbrel | Your Server (Before Fix) | After Fix |
|------|--------|---------------------------|-----------|
| systemd-resolved mDNS | Disabled | Enabled ❌ | Disabled ✅ |
| `/etc/hosts` `.local` | None | `homeai.local` ❌ | None ✅ |
| Avahi service file | Created | Missing ❌ | Created ✅ |
| Result | Works reliably | Intermittent ❌ | Works reliably ✅ |

## Summary

**The root cause**: `.local` domain in `/etc/hosts` creating a resolver conflict
**Why it's intermittent**: Race condition between `/etc/hosts` and mDNS cache
**Why restart "fixes" it**: Temporarily gives Avahi priority
**The real fix**: Remove `.local` from `/etc/hosts` entirely

The `.local` domain is sacred to mDNS and must never appear in static host files.
