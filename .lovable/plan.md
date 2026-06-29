## Goal
Replace Mapbox with Google Maps across the live tracking experience (SOS, Active Mission, Fleet Live, Public Track, Incident Detail) for a more polished, familiar look — without losing the smooth ambulance tweening, route line, distance pill, or realtime updates we already have.

## Why it failed last time (and how we avoid it)
Google Maps needs three things lined up correctly. Last time at least one was missing:

1. **A connection to the Google Maps Platform connector.** Lovable injects a *browser key* (`VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY`) for the in-page map, and a *server key* for gateway calls like Routes/ETA.
2. **Async loading with a `callback`.** With `loading=async`, `google.maps.Map` is not ready at script `onload` — we must wait for an `initMap` callback. This is the most common cause of a blank map.
3. **No `mapId` and no `AdvancedMarkerElement`.** Those require Cloud Console setup users don't have. We'll use classic `google.maps.Marker` + custom HTML overlays so it just works.

The managed Lovable key is restricted to `*.lovable.app` / `*.lovableproject.com`. It will work on the preview and `holarchealth.lovable.app` out of the box. For `holarchealth.com` / `www.holarchealth.com` (custom domain), you'll need your own Google Cloud API key with those domains in the HTTP-referrer allowlist — I'll walk you through it when we publish.

## What changes (user-visible)
- Same map UI surface area — but rendered by Google Maps with the standard Google road styling, traffic-aware route line, and Google's familiar controls.
- Patient = blue dot, ambulance = red circle with ambulance icon, hospital = red cross marker (same icons we use today, just on Google tiles).
- Ambulance still glides smoothly between GPS pings (tweened over ~800 ms).
- Distance pill stays on the route midpoint.
- "Waiting for first GPS fix…" overlay preserved.
- Realtime Supabase subscription unchanged — only the renderer swaps.

## Technical plan

### 1. Connect Google Maps Platform
Use the `Google Maps Platform` connector. This provisions:
- `VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY` (browser, referrer-restricted)
- `GOOGLE_MAPS_API_KEY` + `LOVABLE_API_KEY` (server, for the gateway)
- `VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID` (channel param)

### 2. New `LiveMap` (Google Maps version)
Rewrite `src/modules/holarchelp/components/LiveMap.tsx` to:
- Lazy-load the Maps JS API once via a shared loader util (`src/modules/holarchelp/lib/googleMapsLoader.ts`) using `loading=async&callback=__lovableInitGmaps&channel=…`. The loader returns a promise that resolves when the callback fires — every map mount awaits it.
- Create a `google.maps.Map` with no `mapId`, default Google styling, `disableDefaultUI: false`, `zoomControl: true`, `streetViewControl: false`.
- Render markers with `google.maps.Marker` using inline-SVG `icon` URLs (same visual as today's HTML markers).
- Draw the route as a `google.maps.Polyline` with `strokeColor` red/teal and a dashed `icons` pattern.
- Distance pill = `google.maps.OverlayView` anchored at route midpoint (so it scales with the map and stays styled like today's pill).
- Ambulance tween: same `requestAnimationFrame` loop, just call `marker.setPosition({lat,lng})` and update the polyline's path each frame.
- Fit bounds with `map.fitBounds(bounds, {padding:64})`; single-point centers with `map.panTo` + zoom 13.

### 3. Replace Mapbox ETA with Google Routes
Rewrite `supabase/functions/routes-eta/index.ts` to call Google Routes API through the gateway:
- `POST https://connector-gateway.lovable.dev/google_maps/routes/directions/v2:computeRoutes`
- Headers: `Authorization: Bearer ${LOVABLE_API_KEY}`, `X-Connection-Api-Key: ${GOOGLE_MAPS_API_KEY}`, `X-Goog-FieldMask: routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline`
- Same response shape returned to the client (`duration_seconds`, `duration_minutes`, `distance_meters`, `polyline`) so no caller changes.
- Decode the encoded polyline client-side with `google.maps.geometry.encoding.decodePath` (load `libraries=geometry` in the script URL).

### 4. Drop Mapbox config
- Delete `src/modules/holarchelp/config/mapbox.ts`.
- Delete `src/modules/holarchelp/hooks/useMapboxToken.ts`.
- Keep `supabase/functions/mapbox-config` in place for one release (in case any cached client still calls it), then remove next pass.
- Remove `mapbox-gl` from `package.json` and `import "mapbox-gl/dist/mapbox-gl.css"`.

### 5. Custom domain prep (later, at publish time)
When you're ready to publish to `holarchealth.com`, I'll walk you through:
1. Create/select a Google Cloud project, enable billing, enable **Maps JavaScript API**, **Routes API**, **Places API (New)** (if we add search later).
2. Create an API key, restrict to HTTP referrers: `https://holarchealth.com/*` and `https://*.holarchealth.com/*`.
3. In Lovable connector settings, add a *custom* Google Maps connection with that key alongside the managed one.

Until then, preview + `holarchealth.lovable.app` work with the managed key automatically.

## What I need from you to start
1. Approve this plan.
2. After approval (in build mode) I'll call the connector — you'll get a one-click prompt to connect Google Maps Platform.

## Risk / rollback
The change is isolated to `LiveMap.tsx`, `routes-eta`, and removal of two Mapbox-only files. If anything looks off we can revert just those files in one shot.
