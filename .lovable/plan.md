## Root cause

`LiveMap` only initializes the Leaflet map *after* a patient location arrives (the `if (!patient) return placeholder` early-return). When `locations` is empty on first render, the placeholder mounts and the container ref is never attached. When `locations` later populates, the container div mounts but the init `useEffect` already ran on the placeholder render — so the map is never created. On re-entry, the same happens because state starts empty again until the location query resolves.

There may also be a second case where the map *is* initialized but a stale React effect prevents `invalidateSize` from firing on subsequent navigations.

## Fix

Rewrite `LiveMap` so the **container always mounts** and the Leaflet map initializes immediately, even with no points yet:

1. **Always render the map container.** Remove the `if (!patient) return placeholder` early-return. Instead, render the map div unconditionally and overlay a small "Waiting for first GPS fix…" badge when there are no points yet.
2. **Init with sensible default center** (Johannesburg fallback) when no patient is present, then re-center via the existing markers/bounds effect once points arrive.
3. **Keep ResizeObserver + rAF + delayed `invalidateSize`** (already in place) for layout-timing resilience.
4. **Whenever `points` change** (including empty → first point), call `map.invalidateSize()` *before* `setView` / `fitBounds`. This handles the case where the container becomes visible after a layout shift.

## Files touched
- `src/modules/holarchelp/components/LiveMap.tsx` — restructure so container always mounts; overlay placeholder; ensure invalidateSize before view changes.

## Out of scope
- No changes to `HolarcHelpIncidentDetail.tsx` (parent already always renders `<LiveMap>`).
- No marker icon, countdown, or backend changes.
