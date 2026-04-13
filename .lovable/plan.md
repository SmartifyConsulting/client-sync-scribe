

# Restructure Navigation Labels, Desktop Care Grouping, Compact Banner & Share Button

## Summary
1. Rename bottom nav labels: Profile→My Profile, Care→My Healthcare, Admin→My Desk, Rewards→My Vulas
2. On desktop/tablet, collapse Care tabs (Care Team, Sessions, Round Table) under a "My Healthcare" parent group with sub-tabs — matching what mobile does
3. Rename "My Admin" to "My Desk" and "My Rewards" to "My Vulas" across all views
4. Show a compact/summarised ProfileBanner (avatar + Vulas count + Vula logo + calendar/mic icons + appointments line) on non-Home mobile sections, keeping it static across tab views
5. Add a Share App button/icon accessible under the avatar popover on all views (already exists in TopBarIcons — just confirm it's visible for patients too)

## Changes

### 1. BottomNav — Rename labels
**File:** `src/components/layout/BottomNav.tsx`

Update `patientSections` labels:
- `"Profile"` → `"My Profile"`
- `"Care"` → `"My Healthcare"`
- `"Admin"` → `"My Desk"`
- `"Rewards"` → `"My Vulas"`

### 2. Desktop/Tablet tabs — Group Care tabs under "My Healthcare" parent
**File:** `src/components/patients/PatientDetailsEditor.tsx`

In the desktop/tablet `renderTabsList`:
- Add `CARE_TABS = ["doctors", "sessions", "roundtable"]`
- Replace the standalone "My Care Team", "My Sessions", "My Round Table" TabsTriggers with a single **"My Healthcare"** parent button (like My Profile / My Admin pattern)
- Add a sub-tab row when `activeParentTab === "care"` showing Care Team, Sessions, Round Table
- Rename "My Admin" parent button → "My Desk"
- Rename "My Rewards" tab → "My Vulas"
- Update `activeParentTab` sync logic to handle the new "care" parent

### 3. Compact ProfileBanner for non-Home mobile sections
**File:** `src/components/patients/PatientDetailsEditor.tsx`

Currently `showBanner` is false when on mobile sections other than "home". Change to:
- On mobile Home section: show the **full** ProfileBanner (as-is)
- On mobile non-Home sections (My Profile, My Healthcare, My Desk): show a **compact** banner — a single row card matching the attached design:
  - Left: small avatar (h-12 w-12)
  - Center: "You have earned **1,523**" + Vula Vouchers horizontal logo
  - Below: calendar icon + mic icon + "No upcoming appointments." text
- This compact banner stays static/visible across all non-Home tab views

Create a `CompactBanner` sub-component inside ProfileBanner or alongside it.

### 4. Share App in avatar popover — already exists
**File:** `src/components/layout/TopBarIcons.tsx`

The Share App dialog is already in the avatar popover (line 168-172) and visible to all users. No changes needed here — it's already accessible across all views under the profile pic on the top right.

## Files Modified

| File | Changes |
|------|---------|
| `src/components/layout/BottomNav.tsx` | Rename 4 nav labels |
| `src/components/patients/PatientDetailsEditor.tsx` | Group Care tabs on desktop/tablet, rename Admin→My Desk and Rewards→My Vulas, add compact banner for non-Home mobile sections |

