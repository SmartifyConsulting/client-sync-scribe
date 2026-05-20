## Problem

1. `er.test@holarchealth.com` (and similar provider users like Renken, Zano, Hospital Admin) sees the **patient portal** when signing in. Their `profiles.role` is `'patient'`, and `useUserRole` prefers `profiles.role` over `user_roles` — even though `user_roles` contains `ambulance_staff`/`hospital_staff`.
2. The admin **Users** screen (`UsersTab`) explicitly filters out anyone with an emergency role (`hospital_staff`, `ambulance_staff`, …), so Renken/Zano/ER providers never appear under any tab. There's no "Ambulance" / "Hospital" / "ER" users tab.
3. There's no way for the admin to change a user's role from the Users screen — only edit name/email/delete.

## Plan

### 1. Data fix — align profile role with actual provider role
One-off migration / data update via the insert tool to set `profiles.role = 'emergency'` for users that have any of `hospital_staff`, `ambulance_staff`, `blood_bank`, `pharmacy_staff` in `user_roles` but whose `profiles.role` is currently `patient` or `doctor` only because of a stale signup. After this, `useUserRole` returns `'emergency'` and the app routes them to the provider portal (existing `ProviderRedirect` / `ProviderGate` flow).

Specifically targets: `er.test@holarchealth.com`, `hospital.test@holarchealth.com`, `renken@smartify.co.za`, `zano@smartify.co.za`, and any other matching account.

### 2. Admin Users — add an "Emergency providers" tab
In `src/pages/admin/HolarcHelpProviders.tsx` (which already hosts the Users tabs alongside Patients/Doctors/Admins via `UsersTab`), add a fourth `UsersTab` kind: `"emergency"`.

In `src/features/admin/components/UsersTab.tsx`:
- Extend `UsersKind` to `"patient" | "doctor" | "admin" | "emergency"`.
- For `kind === "emergency"`: do **not** strip emergency roles; instead show users whose effective role is `hospital_staff`, `ambulance_staff`, `blood_bank`, or `pharmacy_staff`. Group/label rows by provider kind (Ambulance, Hospital, Blood Bank, Pharmacy) using a sub-label column or a secondary grouping.
- For other tabs keep current behavior (still filter out emergency users so they don't double-list).

Renken will then show up under the Ambulance group inside the new Emergency tab.

### 3. Inline "Change role" control for all users
In `UsersTab` row actions, add a small **Role** dropdown (shadcn `Select`) next to the edit/delete buttons that lists: Patient, Doctor, Admin, Hospital staff, Ambulance staff, Blood bank, Pharmacy staff.

Saving the role calls a new edge function `admin-set-user-role` that:
- verifies caller is admin (`has_role(auth.uid(), 'admin')`),
- updates `profiles.role` to the canonical bucket (`patient` / `doctor` / `admin` / `emergency`),
- replaces rows in `user_roles` for that user with the chosen role (single source of truth),
- returns the new role.

Client refetches the list and shows a toast. Because the row may move tabs after the change (e.g. patient → emergency), we just refresh.

### 4. UX details
- Role dropdown shows current role pre-selected.
- Confirmation `AlertDialog` when changing **to** or **from** `admin` (destructive-level change).
- Inline role badge in each row so the current role is visible at a glance on every tab.

## Technical notes

```
src/features/admin/components/UsersTab.tsx     # new "emergency" kind + role <Select> column + role badge
src/pages/admin/HolarcHelpProviders.tsx        # add 4th Users tab "Emergency"
supabase/functions/admin-set-user-role/        # new edge function (admin-guarded)
```

Migration (data only, run via insert tool, no schema change):
```sql
UPDATE public.profiles p
SET role = 'emergency'::user_role
WHERE EXISTS (
  SELECT 1 FROM public.user_roles ur
  WHERE ur.user_id = p.id
    AND ur.role IN ('hospital_staff','ambulance_staff','blood_bank','pharmacy_staff')
)
AND p.role <> 'emergency';
```

No changes to `useUserRole`, `ProviderGate`, or routing — the existing emergency-role plumbing already routes these users correctly once `profiles.role = 'emergency'`.
