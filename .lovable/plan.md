

# Updated Plan: Remove Navigation, Tab-Based Patient App + Vula-Themed Rewards Cards

## Summary

Everything from the previously proposed plan (remove sidebar/bottom nav, create `PatientAppLayout`, add Settings tab, Vula Vouchers logo, back-to-home navigation, upcoming appointments in top bar, sign-out under avatar) **plus** recoloring the My Rewards hero stat cards to match the Vula logo color scheme.

## Additional Change: Rewards Card Colors

**File:** `src/pages/patient/MyRewards.tsx` (lines 312-368) and `src/components/gamification/LollipopReport.tsx` (line 33)

The Vula logo uses a blue-to-teal gradient palette. The four hero stat cards currently use yellow/lime, fuchsia/pink, orange/red, and sky/cyan gradients — these will be updated to variations within the Vula blue-teal spectrum:

| Card | Current Colors | New Colors |
|------|---------------|------------|
| Total Vulas | yellow-300 → lime-400 | blue-500 → cyan-400 |
| Current Level | fuchsia-400 → pink-500 | blue-600 → teal-500 |
| Active Streaks | orange-400 → red-500 | sky-400 → teal-400 |
| Transferred | sky-400 → cyan-500 | indigo-400 → blue-500 |

Text colors on the cards will be updated to white/blue tones for contrast. The LollipopReport summary card gradient will also change from emerald/teal to the same blue-teal palette.

## Full Plan (all changes)

### 1. Create `PatientAppLayout` component
New layout with top bar (Holarc logo, upcoming appointments for next 2 weeks clickable → calendar, avatar with sign-out popover). No sidebar or bottom nav.

### 2. Modify routing in `App.tsx`
Separate patient routes under `PatientAppLayout`; doctor/admin routes stay under `AppLayout`.

### 3. Restructure `MyDetails.tsx`
Logo above "My Holarchive" heading. Horizontal Vula Vouchers logo on the right → links to `/patient/rewards`. This page becomes the patient home.

### 4. Add "Settings" tab to `PatientDetailsEditor.tsx`
New tab with sub-tabs: Preferences, Notifications, Security, Billing. Extract Settings page content into reusable `SettingsContent` component.

### 5. Back-to-home on Calendar and Rewards pages
Add "← Back to Home" button on `PatientCalendar.tsx` and `MyRewards.tsx`.

### 6. Recolor My Rewards cards to Vula blue-teal palette
Update all 4 hero stat cards and the LollipopReport summary card gradients to use blue/cyan/teal/indigo tones matching the Vula logo.

### 7. Copy Vula Vouchers logo asset
Save uploaded image as `src/assets/vula-vouchers-logo.png`.

## Technical Summary

| File | Change |
|------|--------|
| `src/components/layout/PatientAppLayout.tsx` | New: top bar layout, no sidebar/bottom nav |
| `src/App.tsx` | Split patient routes under new layout |
| `src/pages/patient/MyDetails.tsx` | Logo above heading, Vula Vouchers logo linking to rewards |
| `src/components/patients/PatientDetailsEditor.tsx` | Add Settings tab with sub-tabs |
| `src/pages/Settings.tsx` | Extract `SettingsContent` for reuse |
| `src/pages/patient/PatientCalendar.tsx` | Add back-to-home button |
| `src/pages/patient/MyRewards.tsx` | Back-to-home button + recolor 4 hero cards to blue-teal Vula palette |
| `src/components/gamification/LollipopReport.tsx` | Recolor summary card to blue-teal palette |
| `src/assets/vula-vouchers-logo.png` | New asset from uploaded image |

