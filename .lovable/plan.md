## Problem

Emergency Service Providers (hospitals, ambulance services, blood banks) already have their own dedicated portal at `/provider/*` (`ProviderLayout`, `ProviderDashboard`, `ProviderProfile`, `ProviderIncidentDetail`) — but after sign-in they land on `/doctor-dashboard` and see the doctor sidebar, because the routing logic only knows about `doctor`, `patient`, and `admin`.

Root cause is in two places:

1. `src/hooks/useUserRole.ts` — `UserRole` type is `'doctor' | 'patient' | 'admin' | null`. It ignores `hospital_staff`, `ambulance_staff`, and `blood_bank` rows in `user_roles`.
2. `src/App.tsx` → `RoleBasedRedirect` — falls through to `<Navigate to="/doctor-dashboard" />` for anyone who is not a patient.

The provider portal itself is already built and gated by `ProviderGate`, so this is purely a routing/role-resolution fix plus a small UX polish.

## Plan

### 1. Extend role resolution (`src/hooks/useUserRole.ts`)
- Add `'emergency'` to `UserRole` (a derived umbrella role for `hospital_staff | ambulance_staff | blood_bank`).
- When fetching `user_roles`, treat any of those three rows as `isEmergency = true`.
- Resolution priority becomes: explicit `profiles.role` → `doctor` → `patient` → `emergency` → `admin`.
- Export `isEmergency` and `hasEmergencyRole` from the hook.

### 2. Fix post-login redirect (`src/App.tsx` → `RoleBasedRedirect`)
- If `isEmergency` and not also a doctor/patient → `<Navigate to="/provider" replace />`.
- Keep existing patient and doctor branches unchanged.

### 3. Auth page polish (`src/pages/Auth.tsx`)
- After successful sign-in, if the user has only an emergency role, route to `/provider` instead of `/doctor-dashboard`.
- (The "Sign in" handler currently hard-codes `/doctor-dashboard` in some paths — switch those to `/dashboard` so `RoleBasedRedirect` decides.)

### 4. Provider signup confirmation (`src/pages/ProviderSignup.tsx`)
- After successful signup, redirect to `/auth?mode=login&verify=1` with a clear "Check your email to verify, then sign in — your account also needs admin activation" message. (Already partly there; just ensure copy mentions both verification + admin approval.)

### 5. Profile switcher safety (`src/components/layout/ProfileSwitcher` if present)
- Hide the "Switch to Doctor / Patient" toggle for emergency-only users so they cannot accidentally land on the doctor UI. (Read-only check — only edit if the component exists.)

### Out of scope
- No changes to the `/provider/*` portal UI itself (already built).
- No changes to admin approval flow at `/admin/holarchelp-providers`.
- No DB migrations — `hospital_staff`, `ambulance_staff`, `blood_bank` already exist in the `app_role` enum and are written by the admin "Activate" action.

### Files touched
- `src/hooks/useUserRole.ts` (extend types + flags)
- `src/App.tsx` (redirect branch)
- `src/pages/Auth.tsx` (post-login route)
- `src/pages/ProviderSignup.tsx` (success copy)
- `src/components/layout/ProfileSwitcher.tsx` *(only if it exists and exposes role switching)*
