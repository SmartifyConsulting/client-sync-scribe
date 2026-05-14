## Changes

### 1. Provider auto-assign window: 30s → 60s
**File:** `src/modules/holarchelp/components/AvailableResponders.tsx`
- Change `AUTO_ASSIGN_MS = 30 * 1000` → `60 * 1000`.
- Countdown UI text already uses the constant, so it will display the new 60s window automatically.

### 2. Map not rendering immediately on the active emergency view
**File:** `src/modules/holarchelp/components/LiveMap.tsx`

Cause: Leaflet calculates tile layout from the container size at init. When the incident detail page mounts, the map container is briefly 0×0 (inside flex/grid + dialog/scroll containers), so tiles never paint until something forces a resize. Today there's only a single `setTimeout(invalidateSize, 100)` inside the markers effect.

Fix:
- Use a `ResizeObserver` on the map container — call `map.invalidateSize()` whenever the container's size changes (handles the 0×0 → real-size transition on initial mount).
- Also call `invalidateSize()` immediately after init via `requestAnimationFrame` and again after 250ms as a safety net for slow layout passes.
- Keep the existing post-marker `invalidateSize()`.

### Out of scope
- No backend / RPC / countdown-logic changes (the server-side picker is independent of the UI countdown text).
- No marker icon changes (red cross + ambulance icons stay as set).
- No changes to `AvailableResponders` countdown rendering beyond the constant.

## Files touched
- `src/modules/holarchelp/components/AvailableResponders.tsx` (1-line constant)
- `src/modules/holarchelp/components/LiveMap.tsx` (add ResizeObserver + early invalidateSize)
