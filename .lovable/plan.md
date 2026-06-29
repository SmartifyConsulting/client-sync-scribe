## Updated plan: Emergency Dashboard, User Admin roles, and LIVE Google Maps

### 1. Emergency Dashboard screen revamp
- Replace the custom emergency dashboard header with the app's standard provider layout: compact title, muted subtitle, consistent spacing.
- Remove duplicated status/count displays and unnecessary chips/buttons (mock ACTIVE MISSION / ON SHIFT chips that duplicate Active Mission and Shift Teams).
- Keep incident counts in one compact stats row only.
- Replace emoji filters with standard shadcn tabs: `New`, `Active`, `Completed` styled with the global teal `TabsList`.
- Restyle incident rows as compact Holarc Health cards with one clear severity/status signal — no triple badge stacking.
- Keep only useful actions per incident: Accept & Dispatch for new, Track / Update for active, View Report for completed.

### 2. User Admin role sequencing and labels
- Alphabetically sequence role accordion sections in User Admin (replace the current custom `ROLE_ORDER` with an A→Z sort).
- Alphabetically sequence the role dropdown options in "Add member".
- Rename the visible `ER admin` / `Er-admin` label to exactly `ER_Admin` wherever it appears (User Admin role labels, ProviderGate, testProfiles, sidebar headers).
- Preserve existing collapsed accordion behavior and teal-border styling used across Doctor/Patient profiles.

### 3. LIVE Google Maps — replace SosLiveMap on Active Mission
- The user wants the real Google Maps live experience on Active Mission, not the `SosLiveMap` wrapper.
- Build a new `ActiveMissionGoogleMap` component that mounts a Google Map directly via the existing `loadGoogleMaps()` loader and:
  - Renders standard `google.maps.Marker` for ambulance, patient, and destination hospital (no `mapId`, no `AdvancedMarkerElement`).
  - Subscribes to realtime updates on `holarchelp_provider_locations` and `holarchelp_incidents` so the ambulance marker glides as live GPS rows arrive.
  - Uses the Google Routes API (via the existing `routes-eta` edge function) to draw the actual road polyline between ambulance → patient and ambulance → destination hospital, instead of the current straight-line dashed overlay.
  - Shows live ETA + distance pill that updates from Routes API responses.
- Swap the `<SosLiveMap …/>` usage on `NavigationScreen.tsx` (Active Mission) for `<ActiveMissionGoogleMap …/>`.
- Leave `SosLiveMap` in place for the patient-side SOS screen and hospital console for now (they have a different incident-tracking contract).
- Keep `AmbulanceSimulator` mounted but clearly labeled as demo-only so live GPS still drives the real flow when present.

### 4. Fix the attached Google Maps error
- The "This page can't load Google Maps correctly" toast comes from the browser key failing for the current domain.
- Confirm the app uses the user's custom Google Maps browser key env (`VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY`) and that the connection is linked to the project.
- Improve the in-app fallback in `LiveMap`/the new map component: replace the generic Google error with a clear message instructing that the Google Maps key must allow the current domain (root + wildcard subdomain) under the connected key's HTTP referrer allowlist.
- Keep loader compliant: `loading=async`, `callback`, `channel`, no `mapId`, classic `Marker`.

### 5. Scope
- Frontend changes only: Emergency Dashboard, User Admin, new `ActiveMissionGoogleMap`, error fallback copy.
- No DB schema changes; realtime on `holarchelp_provider_locations` is already enabled.
- `SosLiveMap` is preserved for patient/hospital views; only Active Mission switches to live Google Maps.