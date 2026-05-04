## Plan: Hospital icon, map info windows, location-driven Add Hospital, admin layout & Vula centering

### 1. Replace hospital marker icon
- Copy uploaded red-cross circle to `src/assets/marker-hospital.png` (overwrite). Existing imports in `ProviderMap.tsx` and `HolarcHelpHome.tsx` pick it up automatically.

### 2. Map info windows (name, tier, distance, ETA)
Update `src/modules/holarchelp/components/ProviderMap.tsx`:
- Extend `ProviderMarker` with optional `tier?: string` and `distanceKm?: number`.
- Attach a `google.maps.InfoWindow` opened on marker click. Content: bold name, tier chip ("Tier 2"), distance "X.X km", ETA "≈ N min" (computed locally as `round(distanceKm / 40 * 60)` — 40 km/h urban average).
- Close any previously open info window when a new one opens (single shared ref).
- In `HolarcHelpHome.tsx`, pass `tier` and `_d` (distance) into the providers array.

### 3. "Add Hospital" — autocomplete location → autofill form
Update `ProviderDialog` in `src/pages/admin/HolarcHelpProviders.tsx`:
- Add a **Location search** field at the top using the existing `google-places-autocomplete` edge function pattern (no `&types=address` so business names match too — small tweak in the edge function or query override).
- On suggestion select, call new edge function `google-place-details` with the `place_id`. Returns `name, formatted_address, lat, lng, city, country, phone, website`.
- Auto-populate form fields: Name, City, Country, Phone, latitude, longitude, address.
- Email / tier / accepting toggle remain manual.
- Persist `latitude`, `longitude` to insert/update payload (columns already exist).

### 4. New edge function `google-place-details`
Create `supabase/functions/google-place-details/index.ts`:
- Bearer auth + getClaims (mirrors `google-places-autocomplete`).
- Body: `{ place_id }`. Calls Place Details API with fields `name,formatted_address,geometry,address_component,international_phone_number,website`.
- Returns flattened `{ name, formatted_address, lat, lng, city, country, phone, website }`.

### 5. Admin Providers layout cleanup
In `src/pages/admin/HolarcHelpProviders.tsx`:
- **Remove "Seed test providers" button** (and `seedTestProviders` handler) from the page header.
- **Move the "+ Add Hospital/Ambulance" button** out of the status-filter row and into the inner Hospitals/Ambulance `TabsList` row — placed flush right on the same row as the two tab triggers. Achieved by wrapping the inner `<Tabs>`'s `TabsList` in a `flex justify-between items-center` row with the Add button on the right; label updates to match the active tab.

### 6. Center Vula icon on mobile profile page
- Locate the Vula/Lollipop icon block on the patient profile (likely `src/pages/patient/MyDetails.tsx` or a profile header card; will grep for `lollipop`/`Vula` in profile components).
- Add `mx-auto` (or wrap in `flex justify-center`) within the mobile breakpoint (`sm:`-prefixed alignment retains desktop layout). Confirm via the 390px viewport.

### 7. Google API settings
The project already has `GOOGLE_MAPS_API_KEY` (used by `google-places-autocomplete`). After deploy I'll verify via `fetch_secrets`. The user's Google Cloud key needs these APIs enabled:
- Maps JavaScript API
- Places API (Autocomplete + Details)
- Geocoding API (fallback)
The fallback browser key in `google-maps.ts` is restricted to map tiles only; sensitive Places calls go through the edge function. I'll surface this checklist in chat after implementation.

### Out of scope
- No Distance Matrix API (using straight-line + 40 km/h estimate to avoid extra cost).
- No DB schema changes.

### Files touched
- `src/assets/marker-hospital.png` (replaced)
- `src/modules/holarchelp/components/ProviderMap.tsx`
- `src/modules/holarchelp/pages/HolarcHelpHome.tsx`
- `src/pages/admin/HolarcHelpProviders.tsx`
- Patient profile file containing the Vula icon (TBD by grep)
- `supabase/functions/google-place-details/index.ts` (new)
