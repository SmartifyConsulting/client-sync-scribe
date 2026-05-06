## Goal

On the **Active Emergency** page, replace the current OSM iframe map (LiveMap) with the same Google Maps implementation used on the "Search nearby" provider screen (`ProviderMap`), so it renders Google tiles with proper ambulance/hospital marker icons.

## Why the current map looks different

`ProviderMap` (used on `/patient/holarchelp/nearby`) loads Google Maps via `@googlemaps/js-api-loader` using the shared/public key in `config/google-maps.ts`, with `AdvancedMarkerElement` for hospitals (`marker-hospital.png`) and ambulances (`marker-ambulance.png`).

`LiveMap` (used on the active incident page) was previously gated behind `VITE_GOOGLE_MAPS_API_KEY` and silently fell back to an OSM iframe when no env key was set — that's why the active emergency map looks different and shows no ambulance/hospital icons.

## Plan

### 1. Rewrite `LiveMap` to render Google Maps (matching ProviderMap)

- Always use Google Maps via `loadGoogleMaps()` — no OSM fallback path.
- Centre on the patient's most recent location, zoom 15.
- Render typed markers using the same icons as `ProviderMap`:
  - **Patient** — blue dot (HTML `div`, same style as ProviderMap user marker)
  - **Ambulance** — `marker-ambulance.png` AdvancedMarker
  - **Hospital** — `marker-hospital.png` AdvancedMarker
- Use classic `google.maps.Marker` as fallback when no real `mapId` is configured (so `AdvancedMarkerElement` requirements are still met with `DEMO_MAP_ID`).
- Keep proper cleanup of markers/map on unmount (already in place, just retain it).
- Handle `gm_authFailure` by showing a small inline "Map unavailable" tile instead of swapping to OSM, so the UI stays consistent.

### 2. Update `LiveMap` props to accept typed points

```ts
type Point = {
  kind: "patient" | "ambulance" | "hospital";
  latitude: number;
  longitude: number;
  label?: string;
};
```

Auto-fit bounds when 2+ points exist; otherwise centre on the single point at zoom 15.

### 3. Update `HolarcHelpIncidentDetail.tsx` to pass typed points

Replace:
```tsx
<LiveMap points={[...locations.slice(0, 1), ...ambulancePoint]} />
```
with a typed array:
- Patient: latest entry from `locations`
- Ambulance: `{ provider_latitude, provider_longitude }` when present, labelled with `responder?.name`
- Hospital: skipped for now (no destination hospital is currently stored on the incident)

### 4. No DB / dependency changes
- Reuses existing `config/google-maps.ts`, marker PNGs, and the loader package already in the project.

## Files

- `src/modules/holarchelp/components/LiveMap.tsx` — full rewrite to mirror `ProviderMap` patterns with typed markers.
- `src/modules/holarchelp/pages/HolarcHelpIncidentDetail.tsx` — build typed `points` array and pass it to `LiveMap`.

## Notes

- Hospitals were part of an earlier discussion but the active incident has no destination hospital field today, so they're left out of this change. Easy to add later by querying `holarchelp_hospitals` and pushing `kind: "hospital"` markers.
- The inline icon row (Call / Share / Nearby / History) and other page content are untouched.
