
# Two dedicated operational interfaces

Today every approved provider lands on the same generic `ProviderLayout` (single top bar, "Dispatch / Profile" links, max-w-4xl content). Hospitals and ambulances both fall through to it, which is why the hospital view feels like a patient page. We will split the `/provider/*` portal into two role-specific portals that share branding/tokens but have their own layout, navigation and screens.

No design system changes. Re-uses existing tokens (`sos`, `primary`, `muted`, semantic colors), existing data (`holarchelp_incidents`, offers, locations, `SosLiveMap`, `EmergencyPatientContext`, `HospitalPicker`, `TriageControls`). No DB migrations.

## Routing

Replace the single `ProviderRoutes` switch with role-aware routing.

```text
/provider/*  →  detect providerType  →  redirect to /provider/hospital  or  /provider/ambulance
/provider/hospital/*      HospitalOpsLayout
  index                   HospitalOpsDashboard (Emergency Queue)
  incoming                IncomingAmbulancesScreen
  triage                  TriageScreen
  admissions              AdmissionsScreen
  capacity                ErCapacityScreen
  timeline                IncidentTimelineScreen
  incident/:id            HospitalIncidentConsole (existing)
  profile                 ProviderProfile (existing)
/provider/ambulance/*     AmbulanceOpsLayout
  index                   AmbulanceOpsDashboard (Live SOS feed)
  incoming                IncomingSosScreen
  navigation              NavigationScreen (full-screen SosLiveMap)
  hospitals               HospitalsDirectoryScreen
  history                 IncidentHistoryScreen
  team                    TeamStatusScreen
  incident/:id            AmbulanceIncidentConsole (existing)
  profile                 ProviderProfile (existing)
```

`ProviderDashboard.tsx` becomes a small redirector. `ProviderLayout.tsx` is retained only as the gate wrapper (`ProviderGate` + `HospitalInboundListener`) that renders the right sub-layout based on `providerType`.

## Hospital Emergency Operations Interface

New files under `src/modules/holarchelp/pages/provider/hospital/`:

- `HospitalOpsLayout.tsx` — app shell with:
  - **Left sidebar** (shadcn `Sidebar`, `collapsible="icon"`): Emergency Queue, Incoming Ambulances, Triage, Admissions, ER Capacity, Incident Timeline. Brand block at top ("HolarcHelp · Hospital Ops") in `sos` accent. Profile + Sign out pinned to footer.
  - **Top bar**: live counters fed by a single `useHospitalOpsStats` hook — Active emergencies, Incoming ambulances, ICU capacity (from `holarchelp_hospitals.icu_beds_available`), Emergency alerts (unread `notifications` of type `hospital_inbound_patient`). Connectivity dot + clock on the right.
  - Main `<Outlet />` is full-width (no max-w-4xl), grid-friendly.
- `HospitalOpsDashboard.tsx` — Live Emergency Queue table: Patient · ETA · Severity (color chip) · Ambulance · Incident type · Status. Row click → `incident/:id`. Realtime via `postgres_changes` on `holarchelp_incidents` filtered by `destination_hospital_id`.
- `IncomingAmbulancesScreen.tsx` — card list of ambulances en route. Uses `useLiveProviderLocation` + `SosLiveMap` in `hospital` mode per row to show route + ETA chip. Confirm/decline destination buttons.
- `TriageScreen.tsx` — Kanban columns: Incoming · Awaiting arrival · Arrived · In triage · Admitted. Drag/click to advance using existing `holarchelp_set_incident_status` RPC and `TriageControls`.
- `AdmissionsScreen.tsx` — list of patients with `at_hospital` / `completed` status, link to existing `hospital_admissions` workflow.
- `ErCapacityScreen.tsx` — editable ICU beds, trauma bays, ER load (writes to `holarchelp_hospitals` capacity fields the owner already has access to).
- `IncidentTimelineScreen.tsx` — chronological feed from `holarchelp_incident_events` for this hospital.
- Pre-arrival panel + `EmergencyPatientContext` + SOS voice clip continue to live inside `HospitalIncidentConsole` (already built); we just deep-link to it from the queue.

## Ambulance / ER Dispatch Interface

New files under `src/modules/holarchelp/pages/provider/ambulance/`:

- `AmbulanceOpsLayout.tsx` — dispatch shell:
  - **Left sidebar**: Active Incidents, Incoming SOS, Navigation, Hospitals, Incident History, Team Status.
  - **Top bar**: Current active incident chip (click → console), Team status (on shift / off), Vehicle status (available / dispatched / out of service — local state persisted per user), Connectivity dot.
  - Main area is full-width, dark-tinted operational surface (uses existing `bg-muted/30` + `border` tokens, no new colors).
- `AmbulanceOpsDashboard.tsx` — Live SOS feed table: Incident type · Priority · Patient · Distance · ETA · Response status. Realtime on `holarchelp_incidents` where `status in ('open','reopened','assigned')`.
- `IncomingSosScreen.tsx` — large priority-sorted cards for `open`/`reopened` only, with a single big **Accept Incident** button calling `holarchelp_accept_incident`.
- `NavigationScreen.tsx` — full-bleed `SosLiveMap` in `ambulance` mode for the current assigned incident, with the Incident Action Panel docked to the right (Accept · En Route · Arrived · Patient Loaded · Select Hospital · Arrived at Hospital · Resolve). Buttons call `holarchelp_set_incident_status` and `HospitalPicker` for destination.
- `HospitalsDirectoryScreen.tsx` — searchable list of approved hospitals with capacity, distance (from current GPS), and "Send ETA" action. Selecting a hospital sets `destination_hospital_id`, which already triggers `notify_hospital_inbound`.
- `IncidentHistoryScreen.tsx` — completed incidents for this provider.
- `TeamStatusScreen.tsx` — `holarchelp_ambulance_members` list with shift toggles (local-first; persisted later).
- `AmbulanceIncidentConsole.tsx` (existing) is reused for `incident/:id` and gets the Incident Action Panel + Patient Emergency Profile (`EmergencyPatientContext`) + SOS voice clip already wired in.

## Shared ecosystem behaviour

The two interfaces operate on the same rows, so the existing workflow already chains end-to-end:

```text
Patient SOS  →  appears in Ambulance Live Feed (open)
Accept       →  status=assigned, hides from other ambulances
Select Hospital → destination_hospital_id set → notify_hospital_inbound trigger
                → hospital top-bar counter ticks + queue row appears + toast
En Route / Arrived / Patient Loaded / At Hospital / Resolve
                → mirrored in Hospital Triage Kanban via realtime
```

No new RPCs needed. We rely on the existing `holarchelp_accept_incident`, `holarchelp_set_incident_status`, `holarchelp_patient_pick_provider`, `notify_hospital_inbound` trigger, and `holarchelp_provider_locations` stream.

## Technical notes

- Use shadcn `Sidebar` with `SidebarProvider`, `collapsible="icon"`, active route via `NavLink`. Sidebar trigger pinned in each top bar so collapse works on tablets.
- Stats hooks (`useHospitalOpsStats`, `useAmbulanceOpsStats`) wrap React Query + a single realtime channel each; subscribed once at layout level.
- All status colors come from existing tokens: `sos`, `destructive`, `primary`, `accent`, `muted`. Severity chip uses the existing severity color map already used in `HolarcHelpIncidentDetail`.
- `ProviderRoutes` becomes:
  ```tsx
  <Routes>
    <Route element={<ProviderGate><HospitalInboundListener/><Outlet/></ProviderGate>}>
      <Route index element={<ProviderRedirect/>}/>
      <Route path="hospital/*" element={<HospitalOpsLayout/>}>…</Route>
      <Route path="ambulance/*" element={<AmbulanceOpsLayout/>}>…</Route>
    </Route>
  </Routes>
  ```
- Old `ProviderDashboard.tsx` + `ProviderIncidentDetail.tsx` are deleted (replaced by role-specific consoles already in tree).

## Files

Create (12):
- `routes-provider.tsx` (rewrite)
- `pages/provider/ProviderRedirect.tsx`
- `pages/provider/hospital/HospitalOpsLayout.tsx`
- `pages/provider/hospital/HospitalOpsDashboard.tsx`
- `pages/provider/hospital/IncomingAmbulancesScreen.tsx`
- `pages/provider/hospital/TriageScreen.tsx`
- `pages/provider/hospital/AdmissionsScreen.tsx`
- `pages/provider/hospital/ErCapacityScreen.tsx`
- `pages/provider/hospital/IncidentTimelineScreen.tsx`
- `pages/provider/ambulance/AmbulanceOpsLayout.tsx`
- `pages/provider/ambulance/AmbulanceOpsDashboard.tsx`
- `pages/provider/ambulance/IncomingSosScreen.tsx`
- `pages/provider/ambulance/NavigationScreen.tsx`
- `pages/provider/ambulance/HospitalsDirectoryScreen.tsx`
- `pages/provider/ambulance/IncidentHistoryScreen.tsx`
- `pages/provider/ambulance/TeamStatusScreen.tsx`
- `hooks/useHospitalOpsStats.ts`
- `hooks/useAmbulanceOpsStats.ts`

Edit (2):
- `pages/provider/HospitalIncidentConsole.tsx` — render inside `HospitalOpsLayout` outlet (remove its own chrome).
- `pages/provider/AmbulanceIncidentConsole.tsx` — same, render inside `AmbulanceOpsLayout` outlet.

Delete (2):
- `pages/provider/ProviderLayout.tsx`
- `pages/provider/ProviderDashboard.tsx`
- `pages/provider/ProviderIncidentDetail.tsx`

No DB migrations, no new edge functions, no new design tokens.
