

# Move Settings to Profile Menu, Update Profile Banner with Vula Earnings, Clean Up Heading

## Changes

### 1. Move Settings tab to Profile avatar popover (`PatientAppLayout.tsx`)
- Remove Settings `TabsTrigger` from both view and edit mode in `PatientDetailsEditor.tsx`
- Add "Settings" menu item in avatar popover in `PatientAppLayout.tsx`, navigating to `/settings`
- Ensure `/settings` route is under `PatientAppLayout` in `App.tsx`

### 2. Replace "Patient" with holarc email in avatar popover (`PatientAppLayout.tsx`)
- Derive `firstname.lastname@holarc.health` from `profile?.full_name`

### 3. Match "Welcome back" font size to user name (`PatientDetailsEditor.tsx`)
- Change "Welcome back" from `text-[10px]` to `text-sm font-semibold`

### 4. Add "You have earned" + animated Vula counter inside ProfileBanner (`PatientDetailsEditor.tsx`)
- Pass `lollipopCount` from `MyDetails.tsx` as a prop
- Inside ProfileBanner, below name, add "You have earned" text + animated counter + Vula logo inline
- Move `AnimatedCounter` component into `PatientDetailsEditor.tsx`

### 5. Remove Vula counter AND Vula logo from "My Holarchive" heading row (`MyDetails.tsx`)
- Delete the entire right-side `<Link>` block containing the animated counter, "Vulas" label, and Vula Vouchers logo image from the heading row
- Keep only the "My Holarchive" heading and subtitle on the left

## Technical Summary

| File | Change |
|------|--------|
| `src/components/patients/PatientDetailsEditor.tsx` | Remove Settings tab; update greeting font; add "You have earned" + animated counter + Vula logo in ProfileBanner; accept `lollipopCount` prop |
| `src/components/layout/PatientAppLayout.tsx` | Add Settings item in avatar popover; show holarc email instead of "Patient" |
| `src/pages/patient/MyDetails.tsx` | Remove Vula counter + logo from heading row; pass `lollipopCount` to PatientDetailsEditor |
| `src/App.tsx` | Ensure `/settings` under PatientAppLayout |

