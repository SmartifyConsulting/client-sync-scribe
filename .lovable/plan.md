

# Split Home & Profile Tabs + Vula Vouchers Logo Update

## Summary
Re-introduce a "Home" icon in the mobile bottom nav that shows only the ProfileBanner (dashboard content). The "Profile" tab shows only the Personal/Medical Information tabs. Also replace the small Vula symbol icon with the uploaded horizontal Vula Vouchers logo in both the profile banner and the My Rewards "Recent Rewards" section.

## Changes

### 1. Copy uploaded logo to project assets
- Copy `user-uploads://VulaVouchersHorizontalLogo.png` to `src/assets/vula-vouchers-logo.png`

### 2. Add "Home" back to mobile bottom nav
**File:** `src/components/layout/BottomNav.tsx`
- Add a Home item back to `patientSections` array: `{ icon: LayoutDashboard, label: "Home", section: "home" }`
- Place it first, before Profile

### 3. Update SECTION_TABS to separate Home from Profile
**File:** `src/components/patients/PatientDetailsEditor.tsx`
- Change `SECTION_TABS` so `home` maps to an empty array `[]` (no clinical tabs shown — only the banner)
- Keep `health` (Profile) mapping to `["personal", "medical"]`

### 4. Conditionally hide tabs on Home section (mobile)
**File:** `src/components/patients/PatientDetailsEditor.tsx`
- When `section === "home"` on mobile, hide the tab bar and all tab content — show only the ProfileBanner
- When `section === "health"` (Profile), show Personal/Medical tabs as normal, and hide the ProfileBanner to avoid duplication

### 5. Replace Vula symbol with horizontal logo in ProfileBanner
**File:** `src/components/patients/PatientDetailsEditor.tsx`
- Import the new logo: `import vulaVouchersLogo from "@/assets/vula-vouchers-logo.png"`
- In the Vula Vouchers row (line 1125-1138), replace the small icon + text with the horizontal logo image, sized appropriately (e.g., `h-10` auto width)

### 6. Replace Vula symbol in My Rewards "Recent Rewards" section
**File:** `src/pages/patient/MyRewards.tsx`
- Import the horizontal logo
- Replace the Gift icon or vula-symbol in the "Recent Rewards" card header with the new horizontal logo

## Files Modified

| File | Changes |
|------|---------|
| `src/assets/vula-vouchers-logo.png` | New file — uploaded logo |
| `src/components/layout/BottomNav.tsx` | Re-add Home item to patient nav |
| `src/components/patients/PatientDetailsEditor.tsx` | Separate Home/Profile views, replace Vula logo |
| `src/pages/patient/MyDetails.tsx` | Default section stays `"health"` for non-mobile |
| `src/pages/patient/MyRewards.tsx` | Replace icon in Recent Rewards with horizontal logo |

