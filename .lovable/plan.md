## What's in place today

- `SosLiveMap` already renders patient + responder + (optional) hospital on Leaflet/OpenStreetMap.
- It already shows a dashed red line between patient and responder.
- It already pulls an ETA (`{minutes} min · {km} km`) from `routes-eta`, with a haversine fallback.
- Provider position is already wired to realtime updates on `holarchelp_provider_locations`, so when the vehicle sends a new GPS fix, the marker re-renders. So "showing the vehicle moving" is already supported when fixes arrive — we'll polish it.

## Changes (all UI-only, no schema or business logic)

### 1. Distance label on the map line — `src/modules/holarchelp/components/LiveMap.tsx`
- Accept an optional `distanceKm` prop.
- Place a small tooltip/`L.marker` with a `divIcon` at the midpoint of the dashed line showing e.g. `4.2 km`, styled as a white pill with a red border (matches the line).
- Hide when only one point exists.

### 2. Countdown timer — `src/modules/holarchelp/components/SosLiveMap.tsx`
- When `eta.minutes` is set, start a local countdown (`useEffect` + `setInterval(1000)`) that ticks down a `remainingSeconds` state.
- Whenever a new ETA arrives from `routes-eta`, reset the countdown to the new value.
- Replace the static "{minutes} min" badge with a live "mm:ss" countdown plus the km. When it reaches `00:00`, display "Arriving now".
- Keep the dashed line + the distance pill in sync (they update from haversine on every provider move regardless of the routes-eta debounce).

### 3. Smoother vehicle movement — `src/modules/holarchelp/components/LiveMap.tsx`
- Keep a ref to the responder marker. Instead of removing+re-adding it on every update, tween its `setLatLng` from the previous coords to the new coords over ~800 ms using `requestAnimationFrame` (linear interpolation). Patient + hospital still render as static markers.
- Also redraw the dashed polyline + recompute the midpoint distance pill each frame so the line "follows" the vehicle in real time.
- No tile changes; still OpenStreetMap.

## Files touched

- `src/modules/holarchelp/components/LiveMap.tsx` — distance pill + smooth marker tween for the ambulance.
- `src/modules/holarchelp/components/SosLiveMap.tsx` — countdown state + pass `distanceKm` to `LiveMap`.

## Notes / non-goals

- Real-time movement only animates when actual GPS fixes arrive from the ambulance app (writes to `holarchelp_provider_locations`). We do not fabricate motion when no new fix is received.
- No turn-by-turn route polyline — that would need a routing provider (OSRM/Mapbox) and is out of scope. The dashed straight line + live distance/ETA remains.
