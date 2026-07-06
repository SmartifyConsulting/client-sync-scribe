## Two workstreams

### A. Renken data + Sharon SOS visibility (unchanged)

1. **Seed AMB-001, AMB-002, AMB-003** into `public.ambulances` under Renken (`provider_id = 121ae795-b2b1-4693-93bf-a2ba1dfdaeae`) so they show up in Fleet Admin, Vehicle Availability, and the Dispatcher's Available Vehicles list.

   | vehicle_code | status         | notes       |
   | ------------ | -------------- | ----------- |
   | AMB-001      | available      | Main Street |
   | AMB-002      | assigned       | Highway 101 |
   | AMB-003      | out_of_service | Workshop    |

2. **Sharon's SOS (INC-2026-001078)** — RLS recursion fix from the previous turn already allows Renken staff to read this open incident (verified `provider_has_offer_on_incident` returns true for Renken). Add a second realtime listener in `EmergencyDashboardScreen.tsx` on `holarchelp_incident_offers` so a new offer to Renken re-fires `load()` immediately instead of waiting for a page refresh.

### B. Hospital portal nav consolidation

Merge the four duplicated hospital screens into **one** unified "ER Command" screen, and prune two nav entries. Nothing is deleted from the codebase surface — all fields, buttons, and sub-widgets are preserved, just moved into tabs.

#### New nav (hospital portal)

```text
Emergency (was 4 items) — /provider/hospital
Admissions             — /provider/hospital/admissions
Dispatch Management    — /provider/hospital/dispatch
Admin                  — /provider/hospital/admins
```

Removed from the sidebar: **Providers**, **Incident Timeline**.

#### The unified "Emergency" screen

Single page at `/provider/hospital` (index route) with a tab bar. Each tab renders the existing component untouched so no field is lost:

| Tab            | Existing component            | Notes                              |
| -------------- | ----------------------------- | ---------------------------------- |
| Emergency Queue | `<HospitalOpsDashboard />`    | current index screen               |
| Incoming ER    | `<IncomingAmbulancesScreen />`| current `/incoming` screen         |
| Triage         | `<TriageScreen />`            | current `/triage` screen           |
| ER Capacity    | `<ErCapacityScreen />`        | current `/capacity` screen         |

The active tab is stored in the URL as `?tab=queue|incoming|triage|capacity` so deep links and reloads keep the same view.

#### Route changes

- Keep the standalone routes `/provider/hospital/incoming`, `/triage`, `/capacity` as **redirects** to `/provider/hospital?tab=<key>` so any bookmark, in-app link, or notification continues to work.
- Remove the sidebar entries for `nav.providers` and `nav.incidentTimeline` from `hospitalNav` in `src/components/layout/ProviderSidebar.tsx`.
- Keep the underlying `ProvidersScreen` and `IncidentTimelineScreen` routes reachable by URL (they're linked from the Admin screen and incident detail pages), but drop the top-level nav pins.

## Files to touch

- **Data insert (Renken vehicles):** `public.ambulances` via the insert tool.
- **Emergency Dashboard realtime:** `src/modules/holarchelp/pages/provider/ambulance/EmergencyDashboardScreen.tsx` — add `holarchelp_incident_offers` listener.
- **New unified screen:** `src/modules/holarchelp/pages/provider/hospital/EmergencyHubScreen.tsx` — tabs container that lazy-mounts the four existing components.
- **Sidebar:** `src/components/layout/ProviderSidebar.tsx` — collapse the first four items into one "Emergency" pin, remove Providers + Incident Timeline pins.
- **Routes:** `src/modules/holarchelp/routes-provider.tsx` — swap the index route to `EmergencyHubScreen`, convert `/incoming`, `/triage`, `/capacity` to `<Navigate>` redirects with the appropriate `?tab` param.
- **i18n:** add `nav.emergency` label; existing four labels stay (used as tab titles) so no translation churn.

## Technical notes

- All four merged components already fetch their own data and manage their own state — mounting them inside tabs is a zero-refactor move; no props or wiring change.
- Query-param routing avoids nested React Router boilerplate and preserves back/forward behaviour.
- Because `ProvidersScreen` and `IncidentTimelineScreen` remain registered under their existing paths, any deep links from Admin, notifications, or incident consoles keep working — only the sidebar shortcuts go away.
- No RLS/data migration is required for this hospital-side consolidation.
