## Scope

Three focused changes — UI/data-display plus shared map integration. No DB schema changes beyond a tiny live-location table.

### 1. Polish ambulance / ER / hospital operational consoles

Files exist as scaffolds (`AmbulanceDashboard`, `AmbulanceIncidentConsole`, `HospitalDashboard`, `HospitalIncidentConsole`). Build them out to feel operational and mission-critical:

- **AmbulanceDashboard** — sticky active-mission strip (red when active), open SOS queue (sortable by severity → distance, Accept/Decline), live board with status chips and last-event timestamps.
- **AmbulanceIncidentConsole** — status stepper (Acknowledged → En route → On scene → Patient collected → En route to hospital → At hospital → Closed), `HospitalPicker` (capacity + distance), pre-arrival notes, `EmergencyPatientContext` panel, voice-clip player, **shared live map** showing patient pin + own vehicle pin + selected hospital pin with ETA.
- **HospitalDashboard** — incoming inbound queue (ETA countdown, triage badge), in-ER admissions board, ER capacity widget (`er_capacity_status` green/amber/red + beds-available stepper).
- **HospitalIncidentConsole** — inbound patient header (ambulance ID, ETA), `TriageControls` (ESI 1–5, bay assignment), pre-arrival notes (read-only), `EmergencyPatientContext` with allergies + meds highlighted, admission status stepper, "Open admission" CTA → existing hospital editor, **shared live map** showing inbound ambulance position + patient origin + own hospital pin.
- Reuse existing tokens / tabs / accordions / teal-border standards.

### 2. Shared Google Maps integration (ecosystem-wide)

Every role in the SOS ecosystem (patient, ambulance, hospital, admin) views the **same** map component with the **same** data — only the camera focus and interaction surface differs by role.

- **New component** `src/modules/holarchelp/components/SosLiveMap.tsx`
  - Uses `@vis.gl/react-google-maps` (`<APIProvider>` + `<Map>` + `<AdvancedMarker>`).
  - Loads the JS API via shared key (see secret below).
  - Props: `incidentId`, `mode: "patient" | "ambulance" | "hospital" | "admin"`, optional `height`.
  - Renders pins: patient origin (red pulse), assigned ambulance (live, blue), selected/destination hospital (green building), plus other listed responders in admin mode.
  - Draws driving-route polyline ambulance→patient (pre-collection) then ambulance→hospital (post-collection) using the Google **Routes API** via an edge proxy (avoids exposing the key client-side for billing-heavy calls and lets us cache ETAs).
  - Shows ETA chip (`X min, Y km`) refreshed every 30 s while incident is active.
  - Auto-fits bounds to relevant pins; recentre button per role.

- **Live location pipeline**
  - New tiny table `holarchelp_provider_locations` (one row per `incident_id` × `provider_id` × `provider_kind`, columns: `lat`, `lng`, `heading`, `speed`, `recorded_at`).
  - RLS: writable only by the ambulance user assigned to the incident; readable by the patient on the incident, the assigned hospital, and admins. (Uses the existing `get_emergency_patient_context` access checks pattern.)
  - **AmbulanceIncidentConsole** runs `navigator.geolocation.watchPosition` while incident is active and upserts to the table every ~10 s.
  - **SosLiveMap** subscribes via `supabase.channel('postgres_changes')` on that table filtered by `incident_id` to move the ambulance pin in real time.

- **Routes / ETA**
  - New edge function `routes-eta` (`supabase/functions/routes-eta/index.ts`) — POST `{ origin, destination }` → returns `{ duration_seconds, distance_meters, polyline }` via Google Routes API `computeRoutes` (server-side key).
  - Verifies caller JWT and that caller participates in the incident before computing.
  - Called by `SosLiveMap` whenever ambulance position or destination changes (debounced 20 s).

- **Map placement** — `SosLiveMap` is dropped into:
  - Patient SOS detail view (existing `HolarcHelpIncidentDetail`) — replaces current placeholder map.
  - `AmbulanceIncidentConsole` (full-width hero block).
  - `HospitalIncidentConsole` (full-width hero block).
  - Admin `HolarcHelpProviderIncidents` detail (shows full constellation).

- **Secret required** — `GOOGLE_MAPS_API_KEY` (server-side, used by `routes-eta`) and `VITE_GOOGLE_MAPS_BROWSER_KEY` (HTTP-referrer-restricted browser key for JS API). Plan flags this; secrets will be requested only after user approves the plan.

### 3. Admin → Providers tables: show linked user email

In `src/pages/admin/HolarcHelpProviders.tsx` the "Contact" cell currently shows `contact_email` (org email). For **Hospitals, Ambulances, Pharmacies**, replace the displayed email with the **login email of the linked user** (`user_id`).

- New admin-only edge function `admin-get-user-emails` → takes `user_ids[]`, returns `{ user_id → email }` via service role (verifies admin via `has_role`). Avoids exposing `auth.users` to the client.
- Render: user email (primary, bold) with small "Org: {contact_email}" beneath when different. Phone stays. Falls back to `contact_email` if no `user_id`.

### 4. Mobile profile avatar — admin entry + tester list updates

In `src/components/layout/TopBarIcons.tsx`:

- Add an **"Admin"** link in the avatar popover (visible only when `isAdmin === true`), routing to `/admin`. Placed above "Settings". Same item shown on the mobile breakpoint (the avatar popover is the mobile profile surface).
- **Update `TEST_PROFILES`**:
  - Remove `xtina@smartify.co.za` / "Xtina".
  - Add `christina@smartify.co.za` / "Christina" as a Doctor (confirm address if different).

### Technical notes

- New edge functions: `admin-get-user-emails`, `routes-eta`.
- New table: `holarchelp_provider_locations` (only schema change in this plan).
- New shared component: `SosLiveMap` (used by all four roles — single source of truth for the map UX).
- Library to add: `@vis.gl/react-google-maps`.
- No design tokens added; reuse existing teal/red operational palette.

### Out of scope

- Turn-by-turn navigation, traffic-aware re-routing UI, voice guidance.
- Offline map tiles.
- Patient-side SOS flow changes beyond swapping the placeholder for `SosLiveMap`.

### Files

**Edit**
- `src/modules/holarchelp/pages/provider/AmbulanceDashboard.tsx`
- `src/modules/holarchelp/pages/provider/AmbulanceIncidentConsole.tsx`
- `src/modules/holarchelp/pages/provider/HospitalDashboard.tsx`
- `src/modules/holarchelp/pages/provider/HospitalIncidentConsole.tsx`
- `src/modules/holarchelp/pages/HolarcHelpIncidentDetail.tsx` (drop in `SosLiveMap`)
- `src/pages/admin/HolarcHelpProviderIncidents.tsx` (drop in `SosLiveMap`, admin mode)
- `src/pages/admin/HolarcHelpProviders.tsx`
- `src/components/layout/TopBarIcons.tsx`

**Create**
- `src/modules/holarchelp/components/SosLiveMap.tsx`
- `supabase/functions/routes-eta/index.ts`
- `supabase/functions/admin-get-user-emails/index.ts`
- Migration for `holarchelp_provider_locations` + RLS policies.
