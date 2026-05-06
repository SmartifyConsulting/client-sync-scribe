## Goal

Tighten the User Management screen so it matches the rest of the app and stops duplicating providers between the **Users** and **Providers** tabs.

## Changes (all in `src/features/admin/components/UsersTab.tsx`)

### 1. Filter out emergency/provider accounts from the Users tab
- After `fetchUsers()`, exclude rows where `role` is `hospital_staff`, `ambulance_staff`, or `blood_bank`. Those belong on the **Providers** tab.
- Patients, doctors, admins, and `none` continue to show.

### 2. Category column — icon-only for emergency roles
- Replace the stacked "Emergency Service / Hospital" badge with a single small badge that shows just the icon:
  - `hospital_staff` → `Hospital` icon
  - `ambulance_staff` → `Ambulance` icon
  - `blood_bank` → `Droplet` icon
- Tooltip (`title` attr) gives the readable name. (These rows will normally be filtered out per #1, but kept for safety so any leftover doesn't break.)
- Keep Patient / Healthcare Provider / Admin badges as text — they're the real categories users still see.

### 3. Consistent typography
- Standardise every cell to `text-sm` (matches the rest of the admin tables).
- Drop the one-off `text-[11px]` muted line under emergency badges.
- Header row stays `TableHead` default.
- Edit-mode inputs stay `h-8` but use `text-sm` (no shrinking).

### 4. Misc consistency
- Remove the now-unused `emergencyKindLabel` helper.
- Heading/spacing on the page wrapper unchanged — already matches other admin pages.

## Out of scope
- No DB or RLS changes.
- No changes to the Providers / Accountability / Voice Clip tabs.
- No change to the role-edit dropdown options (admin can still re-assign anyone to an emergency role from inside an existing patient/doctor row if needed).

## Files touched
- `src/features/admin/components/UsersTab.tsx`
