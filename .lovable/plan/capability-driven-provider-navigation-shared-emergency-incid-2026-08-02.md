# Capability-Driven Provider Navigation & Shared Emergency Incident

Information architecture and navigation redesign only. No branding, colour, typography or component-style changes.

## 1. Hospital capability flags

Add three flags to the hospital record (defaults: emergency department on, accepts transfers on, own fleet off):

- Has Emergency Department
- Accepts Ambulance Transfers
- Operates Own Ambulance Fleet

These are editable in Hospital Settings (Provider Profile) by hospital owners/admins only. Navigation and route access derive from them.

## 2. Dynamic, module-based sidebar

Replace the hard-coded hospital/ambulance arrays in `ProviderSidebar.tsx` with a module registry: each module declares an id, title, items and an `enabled(capabilities)` predicate. The sidebar renders only enabled modules, in registry order. Adding Pharmacy, Laboratory, Blood Bank, Air Ambulance etc. later means adding a registry entry — no sidebar changes.

Hospital (no fleet):

```text
Operations      Dashboard
Emergency       ER Dashboard, Live Queue, Incoming Ambulances, Triage Board, Trauma Bays
Patients        Admissions, Wards, Inpatients, Discharges
Staff           Shift Schedule, My Shift
Administration  Hospital Admin
Analytics
```

Hospital (owns fleet) — same, plus, between Staff and Administration:

```text
Ambulance Services  Dispatch Dashboard, Fleet Live, Vehicles, Crew, Dispatch History, Vehicle Maintenance
```

Ambulance provider: Operations, Dispatch, Fleet, Crew, Hospitals, Administration (current grouping, moved into the registry).

If Has Emergency Department is false, the Emergency module is hidden. If Accepts Ambulance Transfers is false, Incoming Ambulances is hidden.

## 3. One Emergency Incident, several views

Keep `holarchelp_incidents` as the single incident record — no new incident tables and no copies. Existing fields already cover incident number, patient, severity, GPS, assigned ambulance/crew, destination hospital, ETA, status, triage bay, notes, voice notes. Add only the missing coordination fields to that same table: assigned trauma bay, assigned doctor, acceptance decision/decided-by, handover state and timestamp.

Three role-specific views over that one record:

- Hospital ER: incoming ambulance, ETA, patient, vitals, trauma bay, assigned doctor, Prepare Team.
- Ambulance provider: SOS, vehicle, crew, route, hospital capacity, navigation, patient, handover, complete trip (existing console).
- Hospital administration: ER patient totals, ambulances en route, average handover time, trauma bay usage, admissions, discharges, ER capacity, bottlenecks (extends the existing admin dashboard).

## 4. Screen changes (reuse, rename, repurpose)

- Fleet Live is removed from hospitals without a fleet; **Incoming Ambulances** becomes its own page built from the existing `IncomingAmbulancesScreen`, showing only ambulances bound for this hospital as live cards sorted by ETA (ambulance number, ETA, GPS, crew, patient, severity, incident type, status, trauma bay, live vitals, Open Incident).
- Dispatch Dashboard is hidden for hospitals without a fleet. **ER Coordination** (repurposed from the current Emergency Hub) handles incoming ambulances, trauma bay assignment, doctor assignment, resuscitation team, alerts, prepare room, hospital acceptance and handover status — an arrivals-board layout using existing card/table components.
- **Trauma Bays** page derives from the current ER capacity/triage screens; bays are tracked on the hospital record.
- **Discharges** and **Analytics** reuse existing inpatient/admin dashboard data.
- Hospitals with a fleet keep today's dispatch/fleet screens, now grouped under Ambulance Services; the same ambulance-provider components are reused, scoped to the hospital's own fleet.

## 5. Hospital acceptance workflow

When an ambulance sets a destination hospital, that hospital sees an incoming-patient card (ETA, patient, incident type, vitals, crew notes, photos, medication, allergies) with Accept, Redirect and Prepare Trauma Team actions. Accepting writes acceptance, trauma bay and assigned doctor onto the same incident; the ambulance console reflects it live (Accepted → Proceed to Trauma Bay N → doctor assigned → team ready) through the existing realtime subscription.

## Technical notes

- Migration: capability flag columns and trauma-bay/doctor/acceptance/handover columns on existing tables, with RLS updates so only hospital owners/admins change flags and acceptance, and ambulance crews read the coordination fields for their assigned incident.
- New `src/modules/holarchelp/nav/registry.ts` plus a `useProviderCapabilities` hook; `ProviderSidebar` becomes a renderer over the registry.
- Route guards read the same capabilities so disabled routes redirect instead of rendering.
- Old paths (`/provider/hospital/dispatch`, `/monitoring`, `/timeline`, `/providers`) keep redirects for existing deep links.
