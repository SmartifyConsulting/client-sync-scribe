## Goal

Two distinct on-map relationships, each with its own line + distance + countdown, plus a small workflow tweak for the hospital-selection step.

```
patient ──── red dashed ───▶ ambulance       (live ETA #1 — pickup)
patient ──── teal dashed ──▶ destination     (distance to chosen hospital)
ambulance ── red dashed ───▶ destination     (live ETA #2 — transport, after pickup)
```

## Behavioural rules

1. **Hospital selection phase** (no destination chosen yet): show patient + candidate hospitals only. Do **not** render any ambulance marker / offers on the map. The closest ambulance dispatches automatically once a destination is picked.
2. **After a destination hospital is chosen**:
   - Draw a **teal dashed line** + teal distance pill between patient ↔ destination hospital. Always visible from this point on.
   - Once an ambulance has a live GPS fix, draw a **red dashed line** + red distance pill between patient ↔ ambulance.
3. **After ambulance status flips to `en_route` / `patient_collected`** (i.e. heading to the hospital with the patient on board):
   - Stop drawing the patient↔ambulance red line (the ambulance is no longer coming to the patient).
   - Draw a new **red dashed line** + red distance pill between ambulance ↔ destination hospital.
   - Start a **second countdown** for the transport leg, using the same `routes-eta` path (origin = ambulance, destination = hospital). When this one hits `00:00`, label it "Arriving at hospital".

## File changes (UI only — no schema, no business logic)

### `src/modules/holarchelp/components/LiveMap.tsx`
- Replace the single "vehicle line" with two generic line slots, each addressable by a refs pair:
  - `routeA` = patient ↔ ambulance, **red** dashed.
  - `routeB` = either patient ↔ hospital (pre-pickup) **or** ambulance ↔ hospital (post-pickup), styled per its `color` prop.
- Add a `routes` prop to `LiveMap`:
  ```ts
  routes?: Array<{
    from: { lat: number; lng: number };
    to: { lat: number; lng: number };
    color: "red" | "teal";
    distanceKm?: number; // shown in midpoint pill
  }>;
  ```
- Render each route's polyline + midpoint pill (red `#dc2626`, teal `#0d9488`). Keep the existing smooth tween on the ambulance marker.
- Remove the hard-coded internal patient↔ambulance line. `SosLiveMap` now composes whatever lines apply.

### `src/modules/holarchelp/components/SosLiveMap.tsx`
- Read the incident `status` (in addition to fields already loaded) so we can detect `en_route` / `patient_collected` / `at_hospital`.
- Decide phase from state:
  - `selecting`: destination_hospital_id is null → show patient + (any) candidate hospitals only. **Hide ambulance** even if we have its coords.
  - `pickup`: destination chosen, ambulance status ∈ {assigned/accepted/awaiting pickup}. Show patient + ambulance + destination. Routes = `[patient↔ambulance(red), patient↔hospital(teal)]`.
  - `transport`: status ∈ {en_route, patient_collected, at_hospital}. Show ambulance + destination (still show patient marker as origin context, but no red line to it). Routes = `[patient↔hospital(teal), ambulance↔hospital(red)]`.
- Two ETA effects, each calling `routes-eta` with the relevant origin/destination, with the existing haversine fallback. Each feeds its own `useState<{minutes, km}>`.
- Two countdown badges stacked top-left of the map. Keep them visually prominent (red pill on dark/red bg, bold tabular-nums, ~text-base, pulsing dot). Pre-pickup shows "PICKUP · mm:ss", transport shows "TRANSPORT · mm:ss".
- During `selecting`, no countdowns render.

### Optional follow-up (out of scope for this turn unless asked)
Honour the "selecting" rule outside the map too — `AvailableResponders` already lists hospitals as choices; no change needed there.
