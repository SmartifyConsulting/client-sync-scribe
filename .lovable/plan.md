## Quick context

The "two Georgias" you see are **one user** (id `7c12a364…`) that has both `patient` and `admin` rows in `user_roles`. `get_users_admin` LEFT JOINs `user_roles` so it emits one row per role, hence the duplicate. No data merge needed — just remove the stray `patient` role.

## Changes

### 1. `UsersTab.tsx` — UI cleanups
- **Remove the Category column entirely** from the table header and body (and the inline edit Category select). Role is still shown via the existing `categoryBadge` — move that small badge into the **Status** cell next to the status pill so admins can still see role at a glance, OR drop it entirely. Default: keep a tiny role pill next to the name (left-most column) instead of as a full column.
- **Shrink status pill** to default size: drop the `text-sm` class on `statusBadge` and `categoryBadge`, use the default `Badge` sizing (text-xs, px-2 py-0.5). Remove the bespoke `p-1.5` on the emergency badge. Result matches the rest of the app.
- **Add a Delete action** in the Actions column: small trash icon (red) next to the pencil. Clicking opens an `AlertDialog` ("Delete user permanently? This removes their account and profile. Cannot be undone."). On confirm, calls a new `admin-delete-user` edge function with `{ userId }`. On success, removes the row from local state and toasts.
- **De-dupe rows defensively**: in `fetchUsers`, after the RPC, group by `user_id` and prefer the highest-priority role (`admin > doctor > patient > none`) so even if a user has multiple `user_roles` rows we only show one row per user.

### 2. New edge function `admin-delete-user`
- Validates caller JWT + `has_role(uid,'admin')`.
- Uses service-role client to:
  - Delete from `public.user_roles` where `user_id = target`.
  - Delete from `public.profiles` where `id = target` (cascade clears patient/etc. records via existing FKs where present; otherwise leave records orphaned — those are clinical data and should not be hard-deleted).
  - Call `supabase.auth.admin.deleteUser(target)`.
- Refuses to delete the calling admin's own account.
- Returns `{ ok: true }` or `{ error }`.

### 3. One-time data fix for Georgia
- Run a single `DELETE FROM public.user_roles WHERE user_id = '7c12a364-61f1-471e-8cc2-1c3a762794e3' AND role = 'patient'` so only the `admin` role remains. The auth user, profile, and any patient clinical records (which key off `patient_user_id = 7c12a364…`) stay intact and remain accessible to that single admin account — effectively the merge you described.

## Out of scope
- No changes to clinical data tables.
- No bulk-delete UI.
- No changes to Providers tab (emergency provider accounts already filtered out and managed elsewhere).

## Verification
- Reload `/admin/users` → only one Georgia row (admin), Category column gone, status pill is normal small size.
- Click trash on a test user → confirm dialog → user disappears from list and `auth.users` row is gone.
