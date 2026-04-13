

# Restore Compact Banner & Home/Profile Section Separation

## Problem
The previous changes that separated Home vs Profile on mobile — including the `CompactBanner` component, `showFullBanner`/`showCompactBanner` conditionals, and `isHomeSection` logic — have been lost. Currently `ProfileBanner` renders unconditionally on all sections.

## Changes

### File: `src/components/patients/PatientDetailsEditor.tsx`

1. **Re-add conditional logic** before the return statements (both view and edit mode):
   - `isHomeSection = isMobile && isSelfService && section === "home"` — true when on mobile Home tab
   - `showFullBanner = !isMobile || !isSelfService || section === "home"` — full banner on Home/desktop
   - `showCompactBanner = isMobile && isSelfService && section !== "home" && section !== "rewards"` — compact banner on other mobile sections

2. **Re-add CompactBanner sub-component** — a slim single-row card:
   - Left: small avatar (h-10 w-10)
   - Center: Vula Vouchers horizontal logo + animated lollipop count (no "Earned:" prefix)
   - Bottom row: Calendar icon + Mic icon + next appointment or "No upcoming appointments" text

3. **Update both return blocks** (view mode ~line 1272, edit mode ~line 1780):
   - Replace `<ProfileBanner />` with conditional rendering:
     - `{showFullBanner && <ProfileBanner />}`
     - `{showCompactBanner && <CompactBanner />}`
   - Wrap the `<Tabs>` block in `{!isHomeSection && (...)}` so Home section only shows the banner

| File | Changes |
|------|---------|
| `src/components/patients/PatientDetailsEditor.tsx` | Re-add CompactBanner component, restore conditional banner/tabs logic for Home vs Profile mobile separation |

