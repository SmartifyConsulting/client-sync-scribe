# Uber-Style SOS Dispatch System

Transforms the existing HolarcHelp SOS into a first-accept dispatch with locking, live tracking, ETA countdown, voice audit logging, and a real-time emergency responders (hospital and ambulance) view.

## What changes

### 1. Database (migration)

Extend `holarchelp_incidents` status lifecycle and lock semantics:

- Drop the `status` CHECK constraint and re-add allowing: `open, assigned, en_route, arrived, patient_collected, at_hospital, completed, reopened, cancelled`.
- Add columns: `patient_collected_at`, `at_hospital_at`, `completed_at`, `destination_hospital_id uuid`, `provider_latitude`, `provider_longitude`, `provider_location_updated_at`.
- Migrate existing rows: `active → open`, `resolved → completed`.
- **First-accept lock** — Postgres function `holarchelp_accept_incident(_incident_id, _provider_id)` (SECURITY DEFINER) that:
  - Verifies caller owns/staffs `_provider_id`.
  - `UPDATE holarchelp_incidents SET assigned_provider_id=_provider_id, status='assigned', accepted_at=now() WHERE id=_incident_id AND assigned_provider_id IS NULL RETURNING id`.
  - If no row returned → raise `'Incident already taken'`.
  - On success: mark this offer `accepted`, mark all other pending offers `superseded`, insert `holarchelp_incident_events` row `event_type='accepted'`.
- Function `holarchelp_release_incident(_incident_id, _reason)` to set status back to `reopened`, clear assignment, log cancellation + event, re-broadcast (re-create pending offers for nearby providers).
- New table `holarchelp_voice_notes` (id, incident_id, user_id, provider_id, audio_url, duration_seconds, transcript, created_at) with RLS: patient/assigned-provider/admin/hospital-of-destination can read; provider staff and patient can insert for their own incidents.
- Add `assigned_provider_id`, `destination_hospital_id`, `provider_latitude/longitude` to `supabase_realtime` publication (already includes incidents table).
- Trigger on every status change → insert into `holarchelp_incident_events` with event_type and actor.
- RLS: hospital staff of `destination_hospital_id` can `SELECT` incident, locations, voice notes, events.

### 2. Patient SOS flow (`HolarcHelpHome.tsx`, `HolarcHelpIncidentDetail.tsx`)

- Insert incident with `status='open'` (not `active`).
- After insert, edge function `dispatch-sos` finds nearby ambulance providers (Haversine on lat/lng, `status='approved'`, `subscription_status='active'`, `accepting_patients=true`, within 25 km) and inserts `holarchelp_incident_offers` rows (`response='pending'`, `distance_km` populated).
- Patient detail screen subscribes to incident updates and shows:
  - **Pre-assignment**: "Finding nearest ambulance…" with spinner + count of pending offers.
  - **Post-assignment**: assigned provider name, ETA countdown (from `eta_minutes` + `last_eta_update`), distance, live ambulance marker on map (driven by `provider_latitude/longitude` updates), status pill.
  - **On `reopened**`: red banner "Your responder is unable to continue. Finding the next available ambulance."
- Map gets a second moving marker for the ambulance.

### 3. Provider dispatch (`ProviderDashboard.tsx`, `ProviderIncidentDetail.tsx`)

- Replace direct `update assigned_provider_id` with `supabase.rpc('holarchelp_accept_incident', ...)`. On error "already taken", toast and refresh.
- Filter incidents by `status='open'` AND offer exists for this provider; show distance + ETA estimate.
- Once any incident is `assigned`, queue card shows responder banner ("Responded to by X · Accepted 14:32 · ETA 4 min") and removes Accept/Decline buttons for non-assigned providers.
- New "Unable To Continue" button on provider detail → calls `holarchelp_release_incident`.
- Status-update buttons mapped to new lifecycle: `Mark en route` → `en_route`, `Arrived on scene` → `arrived`, `Patient collected` → `patient_collected`, `At hospital` → `at_hospital`, `Complete` → `completed`. Each writes an event row.
- Provider broadcasts its location while assigned: extend `useLocationTracking` (or new hook `useProviderLocationTracking`) to update incident `provider_latitude/longitude/provider_location_updated_at` every 4 s.
- Hospital selector for destination on the detail page (lists approved+subscribed hospitals).

### 4. Voice notes (new component `IncidentVoiceNoteRecorder.tsx`)

- Reusable for ambulance/hospital/admin staff on the incident detail page.
- Records via MediaRecorder, uploads to existing `session-audio` bucket under `holarchelp/<incident_id>/<uuid>.webm`, kicks off `transcribe-audio`, inserts `holarchelp_voice_notes` row (user_id, provider_id, duration).
- Display list of voice notes with attribution: "🎤 John Smith — ERA Ambulance · 14:42 PM 12 Jul 2026". Patient sees them on their detail page too.

### 5. Hospital view (new page `HospitalDashboard.tsx` under provider routes)

When provider is a hospital, show inbound incidents where `destination_hospital_id = providerId`:

- Patient name (if shared), assigned ambulance, ETA countdown, live map of ambulance, severity, voice notes, incident events.
- Capacity controls already exist.

### 6. Timeline panel

On both patient and provider detail pages: render `holarchelp_incident_events` chronologically with humanised labels (`SOS triggered · Accepted by ERA · En route · Voice note added · Arrived · Patient collected · At hospital · Completed`).

### 7. Edge functions

- New `dispatch-sos`: input `{ incident_id }`, fetches incident location, scans approved + subscribed ambulance providers, inserts pending offers; respects `accepting_patients=true`.
- New `rebroadcast-sos`: invoked by `holarchelp_release_incident`; same logic but excludes prior providers.

### 8. Map markers (`LiveMap.tsx`)

- Existing red dot = patient (rename in code).
- Add ambulance marker (yellow when assigned/en_route, green when arrived) driven by incident's `provider_latitude/longitude`.
- Hospital markers honour `subscription_status='active'` AND `status='approved'` (already enforced).

## Key files

**Migration**: `supabase/migrations/<timestamp>_sos_dispatch_uber.sql`

**Edge functions**: `supabase/functions/dispatch-sos/index.ts`, `supabase/functions/rebroadcast-sos/index.ts`

**Patient**: `HolarcHelpHome.tsx`, `HolarcHelpIncidentDetail.tsx`, `LiveMap.tsx`

**Provider**: `ProviderDashboard.tsx`, `ProviderIncidentDetail.tsx`, new `HospitalDashboard.tsx`, new `useProviderLocationTracking.ts`

**Shared**: new `IncidentTimeline.tsx`, `IncidentVoiceNoteRecorder.tsx`, `EtaCountdown.tsx`

## Out of scope

- Real Mapbox routing polylines (we use straight-line distance + provider-reported ETA; can be added later).
- SMS/push notifications to providers (relies on realtime + in-app; existing notifications system can be wired in a follow-up).
- Subscription enforcement UI for ambulances (already in DB, surfaced via filtering).