

# Mobile Banner & Navigation Fixes

## Summary
Multiple targeted fixes: replace Vula Vault logo with Vula Vouchers logo in Recent Rewards, add "My" prefix to Sessions/Round Table headings, fix bottom nav wrapping to single row, remove "You have earned" text from CompactBanner, rename "My Vulas" to "My Rewards" in nav, and make Personal/Medical sub-tabs more visible.

## Changes

### 1. Recent Rewards — Replace logo with Vula Vouchers
**File:** `src/pages/patient/MyRewards.tsx`
- The empty state already uses `vulaVouchersLogo` (line 443) — this is correct
- The image reference at line 443 uses `h-12 w-12` which is small for a centered logo; increase to `h-16 w-auto` for better visibility
- The per-reward row icons (line 451) also use `vulaVouchersLogo` — keep as-is

### 2. Add "My" prefix to Sessions & Round Table headings
**File:** `src/components/patients/PatientDetailsEditor.tsx`
- Line 1234: Change `Sessions` → `My Sessions` (mobile tab trigger)
- Line 1254: Change `Round Table` → `My Round Table` (mobile tab trigger)
- Line 1828 (view mode content heading): Change `Sessions` → `My Sessions`
- Line 1892 (view mode content heading): Change `Round Table` → `My Round Table`
- Line 3306 (edit mode content heading): Change `Sessions` → `My Sessions`
- Line 3372 (edit mode content heading): Change `Round Table` → `My Round Table`

### 3. Fix bottom nav wrapping — force single row
**File:** `src/components/layout/BottomNav.tsx`
- The 5 patient nav items with `min-w-[64px]` and `px-3` can overflow on small screens
- Reduce `min-w-[64px]` to `min-w-0`, reduce `px-3` to `px-1`, and add `flex-1` to each button so they share space equally
- This ensures all 5 items fit on one row even on 320px screens

### 4. Remove "You have earned" from CompactBanner
**File:** `src/components/patients/PatientDetailsEditor.tsx`
- In CompactBanner (line 1389): Remove the "You have earned" span
- Just show the Vula count number next to the logo, more compact

### 5. Rename "My Vulas" → "My Rewards" in bottom nav
**File:** `src/components/layout/BottomNav.tsx`
- Line 29: Change label from `"My Vulas"` to `"My Rewards"`

### 6. Rename "My Vulas" → "My Rewards" in desktop/tablet tab bar
**File:** `src/components/patients/PatientDetailsEditor.tsx`
- Line 1323: Change `My Vulas` → `My Rewards`

### 7. Make Personal/Medical sub-tabs more pronounced
**File:** `src/components/patients/PatientDetailsEditor.tsx`
- Sub-tabs at line 1330 use `bg-muted` which is near-white
- Change to `bg-primary/15` for a more visible teal-tinted background, making the sub-tab row stand out from the card content
- Apply same change to care sub-tabs (line 1342) and admin sub-tabs (line 1357) for consistency

| File | Changes |
|------|---------|
| `src/components/layout/BottomNav.tsx` | Rename "My Vulas" → "My Rewards", fix single-row layout |
| `src/components/patients/PatientDetailsEditor.tsx` | Add "My" prefix to Sessions/Round Table headings, remove "You have earned" from CompactBanner, rename "My Vulas" tab, make sub-tabs more visible |
| `src/pages/patient/MyRewards.tsx` | Increase Vula Vouchers logo size in empty state |

