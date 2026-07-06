## Hospital portal: stacked Emergency Queue + add ER Provider screens

### 1. Merge four hospital screens into one stacked "Emergency Queue" page

Replace the tabbed `EmergencyHubScreen` with a single scrollable page at `/provider/hospital` that renders every widget from the four source screens top-to-bottom, matching the attached mockup — no tabs.

```text
Page title: Emergency Queue
├─ KPI chips row (from HospitalOpsDashboard)
├─ Live Emergency Queue table (from HospitalOpsDashboard)
├─ ER Capacity grid — 6 tiles (from ErCapacityScreen)
├─ Triage Board — 5 columns (from TriageScreen)
└─ Incoming Ambulances list (from IncomingAmbulancesScreen)
```

Files:
- `EmergencyHubScreen.tsx` — drop `Tabs`/`?tab=` param, render the four child components sequentially inside `space-y-6`. Set page `<h1>` to "Emergency Queue".
- `HospitalOpsDashboard.tsx`, `IncomingAmbulancesScreen.tsx`, `TriageScreen.tsx`, `ErCapacityScreen.tsx` — trim the repeated `HOSPITAL EMERGENCY OPERATIONS` header block; keep every field, table, control, save button, dialog, and realtime subscription.
- `routes-provider.tsx` — keep `/incoming`, `/triage`, `/capacity` as redirects to `/provider/hospital` (drop the `?tab=` suffix).
- Sidebar label: rename `nav.emergency` pin to `nav.emergencyQueue` ("Emergency Queue").

### 2. Remove Providers and Incident Timeline from the hospital sidebar

Already gone from `hospitalNav` in `ProviderSidebar.tsx` — confirm. Underlying routes `/provider/hospital/providers` and `/provider/hospital/timeline` stay registered so existing deep links still resolve.

### 3. Give hospitals the same fleet + dispatch screens ER Providers have

Hospitals can run their own ambulance fleet and dispatch using the exact ER Provider components (no forks). The nav mirrors the ambulance sidebar 1:1 — **one** Dispatch pin and **one** Fleet pin.

#### New hospital sidebar (final order)

```text
Emergency Queue        — /provider/hospital                 (Siren, danger)
Admissions             — /provider/hospital/admissions      (ClipboardList)
Dispatch Dashboard     — /provider/hospital/dispatch        (Siren, danger)   ← unified
Fleet Live             — /provider/hospital/monitoring      (Radar)           ← unified
Admin                  — /provider/hospital/admins          (UserCheck)
```

Admissions sits directly under Emergency Queue.

Merges:
- **Dispatch Dashboard = Dispatch Management.** One pin, one screen (`EmergencyDashboardScreen`, same as ER Provider's Emergency Dashboard). The old Dispatch Management pin (`MultiIncidentBoardScreen`) is removed; `/provider/hospital/dispatch` now serves the unified dispatcher console. `/provider/hospital/dispatch-board` and `/provider/hospital/dispatch-queue` remain as redirects to `/provider/hospital/dispatch` so bookmarks work.
- **Fleet Live = Fleet Operations.** One pin, one screen (`RealTimeMonitoringScreen`, same as ER Provider's Fleet Live). Fleet Operations (`FleetOperationsScreen`) is reachable as a drilldown from within Fleet Live via `/provider/hospital/fleet` but has no top-level pin.

#### Hospital routes (reusing existing ER Provider components)

| Path                                    | Component (reused, unchanged)          |
| --------------------------------------- | -------------------------------------- |
| `/provider/hospital/dispatch`           | `EmergencyDashboardScreen` (was `MultiIncidentBoardScreen`) |
| `/provider/hospital/dispatch-board`     | redirect → `/provider/hospital/dispatch` |
| `/provider/hospital/dispatch-queue`     | redirect → `/provider/hospital/dispatch` |
| `/provider/hospital/monitoring`         | `RealTimeMonitoringScreen`             |
| `/provider/hospital/fleet`              | `FleetOperationsScreen` (drilldown, no pin) |
| `/provider/hospital/fleet/vehicle/:id`  | `VehicleProfileScreen`                 |
| `/provider/hospital/navigation/:id?`    | `NavigationScreen`                     |
| `/provider/hospital/abuse` (+ children) | `VehicleAbuseScreen` and sub-screens   |

The existing incident-create flow (`/provider/hospital/incident/create/*`), reassignment, and manual-override routes stay unchanged.

Files:
- `routes-provider.tsx` — swap `/dispatch` to `EmergencyDashboardScreen`, add the fleet + monitoring + navigation + abuse routes, add the two dispatch redirects.
- `ProviderSidebar.tsx` — reorder `hospitalNav` to: Emergency Queue, Admissions, Dispatch Dashboard, Fleet Live, Admin. Replace the `nav.dispatchManagement` pin with `nav.dispatchDashboard`, add `nav.fleetLive` pin.
- `i18n/locales/en.json` — add any missing keys (`nav.emergencyQueue`, `nav.dispatchDashboard`, `nav.fleetLive`).

### Data / access notes

- `EmergencyDashboardScreen`, `RealTimeMonitoringScreen`, and `FleetOperationsScreen` all scope queries by the `providerId` from `useProviderAccess()`. Mounted under `/provider/hospital`, that resolves to the hospital's provider id, so the same components render hospital-owned ambulances, offers, and shifts with zero code change.
- No RLS changes required — policies on `ambulances`, `holarchelp_incident_offers`, and shift/telematics tables already key off `provider_id`.

### Preserved / out of scope

- Renken AMB-001/002/003 seed and Sharon SOS realtime listener — already shipped.
- All existing hospital deep-link routes (Admissions, `ProvidersScreen`, `IncidentTimelineScreen`, incident create/dispatch flows) stay reachable by URL.
- No styling redesign — the stacked Emergency Queue uses existing component styles to closely match the attached mockup.
