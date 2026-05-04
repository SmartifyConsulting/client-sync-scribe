## Scope

Five updates:

1. New **Find nearby provider** map view with red-cross markers for hospitals and ambulance icons for ambulances.
2. Replace **Enable location access** button on `HolarcHelpHome` with **Find nearby provider** that routes to the new map.
3. Make **Nearby** icons (Patient Dashboard + My Profile) auto-request location and route to the new map; if blocked, show clear instructions to enable it in browser settings.
4. Add **Provider sign-up** path (Hospital / Ambulance) on the Auth page.
5. Pre-create two test provider accounts:
   - `sandton@mediclinic.co.za` → Hospital, password `Password123`
   - `EmergencyER@jhn.co.za` → Ambulance, password `Password123`

---

## 1. Map markers (hospitals = red cross, ambulances = ambulance icon)

Use the two icons the user uploaded:
- `src/assets/marker-hospital.png` (red cross in red circle) — copy from `user-uploads://image-80.png`
- `src/assets/marker-ambulance.png` — copy from `user-uploads://ambulance-Photoroom.png`

New component `src/modules/holarchelp/components/ProviderMap.tsx`:
- Wraps Google Maps (reuses `loadGoogleMaps` from existing `config/google-maps.ts`)
- Centers on user location
- Draws blue dot for user
- Draws an `AdvancedMarkerElement` per provider with the right icon (`<img>` content)
- Tooltip = provider name + city

## 2. Find Nearby Provider page

New route `/patient/holarchelp/nearby` → `src/modules/holarchelp/pages/HolarcHelpNearby.tsx`:
- On mount, checks `navigator.permissions.query({ name: "geolocation" })`:
  - If `granted` — auto-requests coords and shows map
  - If `prompt` — shows a single big button "Find nearby provider" that triggers the geolocation prompt
  - If `denied` — shows an amber help card with instructions to enable location in browser site settings, plus a "Try again" button
- Once coords are available, queries `holarchelp_hospitals` + `holarchelp_ambulance_providers` (status = approved, lat/lng not null), sorts by haversine distance, and shows:
  - Map with both marker types
  - Legend (Hospital / Ambulance)
  - Distance-sorted list of nearest 30 with km label
- Back button to `/patient/holarchelp`

Register route in `src/modules/holarchelp/routes.tsx`.

## 3. HolarcHelpHome + Nearby buttons

`src/modules/holarchelp/pages/HolarcHelpHome.tsx`:
- Replace the "Enable location access" button (currently calls `enableLocation`) with **Find nearby provider** linking to `/patient/holarchelp/nearby`. Remove the `enableLocation` helper.

`src/pages/patient/PatientDashboard.tsx` and `src/pages/patient/MyDetails.tsx`:
- Repoint the **Nearby** card from `/patient/holarchelp/contacts` → `/patient/holarchelp/nearby`.

## 4. Provider sign-up

`src/pages/Auth.tsx`:
- Extend the role selector beyond doctor/patient — add **"Provider (Hospital / Ambulance)"**.
- When `userRole = "provider"`, switch the wizard to a 2-step compact flow:
  - Step 1: Account (email, password, country code)
  - Step 2: Provider details
    - Provider type radio: Hospital | Ambulance
    - Name (Hospital "Name" or Ambulance "Company name")
    - Registration number
    - Contact phone
    - Address / city / country
    - Optional: registration #, beds (hospital only), fleet size (ambulance only)
- On submit:
  - `signUp(email, password)` (existing flow)
  - Insert into `profiles` with `role = doctor` (no provider role in `user_role` enum at signup; the staff role is granted by admin on approval — same model used today)
  - Insert into `holarchelp_hospitals` or `holarchelp_ambulance_providers` with `owner_id = user.id`, `status = pending`
  - Show "Awaiting admin approval — you'll get access once approved." and route to `/auth?mode=login`

`ProviderGate` already gates `/provider/*`; once admin approves and grants `hospital_staff` / `ambulance_staff` roles via existing `holarchelp_approve_*` RPCs, the user can access `/provider`.

## 5. Test provider accounts

Use the existing `admin-update-email` edge function pattern, OR more directly: create a new one-shot edge function `seed-test-providers` (service-role) that:
- For each of the two emails, calls `supabase.auth.admin.createUser({ email, password, email_confirm: true })` (idempotent — skip if exists)
- Inserts a matching row into `holarchelp_hospitals` or `holarchelp_ambulance_providers` with `owner_id = user.id`, `status = approved`, `approved_at = now()`
- Inserts a `user_roles` row with the appropriate staff role (`hospital_staff` / `ambulance_staff`)

Trigger it once via `supabase.functions.invoke("seed-test-providers")` from a small "Seed test providers" button on the admin Providers page (admin-only). After running once, the two accounts can log in and reach `/provider`.

Seed payload:
- `sandton@mediclinic.co.za` — Hospital "Mediclinic Sandton", city Sandton, country South Africa, tier `tier_2`
- `EmergencyER@jhn.co.za` — Ambulance "Emergency ER (JHN)", city Johannesburg, country South Africa, tier `tier_2`

---

## Files

- NEW `src/assets/marker-hospital.png`
- NEW `src/assets/marker-ambulance.png`
- NEW `src/modules/holarchelp/components/ProviderMap.tsx`
- NEW `src/modules/holarchelp/pages/HolarcHelpNearby.tsx`
- NEW `supabase/functions/seed-test-providers/index.ts`
- EDIT `src/modules/holarchelp/routes.tsx` — register `/nearby` route
- EDIT `src/modules/holarchelp/pages/HolarcHelpHome.tsx` — swap button to "Find nearby provider"
- EDIT `src/pages/patient/PatientDashboard.tsx` — Nearby link → `/patient/holarchelp/nearby`
- EDIT `src/pages/patient/MyDetails.tsx` — Nearby link → `/patient/holarchelp/nearby`
- EDIT `src/pages/Auth.tsx` — add provider signup branch
- EDIT `src/pages/admin/HolarcHelpProviders.tsx` — add admin "Seed test providers" button

No DB migration required (existing tables and RLS already permit owners to insert pending providers; admin RPCs already grant staff roles).
