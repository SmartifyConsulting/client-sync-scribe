

# Plan: Restructure Doctor & Patient Navigation

## Summary of Changes

1. **Doctor sidebar bottom section**: Replace "My Profile" link text with the doctor's full name. Keep the avatar and link to `/profile`.
2. **Doctor sidebar nav**: Add "My Holarchive" (link to `/profile`) right after Dashboard. Remove "Referrals" from the nav (it will be accessed via a tab inside My Holarchive/Profile page).
3. **Doctor Profile page**: Add a "Referrals" tab that embeds the existing `ReferralDoctors` page content. Also ensure the Patients tab includes patient listing + manual add + file import (already has `PatientImport` imported).
4. **Patient sidebar nav**: Rename "Round Table" to "My Round Table".
5. **Patient bottom nav**: Also rename "Round Table" to "My Round Table" if present.

## Detailed Changes

### File: `src/components/layout/Sidebar.tsx`

**Doctor nav items** (lines 39-49):
- Add `{ icon: User, label: "My Holarchive", to: "/profile" }` after Dashboard
- Remove the Referrals item (`{ icon: UserPlus, label: "Referrals", to: "/referral-doctors" }`)

**Patient nav items** (line 55):
- Change `"Round Table"` to `"My Round Table"`

**Bottom section** (lines 145-158):
- Replace `<p>My Profile</p>` with `<p>{profile?.full_name || "My Profile"}</p>`
- Keep the NavLink pointing to `/profile`

### File: `src/components/layout/BottomNav.tsx`

- No patient "Round Table" item exists in bottom nav currently, so no change needed there.

### File: `src/pages/Profile.tsx`

- Import `ReferralDoctors` component (or its content)
- Add a "Referrals" tab to the doctor profile tabs that renders the referral doctors management UI
- Verify the existing "Patients" tab already has listing + add + import functionality

### File: `src/App.tsx`

- Keep the `/referral-doctors` route as-is (for backward compatibility / direct URL access), but it will no longer appear in the sidebar nav.

## Technical Notes

- The Profile page already imports `PatientImport` and has patient-related tabs for doctors, so the Patients tab with listing/add/import should already be functional.
- Need to check the Profile page's doctor tab structure to know where to add the Referrals tab.

