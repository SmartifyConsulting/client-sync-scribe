## Goals

1. Make sure every test user (and any real user) lands in the correct portal after login/impersonation — hospital staff → hospital portal, ER/ambulance staff → ambulance portal, doctor → doctor dashboard, patient → patient details, admin → doctor dashboard.
2. Let hospitals and ER providers type their address with Google autocomplete on their Provider Profile, automatically save a location pin (lat/lng), and view it on a small map.

## Part 1 — Right portal for the right user

### What's happening today

- `useImpersonate` always sends users to `/dashboard` after the OTP exchange.
- `/dashboard` resolves via `RoleBasedRedirect` (src/App.tsx) which uses `useProviderAccess`, `useUserRole`, and `useIsAdmin`.
- `RoleBasedRedirect` currently treats *any* admin (even a hospital/ambulance admin) as a doctor and sends them to `/doctor-dashboard`. That's the main reason the "ER Provider (Test)" account can miss the ER portal — if the test user also has `admin` in `user_roles`, admin wins and they never reach `/provider`.
- For users that own *both* a hospital membership and an ambulance org (the "Test ER Provider" account is owner of an ambulance record *and* a member of "Holarc General Hospital"), `ProviderGate` resolves to whichever check fires first in its `if/else` chain, which can flip them to the wrong portal.

### Fix

1. **`src/App.tsx` → `RoleBasedRedirect`**
   - Reorder so provider routing wins over the admin shortcut when the user is not also a doctor/patient. New priority:
     1. `providerType && !hasDoctorRole && !hasPatientRole` → `/provider`
     2. `isAdmin` → `/doctor-dashboard`
     3. `isPatient` → `/patient/details`
     4. `isEmergency && !hasDoctorRole && !hasPatientRole` → `/provider`
     5. default → `/doctor-dashboard`
   - Admins keep the manual switcher to access the doctor surface.

2. **`src/modules/holarchelp/components/ProviderGate.tsx` → `useProviderAccess`**
   - Use the user's `user_roles` to choose which provider record wins when the user is linked to more than one. If the user has `hospital_staff` (and not `ambulance_staff`) prefer the hospital record; if `ambulance_staff` (and not `hospital_staff`) prefer the ambulance record; otherwise fall back to today's owner-first/member-second order.
   - This keeps the "Test ER Provider" account on the ambulance portal and stops the "Hospital Admin (Test)" account from being shoved into the ambulance portal.

3. **`src/modules/holarchelp/pages/provider/ProviderRedirect.tsx`** — no change beyond what falls out of the gate; it already picks `/provider/hospital` or `/provider/ambulance` based on `providerType`.

4. **`src/components/layout/useImpersonate.ts`** — keep the `/dashboard` redirect; it will now route correctly because of the fixes above.

5. **Backend sanity (data migration)** — only if needed to make the two seeded test accounts behave correctly:
   - Ensure `hospital.test@holarchealth.com` has `user_roles.role = 'hospital_staff'` and an `holarchelp_hospital_members` row (or hospital ownership) for a real hospital.
   - Ensure `er.test@holarchealth.com` has `user_roles.role = 'ambulance_staff'` only, and owns/belongs to exactly one ambulance org (remove the stray hospital membership on "Holarc General Hospital" so it does not flip the gate).
   - Same audit for `renken@smartify.co.za` (already `ambulance_staff` + owner).

## Part 2 — Address autocomplete + saved location pin

Schema already has `latitude double precision` and `longitude double precision` on both `holarchelp_hospitals` and `holarchelp_ambulance_providers`, so no migration is needed.

### Edge function

Add a small edge function `geocode-address` (`supabase/functions/geocode-address/index.ts`) that:
- Accepts `{ place_id?: string; address?: string }`.
- Calls Google Maps Platform via the Lovable connector gateway (Geocoding API) and returns `{ latitude, longitude, formatted_address }`.
- Uses the same connector secrets the existing `google-places-autocomplete` function already uses.
- Standard CORS + JWT verification (default).

### Provider Profile UI (`src/modules/holarchelp/pages/provider/ProviderProfile.tsx`)

- Replace the plain "Address" / "Base address" `Field` with the existing `AddressAutocomplete` component (`src/features/patients/components/AddressAutocomplete.tsx`).
- When the user picks a suggestion (or blurs the field with a non-empty value), call the new `geocode-address` function and store `latitude` / `longitude` in local state.
- Save those fields together with the rest of the profile on "Save changes" (extend the existing `patch` to include `latitude`, `longitude`).
- Below the address, render a compact read-only map (~200px) using the existing Google Maps browser key (`VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY`) with a single pin at the saved lat/lng, plus the coordinates shown as text so it is verifiable in tests. Reuse the same `loading=async` + `callback` pattern already used elsewhere in the module (e.g. `LiveMap`/`ProviderMap`).
- If `latitude`/`longitude` are not set yet, show a muted "No pin saved yet — pick an address suggestion to drop a pin" hint instead of the map.

### Why this matters for testing

Once the provider has a pinned base location, the dispatch/ETA logic (`useProviderLocationTracking`, `holarchelp_update_provider_location`, `holarchelp_get_incident_offers`) has a real starting point, so we can verify provider movement when an SOS is triggered.

## Out of scope

- No changes to patient/doctor login flows beyond the redirect priority tweak.
- No changes to the SOS dispatch logic itself.
- No new tables — we use the existing `latitude`/`longitude` columns.

## Verification

- Impersonate each test profile from the dev switcher and confirm landing route:
  - Admin → `/doctor-dashboard`
  - Doctor → `/doctor-dashboard`
  - Patient → `/patient/details`
  - Hospital (Test) → `/provider/hospital`
  - ER Provider (Test) and Renken → `/provider/ambulance`
- On a provider profile, type an address, pick a suggestion, save, refresh — confirm the address persists, lat/lng appear, and the map pin renders at the saved location.
