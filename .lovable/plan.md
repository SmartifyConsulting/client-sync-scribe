

# Doctor Mobile View: Home Nav, Share App Relocation, Consistency Fixes

## Summary
Add a "Home" tab to the doctor bottom nav, move "Share App" into the avatar popover, ensure the doctor Profile page uses collapsible accordions with edit icons, and replace the old Vula symbol/Ⓜ with the Vula Vouchers logo in DoctorRewards to match the patient view.

## Changes

### 1. Add "Home" as first doctor bottom nav item
**File:** `src/components/layout/BottomNav.tsx`
- Insert `{ icon: LayoutDashboard, label: "Home", to: "/dashboard" }` as the first item in `doctorNavItems`
- This gives 6 items total: Home, Patients, Sessions, Practice, Rewards, Profile

### 2. Move Share App into avatar popover, remove from Dashboard
**File:** `src/pages/Dashboard.tsx`
- Remove the `<ShareAppDialog />` from the dashboard header (line 256)
- Remove the `ShareAppDialog` import

**File:** `src/components/layout/TopBarIcons.tsx`
- Share App is already in the avatar popover (line 168-172) — no change needed here

### 3. Replace Vula symbol/Ⓜ with Vula Vouchers logo in DoctorRewards
**File:** `src/pages/doctor/DoctorRewards.tsx`
- Replace `import vulaSymbol from "@/assets/vula-symbol.png"` with `import vulaVouchersLogo from "@/assets/vula-vouchers-logo.png"`
- Replace all `vulaSymbol` references with `vulaVouchersLogo`
- Replace all `Ⓜ` text occurrences with small inline Vula Vouchers logo images (matching how the patient MyRewards page renders them)

### 4. Doctor Profile — collapsible sections with edit icons
**File:** `src/pages/Profile.tsx`
- The Profile page already renders `<PatientDetailsEditor>` which has collapsible accordions and inline edit icons — this is already consistent. No change needed unless the doctor-specific heading or wrapper needs accordion treatment.

## Files Modified

| File | Changes |
|------|---------|
| `src/components/layout/BottomNav.tsx` | Add "Home" as first doctor nav item |
| `src/pages/Dashboard.tsx` | Remove ShareAppDialog from header |
| `src/pages/doctor/DoctorRewards.tsx` | Replace vula-symbol with vula-vouchers-logo, replace Ⓜ with logo images |

