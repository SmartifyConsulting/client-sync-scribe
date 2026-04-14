

# Bottom Nav for All Viewports + Vula Logo Fixes + Tab Consolidation

## Summary
Four groups of changes: show bottom nav on tablet/web, replace incorrect Vula logos with the uploaded Vula Vouchers logo, fix logo aspect ratios in reward cards, and merge the "Vula Partner Apps" tab into the "Transfers" tab for both Doctor and Patient views.

## Changes

### 1. Show bottom navigation on tablet and web views
**File:** `src/components/layout/BottomNav.tsx`
- Remove the `md:hidden` class from both doctor and patient nav containers so the bottom nav renders on all viewports
- Keep the same styling and behavior across all screen sizes

### 2. Copy uploaded Vula Vouchers logo into project assets
- Copy `user-uploads://VulaLogo-2.png` to `src/assets/vula-vouchers-logo-v2.png`
- This is the correct vertical "VULA VOUCHERS" logo the user wants used

### 3. Fix logo aspect ratios and replace logos in Doctor Rewards
**File:** `src/pages/doctor/DoctorRewards.tsx`
- Import the new `vula-vouchers-logo-v2.png`
- In the "Doctor Vulas" and "Patient Vulas" cards (lines 142, 148): replace `h-4 w-4` inline logos with properly sized logos that preserve aspect ratio (use `h-5 w-auto object-contain`)
- In "Recent Rewards" list (line 211): make the logo the same size as Patient rewards (`h-7 w-7 object-contain` — already correct, verify consistency)
- In the Combined card (line 134): ensure `object-contain` is used
- Remove the separate "Vula Partner Apps" tab trigger (line 177) and merge partner apps content into the "Transfers" tab content — show partner apps grid at top, transfer history below (same pattern as Patient MyRewards already has)

### 4. Fix logo aspect ratios and consolidate tabs in Patient Rewards
**File:** `src/pages/patient/MyRewards.tsx`
- Import the new `vula-vouchers-logo-v2.png`
- The Patient rewards "Transfers" tab already shows partner apps at top + transfer history below (lines 643-735) — this is correct
- Remove the now-redundant separate "Vula Partner Apps" tab if one exists (check tab triggers)
- Ensure all inline Vula logo references use `object-contain` and consistent sizing (`h-5 w-auto` for inline, `h-7 w-7` for list items)
- Replace the `Ⓜ` symbol references with the actual logo image where appropriate

### 5. Consolidate Doctor Rewards Transfers + Vula Partner Apps tabs
**File:** `src/pages/doctor/DoctorRewards.tsx`
- Remove the "Vula Partner Apps" TabsTrigger (line 177)
- Remove the "vula-apps" TabsContent (lines 354-413)
- Move the partner apps grid into the top of the "transfers" TabsContent (lines 327-352), showing partner apps first, then transfer history below — matching the Patient layout

## Files Modified

| File | Changes |
|------|---------|
| `src/components/layout/BottomNav.tsx` | Remove `md:hidden` to show bottom nav on all viewports |
| `src/pages/doctor/DoctorRewards.tsx` | Fix logo aspect ratios, use new logo, merge Vula Partner Apps into Transfers tab |
| `src/pages/patient/MyRewards.tsx` | Fix logo aspect ratios, use new logo, ensure tabs are consolidated |
| `src/assets/vula-vouchers-logo-v2.png` | New file — uploaded Vula Vouchers logo |

