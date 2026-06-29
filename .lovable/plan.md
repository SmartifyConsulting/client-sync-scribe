## 1. Merge the duplicate Kennedy patient records

Canonical record = `projectmanager@smartify.co.za` (so the user can keep logging in and receive test emails). The other record (`sharon.kennedy@testmail.com`) is archived.

Steps:

- Reassign every FK pointing at the `sharon.kennedy@testmail.com` patient/user onto the projectmanager record:
  - `prescriptions`, `medication_adherence`, `prescription_pill_references`, `prescription_renewal_requests`, `approved_daily_medications`
  - `documents`, `health_photos`, `image_comparisons`, `session_drawings`
  - `sessions`, `appointments`, `appointment_requests`, `visit_ratings`
  - `hospital_admissions` and `admission_*` child tables, `referral_doctors`
  - `patient_rewards`, `patient_streaks`, `doctor_patient_access`, `doctor_patient_checkins`, `patient_invitations`, `patient_profile_shares`, `patient_hidden_doctors`
  - `holarchelp_incidents` (`user_id`, `triggered_by_user_id`), `holarchelp_emergency_contacts`
  - `notifications`, `messages`, `todos`
- For columns only populated on the testmail record, merge into the projectmanager row with `COALESCE(projectmanager_value, testmail_value)` so no clinical history is lost (allergies, surgeries, height/weight, pharmacy, contacts, etc.).
- Rename the canonical row from `Sharon Elise Kennedy (merged)` to `Sharon Elise Kennedy` — drop the "(merged)" suffix.
- Archive the testmail record:
  - Update its `name` to `Sharon Kennedy (archived)` and set `status = 'archived'`.
  - Disable the `sharon.kennedy@testmail.com` auth user (ban via `auth.users.banned_until = 'infinity'`) so it can no longer log in but historical audit trails are preserved.
  - Do NOT hard-delete that auth user, so any old audit/event rows keep their FK.

## 2. Stop notifying doctors about skipped/missed medication

- Remove the "Notify doctor" block in `MedicationAdherenceTab.tsx` (lines 231–267).
- `check-missed-medications` only notifies the patient + emergency/NOK contacts — leave it.
- `PillBaselineCapture`'s skip-notify panel keeps only Emergency contact / Next of kin / No one. No doctor option.

## 3. Seed hospitals around Johannesburg

Insert ~12 approved Johannesburg-area hospitals into `holarchelp_hospitals` with real lat/lng and `accepting_patients = true`:

Charlotte Maxeke Academic, Helen Joseph, Chris Hani Baragwanath, Rahima Moosa Mother & Child, Netcare Milpark, Netcare Garden City, Netcare Linksfield, Life Fourways, Life Brenthurst, Life Roseacres, Netcare Sunninghill, Wits Donald Gordon. Each tagged in `notes` as seed data so the team can distinguish them from real registrations.

## 4. Human-readable incident number end-to-end

- Migration: add `incident_number text unique` to `holarchelp_incidents`, with a sequence-backed default `INC-2026-000123` (year + zero-padded sequence) and a `BEFORE INSERT` trigger to assign it. Backfill existing rows.
- Surface the new `incident_number` everywhere the UUID slice is shown today:
  - Patient `HolarcHelpIncidentDetail` header
  - Provider `IncomingSosScreen`, `ParamedicAcceptDialog`, `AmbulanceIncidentConsole`, `NavigationScreen`
  - Hospital `IncomingAmbulancesScreen`, `TriageScreen`, `AdmissionsScreen`, `IncidentTimelineScreen`
  - Public tracking link copy (`PublicTrack`) and any SMS/email body that currently includes the short id

## 5. SOS → Accept → Hospital selection → Live route

This wires the missing flow the user described.

**5a. ER Provider accepts → must pick destination hospital**

`ParamedicAcceptDialog` becomes a two-step accept flow:

1. Confirm ambulance + crew (already there).
2. Required step: pick the destination hospital from `HospitalPicker`, filtered to hospitals with `accepting_patients = true` and ordered by distance from the incident.

On confirm the dialog writes in one update:
- `assigned_paramedic_user_id`, `assigned_ambulance_id`, `accepted_at`, `status = 'assigned'`
- `destination_hospital_id` = the chosen hospital
- Initial `eta_minutes` from current ambulance GPS via the existing Google Maps gateway helper

It also:
- Inserts a `notifications` row for the patient: `type = 'sos_accepted'`, body includes the incident number + paramedic name + ambulance call sign.
- Inserts a `holarchelp_incident_events` row `accepted` for the timeline.
- Inserts a second `notifications` row addressed to the destination hospital's owner/admin and emits a realtime event the hospital screens are already subscribed to — so the chosen hospital sees the incident appear in its **Incoming Ambulances** queue immediately, displayed with the same `incident_number` shown to the paramedic and patient.

**5b. Patient side — `HolarcHelpIncidentDetail`**

- Subscribe in realtime to the incident row (`assigned_paramedic_user_id`, `status`, `eta_minutes`, `provider_latitude/longitude`, `destination_hospital_id`).
- On `open` → `assigned`: sticky toast + inline banner reading `Accepted by {Paramedic} · {Ambulance call sign} · heading to {Hospital name}` plus ETA.
- `SosLiveMap` becomes visible on acceptance, drawing the route from the ambulance's current position to the patient (Google Maps Directions via the gateway). Distance and ETA come straight from the Routes API response and refresh every time `provider_location_updated_at` changes.
- Live countdown timer ticking down from `eta_minutes`, reset whenever a new ETA arrives.
- Status display ladder:
  - `assigned` → "Ambulance accepting" + ETA
  - `en_route` → live moving marker + km + min remaining
  - `arrived` → "Ambulance has arrived"
  - `patient_collected` / `en_route_to_hospital` → route switches to the chosen hospital, countdown restarts to hospital ETA
  - `at_hospital` → "Arrived at {Hospital}"

**5c. Provider side — `NavigationScreen`**

Already pushes provider GPS. Confirm it continues to write `provider_latitude/longitude` + recomputed `eta_minutes` every 10s while `status in (assigned, en_route, en_route_to_hospital)`, and that the destination flips from patient pin to hospital pin when status becomes `patient_collected`.

**5d. Hospital side — `IncomingAmbulancesScreen`**

- Add an `incident_number` column to the card header.
- Show `accepted_at`, paramedic name, ambulance call sign, current ETA, and live distance — same data the patient sees.
- Already subscribes to `holarchelp_incidents` realtime; only the new column and header text change.

## Technical details

- All schema changes are migrations: `incident_number` column + sequence + trigger + backfill; no destructive ALTERs.
- Patient merge runs as ordered `UPDATE ... SET patient_id = canonical WHERE patient_id = duplicate` per table in one migration, then a `COALESCE` field merge, then archive of the testmail patient row and ban of its auth user.
- Joburg hospital seed is a single bulk insert.
- ETA/route uses the existing Google Maps gateway helper from `SosLiveMap` — no new secrets.
- `holarchelp_incidents` is already in `supabase_realtime`; we just add a focused channel in `HolarcHelpIncidentDetail` if missing and one in the hospital incoming screen.
- All UI edits stay inside `src/modules/holarchelp/` and `src/features/rewards/components/MedicationAdherenceTab.tsx`.

## Out of scope

- Redesigning provider screens (already done).
- Multi-paramedic auctioning — single accept-first model retained.
- Patient-initiated cancellation flow — already exists via `holarchelp_incident_cancellations`.
