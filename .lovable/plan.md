# Emergency Provider (ER) Module — Workflow Refactor

Reorganise the ambulance provider portal around a real EMS dispatch-centre workflow. No branding, colour, typography, icon or component-style changes; no schema or API changes. Existing screens are reused and re-laid-out, not rewritten from scratch.

## 1. Grouped navigation

`ProviderSidebar` gains optional section headers (small uppercase muted labels, same spacing language already used for the profile block). Ambulance nav becomes:

```text
LIVE OPERATIONS
  Dispatch Console      /provider/ambulance            (was Emergency/Dispatch Dashboard)
  Incidents             /provider/ambulance/incidents  (new)
  Fleet Map             /provider/ambulance/monitoring (was Fleet Live)
OPERATIONS
  Operations Dashboard  /provider/ambulance/ops-dashboard
  Vehicles              /provider/ambulance/vehicles   (new page from FleetOperationsScreen)
  Crews                 /provider/ambulance/crews      (new page, from Admin → Crew)
  Hospitals             /provider/ambulance/hospitals  (HospitalNetworkScreen)
  Reports               /provider/ambulance/reports    (ExecutiveDashboard + Billing tabs)
ADMINISTRATION
  Users                 /provider/ambulance/admins?tab=users
  Roles & Permissions   /provider/ambulance/admins?tab=roles
  Fleet Configuration   /provider/ambulance/admins?tab=fleet
  Organisation Settings /provider/ambulance/profile
```

Old routes stay as redirects so existing deep links keep working. Operational tabs (Crew, Hospitals) move out of Administration; Administration keeps configuration only.

## 2. Dispatch Console (primary screen)

Rebuild the layout of the current dispatch screen into a four-column left-to-right workflow with a sticky action bar, reusing the existing data loading, realtime subscriptions, assignment RPCs and dialogs:

```text
SOS Queue (25%) | Incident Details (30%) | Ambulances (25%) | Hospitals (20%)
------------------------------------------------------------------------
[ Assign Ambulance ]  [ Notify Crew ]  [ Navigate ]  [ Notify Hospital ]
```

- SOS Queue: severity-grouped (critical/high/moderate/low) cards with incident number, priority, waiting time, distance, caller and patient name. Selecting an incident drives the rest of the screen.
- Incident Details: patient, caller, address, GPS, symptoms, priority, special requirements, timeline, estimated travel time, notes; Cancel / Hold / Assign buttons.
- Ambulances: richer cards (vehicle, crew, distance, ETA, shift, equipment, fuel, availability), auto-sorted nearest → available → capability, with a "Recommended" badge on the top match.
- Hospitals: ranked on selection by distance, trauma capability, capacity, type and current load; shows name, distance, ETA, capability, status, preferred flag. Replaces the "Select SOS First" placeholder with ranked recommendations once an incident is chosen (placeholder only when nothing is selected).

## 3. Operations Dashboard

Existing `ErOpsDashboard` is re-laid-out, not replaced: KPI row (open incidents, vehicles available, vehicles on mission, crews on shift, average response time, fleet utilisation), then a split Live Incident Board / Fleet Status, then an Operational Alerts strip (maintenance due, fuel warnings, offline GPS, safety events). Dispatch/assignment controls are removed from this page — it becomes read-only overview.

## 4. Fleet Map

Map grows to ~70% width; selecting a vehicle opens a 30% right-hand detail panel (ID, crew, status, current incident, destination, fuel, speed, mileage, equipment, maintenance, mission timeline). The stacked vehicle cards under the map are removed; the list becomes a compact selector inside the panel column.

## 5. New pages (list + detail split, 70/30)

- Incidents: list left, detail right (timeline, patient, caller, vehicle, hospital, outcome, audit trail, notes). Built from existing incident history/console data.
- Vehicles: list + detail (registration, call sign, type, crew, equipment, maintenance, insurance, GPS, current assignment, mission history). Reuses `FleetOperationsScreen` and `VehicleProfileScreen` content.
- Crews: roster by state (on shift, available, dispatched, at hospital, offline) plus per-member profile panel. Reuses the Admin → Crew data.
- Hospitals: capabilities, trauma level, capacity, preferred destination flag, average offload time, GPS, contacts. Reuses `HospitalNetworkScreen` / affiliations data.

## 6. Shared components

Extract and reuse across all the above, in `src/modules/holarchelp/components/ems/`:
`IncidentCard`, `VehicleCard`, `CrewCard`, `HospitalCard`, `KPIStat`, `StatusBadge`, `Timeline`, `AssignmentPanel`. Existing screens are migrated onto these to remove duplication.

## Technical notes

- All new pages read from the existing `holarchelp_*` tables and hooks (`useErOpsStats`, `useActiveMissions`, `useShiftTelematics`, `useHospitalNetwork`, `useLiveProviderLocation`) — no new tables, no new edge functions.
- Hospital ranking and ambulance recommendation are computed client-side from data already fetched (distance via the existing haversine helper, capability/capacity columns already present).
- Existing realtime channels and RPCs (`holarchelp_auto_assign_incident`, `holarchelp_set_destination_hospital`) are preserved.
- New labels are added to `src/i18n/locales/en.json` following the existing `nav.*` key pattern.
- Hospital portal nav is untouched by this change.

## Suggested order

1. Shared components + grouped sidebar and routes/redirects.
2. Dispatch Console relayout.
3. Fleet Map relayout + Operations Dashboard cleanup.
4. Incidents, Vehicles, Crews, Hospitals pages.
5. Administration trimmed to configuration only.
