## Goal

Reorganize the Dispatch Dashboard so the Dispatcher Console drives everything, add an Active Missions frame inside it, and retire the "Active Mission" sidebar entry.

## Changes

### 1. `EmergencyDashboardScreen.tsx` — reorder
New top-to-bottom order:
1. Header
2. **Dispatcher Console** (with new Active Missions frame inside — see #2)
3. **Incoming SOS** cards
4. **Stats strip** (Incoming · Critical · Rolling)
5. **Rolling shifts** accordion (unchanged)

(Currently: stats → console → incoming → rolling. The request is for Incoming SOS to sit above the stats infographic strip, with the console on top.)

### 2. `DispatcherConsoleScreen.tsx` — add Active Missions frame
Add a new section above the existing 3-column grid (Open SOS / Available vehicles / Selected incident):

- Title: "Active Missions · N"
- Loads incidents where `assigned_provider_id = providerId` and `status IN ('assigned','en_route','arrived','patient_collected','en_route_to_hospital','at_hospital')`.
- Realtime-subscribed (same channel pattern as `loadAll`).
- Each row is a compact card with:
  - `IncidentNumberBadge` (incident #)
  - Inline mini `MissionStatusStepper` (read-only, current step highlighted)
  - Destination hospital name (joined from `holarchelp_hospitals` via `destination_hospital_id`)
  - ETA via `EtaCountdown` (uses `eta_minutes` + `last_eta_update`)
  - Vehicle code (from active shift) as small meta
- Whole card is a link to `/provider/ambulance/navigation/:id` — drill-down opens full Active Mission console.
- Empty state: "No active missions."

Layout: full-width frame above the existing grid, cards stacked (1 col on mobile, 2 cols on lg).

### 3. `MissionStatusStepper.tsx` — compact variant
Add an optional `compact` prop that renders a single-row horizontal mini-stepper (dots + current label only) for use in the Active Missions list rows. Existing usage in `NavigationScreen` keeps the full stepper.

### 4. Sidebar — remove "Active Mission"
`src/components/layout/ProviderSidebar.tsx`: remove the `nav.navigation` ("Active Mission") item for the ambulance role. Drill-down from the Active Missions row inside Dispatcher Console replaces it.

Keep the `/provider/ambulance/navigation/:id` route intact (it's where the drill-down lands).

## Files touched
- `src/modules/holarchelp/pages/provider/ambulance/EmergencyDashboardScreen.tsx`
- `src/modules/holarchelp/pages/provider/ambulance/DispatcherConsoleScreen.tsx`
- `src/modules/holarchelp/components/MissionStatusStepper.tsx`
- `src/components/layout/ProviderSidebar.tsx`

No DB or RLS changes.
