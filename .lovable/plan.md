I found the issue: both admin users do have the `admin` role in the backend, but the frontend resolves their active role as `patient` first. Because `isAdmin` is currently calculated from the single active role (`role === 'admin'`), an account with roles like `patient + admin` is treated as a patient and gets redirected away from the admin layout/screens.

Confirmed admin users:
- `georgia.adams@smartify.co.za` has roles: `admin`, `patient`; profile role: `patient`
- `info@georgiaadams.co.za` has roles: `admin`, `patient`; profile role: not set

## Plan

1. Fix the role hook so admin privileges are based on assigned roles, not the active/patient profile role
   - Keep the existing active role resolution for normal role-based profile behavior.
   - Change `isAdmin` to return true when `availableRoles` contains `admin`.
   - Keep `hasAdminRole` as true for the same condition.
   - This preserves patient/doctor identity while allowing admin permissions.

2. Stop the full app layout from redirecting admin users away from admin screens
   - Update `AppLayout` so a patient-admin can access `/admin/*` instead of being redirected back to `/patient/details`.
   - Keep patient-only users redirected to the patient layout as before.

3. Make navigation show the admin menu for patient-admin users
   - Desktop sidebar should show admin links when the user has the admin role.
   - This will expose:
     - Users
     - HolarcHelp Providers
     - Pricing
     - Rewards/Gamification
   - Mobile bottom nav should also treat admin users as admin/doctor-layout users rather than patient-only users when they are on admin routes.

4. Keep admin pages protected server-side and client-side
   - The existing admin pages will continue checking `isAdmin`.
   - Backend RLS/RPC policies already use `public.has_role(auth.uid(), 'admin')`, so no database schema change is needed for this fix.

5. Optional quick verification after implementation
   - Log in as `info@georgiaadams.co.za` or `georgia.adams@smartify.co.za`.
   - Visit `/admin/users`, `/admin/holarchelp-providers`, `/admin/pricing`, and `/admin/gamification`.
   - Confirm the admin sidebar appears and the pages no longer show “Admin access required” or redirect to patient details.