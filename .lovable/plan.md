# Migrate Maps Stack: Google Maps + Leaflet → Mapbox

Replace both rendering engines (Leaflet) and geocoding/places (Google) with Mapbox GL JS + Mapbox Geocoding/Search Box APIs. Default style: `mapbox://styles/mapbox/navigation-day-v1`.

## Prerequisites

- Add `MAPBOX_PUBLIC_TOKEN` (pk.*) as a backend secret. Mapbox public tokens are designed for browser use, but we'll serve it via a small edge function (`mapbox-config`) so it can be rotated/URL-restricted without redeploy — mirroring the current `maps-config` pattern.
- Install `mapbox-gl` package; remove `leaflet`, `@types/leaflet`, `@googlemaps/js-api-loader`.

## Map components (rendering)

Rewrite these three with Mapbox GL JS, keeping the same prop signatures so call sites don't change:

1. `src/modules/holarchelp/components/LiveMap.tsx` — patient/ambulance/hospital markers + dashed route lines + animated vehicle tween + distance pills. Use HTML markers (`new mapboxgl.Marker({ element })`) to preserve existing SVG icons, `GeoJSON` source + `line` layer for routes, and `requestAnimationFrame` tween on `setLngLat`.
2. `src/modules/holarchelp/components/ProviderMap.tsx` — hospital/ambulance markers with popups; greying for `accepting === false`. Use `mapboxgl.Popup`.
3. `src/modules/holarchelp/components/SosLiveMap.tsx` — same approach.

All three: navigation control, fit-bounds, ResizeObserver for invalidate-size equivalent (Mapbox uses `map.resize()`).

## Geocoding / address autocomplete

Replace Google Places with Mapbox Search Box / Geocoding v6:

- `supabase/functions/geocode-address/index.ts` → call `https://api.mapbox.com/search/geocode/v6/forward`.
- `supabase/functions/google-places-autocomplete/index.ts` → rename usage to call Mapbox Search Box `/suggest`; keep edge function name for now to avoid frontend churn, OR rename to `mapbox-autocomplete` and update callers.
- `supabase/functions/google-place-details/index.ts` → Mapbox Search Box `/retrieve`.
- Public variants (`places-autocomplete-public`, `place-details-public`) get the same treatment.
- `supabase/functions/routes-eta/index.ts` → Mapbox Directions API (`/directions/v5/mapbox/driving`).
- `src/components/patients/AddressAutocomplete.tsx` and `src/features/patients/components/AddressAutocomplete.tsx` — keep the component API; swap the internal fetch to the new endpoints. Session token handling moves from Google to Mapbox `session_token` param.

## Config layer

- Delete `src/modules/holarchelp/config/google-maps.ts`; add `src/modules/holarchelp/config/mapbox.ts` exporting `MAPBOX_STYLE = "mapbox://styles/mapbox/navigation-day-v1"` and a `loadMapboxToken()` helper.
- Rename `useGoogleMapsKey.ts` → `useMapboxToken.ts`; point at new `mapbox-config` edge function.
- Edge function `maps-config` → renamed to `mapbox-config`, returns `{ token }` from `MAPBOX_PUBLIC_TOKEN`.

## Files touched

```text
NEW   supabase/functions/mapbox-config/index.ts
EDIT  supabase/functions/geocode-address/index.ts
EDIT  supabase/functions/google-places-autocomplete/index.ts   (→ Mapbox internally)
EDIT  supabase/functions/google-place-details/index.ts         (→ Mapbox internally)
EDIT  supabase/functions/places-autocomplete-public/index.ts
EDIT  supabase/functions/place-details-public/index.ts
EDIT  supabase/functions/routes-eta/index.ts
DEL   supabase/functions/maps-config/index.ts
NEW   src/modules/holarchelp/config/mapbox.ts
NEW   src/modules/holarchelp/hooks/useMapboxToken.ts
DEL   src/modules/holarchelp/config/google-maps.ts
DEL   src/modules/holarchelp/hooks/useGoogleMapsKey.ts
EDIT  src/modules/holarchelp/components/LiveMap.tsx
EDIT  src/modules/holarchelp/components/ProviderMap.tsx
EDIT  src/modules/holarchelp/components/SosLiveMap.tsx
EDIT  src/components/patients/AddressAutocomplete.tsx
EDIT  src/features/patients/components/AddressAutocomplete.tsx
EDIT  src/modules/holarchelp/pages/provider/ProviderProfile.tsx  (import paths only)
EDIT  package.json                                               (drop leaflet, add mapbox-gl)
```

## Out of scope

- No changes to map data schemas, RLS, or any business logic.
- No visual redesign beyond the new Mapbox tile style.
- Marker SVGs reused as-is via HTML elements.

## Risks

- Mapbox Search Box returns slightly different result shapes than Google Places — the `AddressAutocomplete` adapter handles the mapping.
- Mapbox GL JS requires a container with explicit width/height (already true for current Leaflet wrappers).
- `navigation-day-v1` is a paid-tier–friendly style but counts toward Mapbox map-load quota; usage will need monitoring.

After approval I'll request the `MAPBOX_PUBLIC_TOKEN` secret first, then implement.