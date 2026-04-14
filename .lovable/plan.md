

# Rewards Card Layout + Transfer UX + Sidebar/Nav Restructuring

## Summary
Five groups of changes: rearrange reward cards in a 2x2 grid on mobile, add a transfer button with from/to app dropdowns in the Transfers section, remove bottom nav on W/T, restructure the sidebar navigation for doctors.

## Changes

### 1. Reward cards: 2x2 grid on mobile with Doctor/Patient on top
**Files:** `src/pages/doctor/DoctorRewards.tsx`, `src/pages/patient/MyRewards.tsx`

**Doctor Rewards:** Reorder the 4 cards so Doctor Vulas and Patient Vulas are first (top row), Combined and Transferred are second (bottom row). Change grid from `sm:grid-cols-4` to `grid-cols-2` so it's always 2x2.

**Patient Rewards:** Already uses `grid-cols-2 md:grid-cols-4`. Keep `grid-cols-2` for mobile. On larger screens keep 4-column. No reorder needed (already correct).

### 2. Transfer button with From/To app dropdowns
**Files:** `src/pages/doctor/DoctorRewards.tsx`, `src/pages/patient/MyRewards.tsx`

In the Transfers tab content, add a prominent "Transfer Vulas" button/section. Update the transfer dialog to include:
- **From** dropdown: lists partner apps the user can transfer from
- **To** dropdown: lists partner apps the user can transfer to
- Amount field (already exists)

This replaces the current single "Partner App" dropdown with a two-dropdown from/to pattern.

### 3. Remove bottom nav on Web and Tablet (keep mobile only)
**File:** `src/components/layout/BottomNav.tsx`
- Add `md:hidden` back to the nav container for both doctor and patient navs, so bottom nav only shows on mobile

**File:** `src/components/layout/AppLayout.tsx`
- Restore `pb-24 md:pb-0` on main content (already correct)

### 4. Restructure doctor sidebar navigation
**File:** `src/components/layout/Sidebar.tsx`

Update `doctorNavItems` to:
```
Dashboard  → /dashboard
My Patients → /patients
My Holarprac → /practice
Admin → /admin
My Vulas → /doctor/rewards
```

Changes:
- Remove "My Holarchive" (`/profile`)
- Move "My Patients" above "My Holarprac"
- Remove "My Round Tables", "Calendar", "Sessions", "To-Do List" (Calendar/To-Do are in Admin page already)
- Add "Admin" item with `UserCog` icon pointing to `/admin`
- Keep "My Vulas" at bottom

### 5. Admin page already has Calendar, To-Do, Pricing, Invoices, Templates
**File:** `src/pages/Admin.tsx` — no changes needed, already contains all five sub-tabs.

## Files Modified

| File | Changes |
|------|---------|
| `src/pages/doctor/DoctorRewards.tsx` | Reorder cards to 2x2 (Doctor/Patient top, Combined/Transferred bottom); update transfer dialog with from/to dropdowns |
| `src/pages/patient/MyRewards.tsx` | Add transfer button in Transfers section; update transfer dialog with from/to dropdowns |
| `src/components/layout/BottomNav.tsx` | Add `md:hidden` to hide bottom nav on tablet/web |
| `src/components/layout/Sidebar.tsx` | Remove Holarchive, Round Tables, Calendar, Sessions, To-Do; reorder Patients before Holarprac; add Admin item |

