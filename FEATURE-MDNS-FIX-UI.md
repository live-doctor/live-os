# mDNS Fix Feature - UI Integration

## Overview

Added a new **"Fix mDNS Resolution"** troubleshooting tool in the Settings UI that allows users to fix `.local` domain resolution issues directly from the web interface.

## Location

**Settings → Troubleshoot → Fix mDNS Resolution**

The fix appears as a dedicated card in the troubleshoot dialog, positioned between the diagnostics/services cards and the logs viewer.

## What It Does

When users click **"Run Fix"**, the system automatically:

1. ✅ **Detects and disables systemd-resolved mDNS conflicts**
   - Creates `/etc/systemd/resolved.conf.d/90-homeio-mdns.conf`
   - Sets `MulticastDNS=no` and `LLMNR=no`
   - Restarts systemd-resolved

2. ✅ **Removes `.local` from `/etc/hosts`**
   - Backs up `/etc/hosts` before making changes
   - Strips `.local` suffixes from all entries
   - Ensures `.local` is only resolved via mDNS

3. ✅ **Creates Avahi HTTP service advertisement**
   - Creates `/etc/avahi/services/homeio-http.service`
   - Advertises HTTP service on the correct port

4. ✅ **Restarts Avahi daemon**
   - Reloads or restarts `avahi-daemon`
   - Forces re-registration of services

5. ✅ **Verifies no conflicts remain**
   - Checks Avahi logs for mDNS stack conflicts
   - Reports status to user

## User Experience

### Before Click
```
┌─────────────────────────────────────────────┐
│ 🌐 Fix mDNS Resolution                      │
│ Resolve .local domain issues                │
│                          [🌐 Run Fix]        │
│                                              │
│ This fix resolves intermittent .local       │
│ domain resolution issues by:                │
│ • Disabling systemd-resolved mDNS conflicts │
│ • Removing .local entries from /etc/hosts   │
│ • Creating Avahi HTTP service advertisement │
│ • Restarting Avahi daemon                   │
└─────────────────────────────────────────────┘
```

### During Execution
```
┌─────────────────────────────────────────────┐
│ 🌐 Fix mDNS Resolution                      │
│                    [⏳ Fixing...]            │
└─────────────────────────────────────────────┘
```

### After Success
```
┌─────────────────────────────────────────────┐
│ 🌐 Fix mDNS Resolution                      │
│                                              │
│ ✅ Avahi mDNS fix completed. Access your    │
│    server at http://<hostname>.local        │
│                                              │
│ Details:                                     │
│ ✓ systemd-resolved mDNS/LLMNR disabled     │
│ ✓ Removed .local conflicts from /etc/hosts │
│ ✓ Avahi HTTP service file already exists   │
│ ✓ Avahi daemon restarted                   │
│ ✓ No mDNS conflicts detected               │
│                                              │
│ Note: If issues persist, try rebooting     │
└─────────────────────────────────────────────┘
```

## Technical Implementation

### New Files

1. **`src/components/settings/troubleshoot/avahi-fix-card.tsx`**
   - React component for the UI card
   - Handles state, loading, and result display
   - Uses design tokens for consistency

2. **Server Action in `src/app/actions/maintenance/troubleshoot.ts`**
   - `fixAvahiMdns()` - Main fix function
   - Returns structured result with success status and details
   - Handles errors gracefully

### Modified Files

1. **`src/components/settings/troubleshoot/troubleshoot-dialog.tsx`**
   - Added `AvahiFixCard` component
   - Positioned between diagnostics and logs sections

2. **`src/app/actions/maintenance/troubleshoot.ts`**
   - Added `fixAvahiMdns()` server action
   - Exports the function for use in components

## Component Size

The `AvahiFixCard` component is **~150 lines**, which is at the upper limit of the micro-component standard. If it grows larger, consider splitting into:
- `avahi-fix-card.tsx` (main component)
- `avahi-fix-result.tsx` (result display)
- `avahi-fix-actions.tsx` (fix logic)

## Design Consistency

✅ Uses design tokens:
- `card.base` and `card.padding.md` for card styling
- `text.label` and `text.muted` for typography
- Consistent spacing and layout with other troubleshoot cards

✅ Follows existing patterns:
- Same structure as DiagnosticsCard and ServicesCard
- Consistent button styling
- Standard loading states with Loader2 icon
- Toast notifications for feedback

## Error Handling

The fix handles errors gracefully at multiple levels:

1. **Individual step failures** → Logs as warnings, continues to next step
2. **Complete failure** → Returns error with partial progress details
3. **UI feedback** → Shows error toast + displays error message in card
4. **Development mode** → Works even when systemd is unavailable

## Security

- ✅ Uses `sudo` for operations requiring root
- ✅ Backs up `/etc/hosts` before modifying
- ✅ Uses server actions (server-side execution only)
- ✅ No direct shell command injection from user input
- ✅ Validates files exist before modifying

## Testing Checklist

- [ ] Click "Run Fix" and verify all steps execute
- [ ] Check that toast notification appears
- [ ] Verify detailed results display in card
- [ ] Test error handling (e.g., when Avahi not installed)
- [ ] Confirm `/etc/hosts` backup is created
- [ ] Verify `.local` is removed from `/etc/hosts`
- [ ] Check systemd-resolved config is created
- [ ] Confirm Avahi service is restarted
- [ ] Test in production mode with systemd
- [ ] Test in development mode without systemd
- [ ] Verify dark mode styling
- [ ] Check responsive layout on mobile

## Future Enhancements

1. **Diagnostic Check** - Add mDNS resolution check to runDiagnostics()
2. **Auto-Fix** - Offer to run fix when mDNS check fails
3. **Reboot Button** - Add "Reboot Server" option after fix
4. **Status Monitor** - Show real-time mDNS status
5. **Hostname Display** - Show detected hostname in card
6. **Network Test** - Test `.local` resolution from UI

## User Documentation

Add to Homeio docs:

**Troubleshooting .local Domain Issues**

If you're having trouble accessing your server via `http://homeai.local`:

1. Open **Settings** (gear icon)
2. Click **Troubleshoot**
3. Find the **Fix mDNS Resolution** card
4. Click **Run Fix**
5. Wait for completion
6. Try accessing `http://homeai.local` again
7. If still not working, reboot your server

This fix addresses:
- Intermittent DNS resolution failures
- "DNS address could not be found" errors
- Works after restart but fails later
- Conflicts between Avahi and systemd-resolved

## Related Files

- Original fix script: `scripts/fix-avahi-mdns.sh`
- Setup integration: `scripts/setup.sh` (functions: `configure_mdns_stack`, `fix_etc_hosts_local_domain`, `configure_avahi_http_service`)
- Documentation: `MDNS-FIX-GUIDE.md`, `MDNS-ROOT-CAUSE.md`
