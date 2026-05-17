## What’s actually wrong

1. **“Unknown ambulance / Unknown hospital” is not bad seed data.** The offers in this incident point to real providers, but the patient UI fetches offer rows first, then fetches provider names separately through normal client permissions. Some offered providers are approved but not `active`, so the patient can see the offer but cannot read that provider row directly. That makes the name lookup return empty and the UI falls back to “Unknown”.

2. **Google Maps is failing because the browser key is invalid for Maps rendering.** The console shows `BillingNotEnabledMapError`, and `ProviderMap` also has a hardcoded fallback public Google key. So even with `GOOGLE_MAPS_API_KEY` set, the app can still render with a key/project that has billing disabled.

## Plan

### 1. Stop client-side provider name joins from causing “Unknown” rows
- Add a backend function for incident offers, e.g. `holarchelp_get_incident_offers(_incident_id)`.
- It will verify the caller owns the incident, is assigned provider staff, linked hospital staff, or admin.
- It will return offer data with safe display fields already resolved:
  - provider id
  - provider kind
  - provider display name
  - ownership
  - distance
  - response
  - accepting status
- Update `AvailableResponders` to call this function instead of querying offers + provider tables separately.
- Only show rows with a resolved provider display name; no more “Unknown …” fallback labels.

### 2. Fix dispatch so it only offers providers the patient UI is meant to show
- Update `dispatch-sos` to include `subscription_status = active` when finding hospitals and ambulances, matching the public/provider listing rules.
- Add defensive filtering so providers missing a real display name or coordinates are never offered.
- This prevents future incidents from creating offers that the UI cannot resolve.

### 3. Clean up old/current bad pending offers
- For unresolved or inactive-provider offers, mark them `superseded` so they disappear from active/pending responder lists.
- Keep accepted/completed historical assignment data intact.

### 4. Replace fragile Google Maps rendering with the existing Leaflet map fallback
- Convert the SOS live tracking map (`SosLiveMap`) to use the already-installed `LiveMap` / OpenStreetMap renderer for patient, ambulance, hospital, and admin incident views.
- Keep the same patient/provider/hospital markers and live updates.
- Keep ETA calculation via the backend `routes-eta` function when available, but do not let Google Routes failures break map rendering.
- This removes the browser-side Google Maps dependency from the emergency incident map completely.

### 5. Fix the nearby provider map too
- Replace `ProviderMap`’s Google Maps implementation with Leaflet/OpenStreetMap.
- Remove the hardcoded fallback Google browser key from the frontend map loader path.
- The nearby provider list and markers will render even if Google billing/API restrictions fail.

### 6. Make Google backend failures graceful
- Update `routes-eta` so Google API/billing failures return a safe fallback response instead of a hard error.
- The UI will show straight-line distance/marker tracking instead of a broken map.

## Technical notes

- This requires one database migration for the safe incident-offer resolver and cleanup.
- It requires updates to:
  - `src/modules/holarchelp/components/AvailableResponders.tsx`
  - `src/modules/holarchelp/components/SosLiveMap.tsx`
  - `src/modules/holarchelp/components/ProviderMap.tsx`
  - `supabase/functions/dispatch-sos/index.ts`
  - `supabase/functions/routes-eta/index.ts`
- After implementation, I’ll validate the current incident no longer shows unknown providers and that maps render without the Google Maps billing modal.