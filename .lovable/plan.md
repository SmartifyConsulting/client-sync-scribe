

# Plan: Settings Tab Restructure + Font Fix + Font Size Reduction

## Summary

Restructure Settings tabs by removing Patients (already in Holarchive), merging Partners into Practice, merging Calendar and Language into Preferences, and merging Preferences into Personal. Also fix signature font rendering and reduce all font sizes by 30%.

## Tab Structure: Before → After

**Before**: Personal | Practice | Partners | Patients | Referrals | Pricing | Certificates | Moolas | Preferences | Calendar | Notifications | Security | Billing | Data

**After**: Personal | Practice | Referrals | Pricing | Certificates | Moolas | Notifications | Security | Billing | Data

## Changes

### 1. `src/pages/Settings.tsx` — Tab restructure

**Remove tabs**: Partners, Patients, Calendar, Preferences

**Move Partners section** (lines 1080-1142) into the Practice tab (after the signature section, ~line 1024), as a new "Partners" frame/section with a separator.

**Move into Personal tab** (after MailboxSection, ~line 941):
- A new **"Preferences"** section frame containing:
  - The existing Preferences content (auto-email toggles for patients, Patient Management for doctors — lines 1308-1369)
  - A new **"Language"** sub-frame containing Country, Language, and Narration Voice selectors (currently in Practice tab, lines 1026-1075) — move from Practice to here
  - A new **"Calendar Integration"** sub-frame containing Google/Outlook calendar connect/disconnect (lines 1372-1411)

**Remove from Practice tab**: Country/Language/Narration Voice block (lines 1026-1075) — moved to Personal > Preferences > Language

**Remove TabsTrigger entries** for: `partners`, `patients`, `calendar`, `preferences`

### 2. `src/pages/Settings.tsx` — Fix signature fonts

Change all `SIGNATURE_FONTS` entries from `cursive` fallback to `serif`:
- `"'Allura', cursive"` → `"'Allura', serif"`
- Same for all 11 fonts

Add `document.fonts.ready` state check so signature preview renders only after fonts load.

### 3. `src/index.css` — Reduce font sizes by 30%

- Change base body font from `10.5px` to `7.35px`
- Keep `.font-size-preserve` at `15px` for nav and To-Do

### 4. `src/pages/Settings.tsx` — Scale down explicit Tailwind classes

- `text-lg` → `text-sm`
- `text-base` → `text-xs`  
- `text-sm` → `text-[10px]`
- Applied to headings and labels throughout Settings

## Files Modified

| File | Change |
|------|--------|
| `src/pages/Settings.tsx` | Remove Patients/Partners/Calendar/Preferences tabs; merge Partners into Practice; merge Calendar + Language + Preferences into Personal; fix signature font fallbacks; scale down text classes |
| `src/index.css` | Reduce base font to 7.35px |

