# Fix hospital/ER profile switching & missing hospital interface

## What's wrong

1. **Hospital interface doesn't appear after switching.** After `admin-impersonate`, the app forces `window.location.href = "/"`. The home route renders the doctor/patient `AppLayout`, not the hospital portal. Hospital staff land on a regular dashboard with nothing relevant.
2. **Can't switch back to admin.** The profile-switcher popover lives inside `TopBarIcons`, which is only rendered by `AppLayout` / `PatientAppLayout` / `MobileHeader`. `HospitalOpsLayout` (and `AmbulanceOpsLayout`) have their own custom top bar with no avatar menu, so once you're on `/provider/hospital` there's no UI to return to the admin account.

## Fix

### 1. Auto-redirect to the provider portal at `/`

In the root home component mounted at `/` inside `AppLayout`, use `useProviderAccess()` from `ProviderGate.tsx`. If it resolves to a provider type, `navigate("/provider", { replace: true })`. `<ProviderRedirect />` at `/provider` already forwards to `/provider/hospital` or `/provider/ambulance`.

### 2. Add a profile/admin switcher in HospitalOpsLayout & AmbulanceOpsLayout

Add an avatar popover to the `<TopBar>` of `HospitalOpsLayout.tsx` and `AmbulanceOpsLayout.tsx`, sitting to the right of the clock. Contents:

- Current user's name + email + role badge.
- **If the current user is an admin** (`useIsAdmin()`): render the full `TEST_PROFILES` switcher list — same UI and behaviour as the admin block in `TopBarIcons` (loading spinner per row, disabled current row, etc.).
- **If the current user is a seeded test profile but not admin**: show a single **"Switch to Admin"** button that impersonates `info@georgiaadams.co.za`.
- **Sign out** for convenience.

Extract the impersonation logic + `TEST_PROFILES` constant from `TopBarIcons.tsx` into:
- `src/components/layout/useImpersonate.ts` — hook exposing `{ impersonate, switching }`.
- `src/components/layout/testProfiles.ts` — shared `TEST_PROFILES` array.

`TopBarIcons.tsx` then imports from these two files (no behaviour change).

## Files

- **Edit** the home component mounted at `/` (e.g. `src/pages/Index.tsx`) — add provider auto-redirect using `useProviderAccess`.
- **New** `src/components/layout/useImpersonate.ts` — extracted impersonation hook.
- **New** `src/components/layout/testProfiles.ts` — shared test-profile list.
- **Edit** `src/components/layout/TopBarIcons.tsx` — consume the new hook/constant.
- **Edit** `src/modules/holarchelp/pages/provider/hospital/HospitalOpsLayout.tsx` — add avatar + switcher popover (admin full list, otherwise "Switch to Admin").
- **Edit** `src/modules/holarchelp/pages/provider/ambulance/AmbulanceOpsLayout.tsx` — same.

## Out of scope

- Reworking how `TopBarIcons` is hosted across layouts.
- Changing the impersonation edge function or seed data.
