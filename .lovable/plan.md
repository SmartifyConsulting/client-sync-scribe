# Emergency Response Ecosystem — Role-Specific Operational Interfaces

The SOS pipeline (patient triggers → dispatch → offers → ambulance accepts → status updates → hospital destination → admission) already exists end-to-end. What's missing is a **proper hospital-side experience** and an **operational, mission-critical layer** on top of the existing ambulance provider portal. This plan extends — not redesigns — the current Holarc UI to deliver that.

No aesthetic redesign. Reuse: `Sidebar`, `Card`, `Button`, tab patterns, teal/red tokens, existing `LiveMap`, `IncidentTimeline`, `EtaCountdown`, `IncidentPhotos`, `IncidentVoiceNoteRecorder`, `ProviderGate`, `useProviderAccess`.

---

## 1. Role routing split

Today `/provider/*` serves both ambulance and hospital users with the same dashboard. Split into role-aware views behind one shared `ProviderLayout`:

- `/provider` → role router → renders `AmbulanceDashboard` or `HospitalDashboard` based on `providerType` from `useProviderAccess`.
- `/provider/incident/:id` → role router → `AmbulanceIncidentConsole` or `HospitalIncidentConsole`.
- Keep `/provider/profile` shared.

No new auth surface — existing `hospital_staff` / `ambulance_staff` roles and RLS already cover this.

---

## 2. Ambulance Dispatch Console (extends current ProviderDashboard)

Operational dashboard with three live panels driven off existing realtime subscriptions:

- **Active mission strip** (top) — the one incident this crew currently owns, with big status, ETA countdown, destination hospital, and quick "Open console" button.
- **Open SOS queue** — sortable by severity then distance, Accept/Decline inline, locks via existing `holarchelp_accept_incident` RPC. Adds columns: severity, conscious/breathing flags, distance (from `holarchelp_incident_offers.distance_km`), age.
- **Live board** — incidents locked by others, read-only with status badges so crews see ecosystem activity.

Header KPI row: Open SOS / My Active / Avg accept time today / Completed today.

### Ambulance Incident Console (`AmbulanceIncidentConsole`)
Replaces today's `ProviderIncidentDetail` with a denser operational layout:

- Left column: `LiveMap` (patient + ambulance), status stepper (`accepted → en_route → arrived → patient_collected → en_route_to_hospital → at_hospital → completed`), ETA setter, "Unable to continue" release.
- Right column: **Emergency Patient Context Panel** (see §4), voice clip player, AI emergency summary, pre-arrival notes (free-text save → `holarchelp_incident_events` event).
- **Hospital selector with capacity indicators** — replaces today's plain `<Select>`. Lists approved hospitals filtered by distance, shows `accepting_patients`, ER capacity (new field, see §5), tier, distance. Picking one sets `destination_hospital_id` AND inserts a `hospital_alert` notification for hospital staff.
- New status `en_route_to_hospital` between `patient_collected` and `at_hospital` (extend CHECK constraint).

---

## 3. Hospital ER Console (new)

This is the biggest gap today. Three views:

### 3a. Hospital Dashboard (`HospitalDashboard`)
- **Incoming queue** — list of incidents where `destination_hospital_id = my hospital` and `status IN (assigned, en_route, patient_collected, en_route_to_hospital, at_hospital)`. Each row: triage badge, ETA countdown, ambulance company, patient short context, current transport status, "Prepare admission" CTA.
- **In triage** — admissions in progress (joins existing `hospital_admissions` table where `hospital_provider_id = mine`).
- **Capacity widget** — current ER load + toggle for `accepting_patients` and editable `er_capacity_status` (Green / Yellow / Red).
- KPI row: Incoming / Awaiting arrival / In triage / Admitted today / Avg door-to-triage.

### 3b. Hospital Incident Console (`HospitalIncidentConsole`)
Read-mostly view of an inbound incident:
- Live ambulance position + ETA + transport status.
- Emergency Patient Context Panel (§4).
- Voice clip, AI emergency summary, ambulance pre-arrival notes (from events).
- **Triage assignment** controls: priority (ESI 1–5 / "Resus, Emergent, Urgent, Less urgent, Non-urgent"), assigned bay, intake nurse.
- **Status controls** (hospital-side only): `incoming → awaiting_arrival → arrived → in_triage → admitted → escalated`. Stored in a new `holarchelp_hospital_admission_status` column on `holarchelp_incidents` plus events. The ambulance-side `at_hospital`/`completed` are independent and continue to live in the existing `status` field.
- "Open admission" → routes to existing hospital admission editor seeded with patient + incident context.

### 3c. Hospital Profile / Capacity
Extend existing `ProviderProfile` for hospitals with `er_capacity_status` and `er_beds_available`.

---

## 4. Emergency Patient Context Panel (shared component)

New `src/modules/holarchelp/components/EmergencyPatientContext.tsx`, used by both ambulance and hospital incident consoles. Pulls only emergency-relevant fields under existing RLS (assigned provider has incident-scoped access already):

- Name, age (derived from DOB), gender
- Blood type
- Allergies
- Chronic conditions
- Active medications (latest active prescriptions)
- Emergency contacts (name + phone)
- AI emergency summary (regenerated on incident open via existing Lovable AI, cached on `holarchelp_incidents.ai_emergency_summary`)
- SOS voice clip
- Linked healthcare providers (names only)

Access stays emergency-contextual: the panel only renders when caller `is_ambulance_staff` or `is_hospital_staff` for the assigned/destination provider on this incident — enforced by a SECURITY DEFINER RPC `get_emergency_patient_context(_incident_id)` so we never relax patient-table RLS.

---

## 5. Shared SOS Incident System polish

Already exists; add the few missing pieces:

- New status `en_route_to_hospital` (migration: extend status CHECK).
- New columns on `holarchelp_incidents`: `ai_emergency_summary text`, `hospital_admission_status text`, `triage_priority text`, `triage_assigned_at timestamptz`, `admitted_at timestamptz`, `escalated_at timestamptz`, `pre_arrival_notes text`.
- New columns on `holarchelp_hospitals`: `er_capacity_status text default 'green'`, `er_beds_available int`.
- Notification type `hospital_inbound_patient` inserted when ambulance sets `destination_hospital_id` (trigger or RPC).
- Single-claim guarantee preserved via existing RPCs.

---

## 6. Realtime hooks

Reuse the existing `supabase.channel` pattern from `ProviderDashboard`/`ProviderIncidentDetail`. Add:

- `HospitalDashboard` subscribes to `holarchelp_incidents` filtered by `destination_hospital_id`.
- `HospitalIncidentConsole` subscribes to `holarchelp_incidents`, `holarchelp_locations`, `holarchelp_incident_events` for that incident.
- Global `SosAlertListener` already covers contact-side alerts; add a `HospitalInboundListener` mounted inside `ProviderLayout` that toasts when a new inbound patient is routed to this hospital.

---

## 7. Accountability / Audit

All actions already write to `holarchelp_incident_events`. Add events: `destination_set`, `hospital_notified`, `triage_assigned`, `admission_started`, `escalated`. The admin accountability view (`holarchelp_provider_accountability`) already aggregates per provider; extend to surface door-to-triage and triage-to-admission times in `HolarcHelpAccountability` admin page.

---

## 8. File plan

New:
- `src/modules/holarchelp/pages/provider/AmbulanceDashboard.tsx`
- `src/modules/holarchelp/pages/provider/AmbulanceIncidentConsole.tsx`
- `src/modules/holarchelp/pages/provider/HospitalDashboard.tsx`
- `src/modules/holarchelp/pages/provider/HospitalIncidentConsole.tsx`
- `src/modules/holarchelp/components/EmergencyPatientContext.tsx`
- `src/modules/holarchelp/components/HospitalPicker.tsx` (capacity-aware)
- `src/modules/holarchelp/components/TriageControls.tsx`
- `src/modules/holarchelp/components/HospitalInboundListener.tsx`

Edited:
- `src/modules/holarchelp/routes-provider.tsx` (role router)
- `src/modules/holarchelp/pages/provider/ProviderLayout.tsx` (mount inbound listener, role-aware nav label)
- `supabase/functions/dispatch-sos/index.ts` (notify destination hospital on set)

Deleted/retired:
- `ProviderDashboard.tsx` and `ProviderIncidentDetail.tsx` become thin role routers re-exporting the new screens (or removed once routing switches over).

Migrations:
- Extend status CHECK + add columns listed in §5.
- Create RPC `get_emergency_patient_context(_incident_id uuid)` (SECURITY DEFINER).
- Trigger or RPC for `hospital_inbound_patient` notifications.

---

## Out of scope (per brief)

- No hospital "full patient lifecycle" UI — we stop at admitted/escalated handoff.
- No new design system, no new color tokens, no animation overhaul.
- No payment/subscription changes.
- No changes to patient-facing SOS UI beyond what already exists.

Ready to implement on approval.