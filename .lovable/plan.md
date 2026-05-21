## Problem

Renken (`renken@smartify.co.za`) and Zano (`zano@smartify.co.za`) still land in the Patient Portal even though their `user_roles` are correctly `ambulance_staff` and `hospital_staff`.

Database check confirms:
- Renken: `profiles.role = 'patient'`, `user_roles = [ambulance_staff]`
- Zano:   `profiles.role = 'patient'`, `user_roles = [hospital_staff]`

`useUserRole.ts` always prefers `profiles.role` when it is set, so the lingering `'patient'` value wins and the user is routed to the patient app. The previous data fix missed these two accounts.

## Fix

### 1. Data fix (one-off)
Set `profiles.role = NULL` for every user whose `user_roles` contain `hospital_staff`, `ambulance_staff`, `blood_bank`, or `pharmacy_staff` AND whose current `profiles.role` is `'patient'` or `'doctor'` (i.e. a wrong override). This catches Renken, Zano, and any future stragglers.

### 2. Prevent regressions (DB trigger)
Add a `BEFORE INSERT OR UPDATE` trigger on `public.user_roles`: when a row with an emergency role (`hospital_staff` / `ambulance_staff` / `blood_bank` / `pharmacy_staff`) is added for a user, automatically clear `profiles.role` if it is currently `'patient'` or `'doctor'`. This guarantees that promoting any user via the new admin role-changer or via the approval RPCs (`holarchelp_approve_hospital`, `holarchelp_approve_ambulance`, etc.) routes them to the correct portal immediately.

### 3. Verify `admin-set-user-role` already nulls `profiles.role`
The edge function written last turn already sets `profiles.role = NULL` when assigning an emergency role, so no code change needed there — the trigger is just belt-and-braces for paths that bypass the edge function.

## Files

- **Migration** — data update + new trigger function `sync_profile_role_for_emergency()` on `public.user_roles`.
- No frontend changes required.

## Verification

After migration:
1. Query `profiles.role` for both users → expect `NULL`.
2. Sign in as Renken → should land on `/provider/ambulance`.
3. Sign in as Zano → should land on `/provider/hospital`.