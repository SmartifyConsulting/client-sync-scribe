## Goal

Build out the Hospital profile into a full inpatient management portal: a dashboard matching the reference layout, plus wards, ward-based admissions with bed numbers and transfers, attending doctors, attending nurses with clock-in/clock-out, staff shift schedules, and an automatic patient activity log.

## What exists today

- `holarchelp_hospitals` — hospital record, with total bed and ICU capacity only (no wards).
- `hospital_admissions` — a doctor-entered clinical history record (free-text hospital name, diagnosis, dates). No wards, beds, occupancy or live status. This stays untouched.
- `hospital_nurses`, `hospital_doctor_affiliations`, `doctor_hospital_affiliations` — staff linked to a hospital.
- `paramedic_shifts` — ambulance-crew only; not reusable for ward staff.
- Hospital portal at `/provider/hospital` with Emergency Queue, Admissions (currently an ER incident list), Dispatch, Fleet Live, Admin.

## New data model

**Wards** — one hospital to many wards: name/number, ward type (General, ICU, Maternity, Paediatric, Surgical, Other), bed capacity, notes. Current occupancy is derived from live admissions, never stored stale.

**Beds** — optional per-ward bed register (bed number, status). Bed numbers can also be free text on an admission so a hospital can start using wards without registering every bed.

**Inpatient admissions** — new records, separate from the existing clinical history: hospital, patient, ward, bed number, admission date/time, discharge date/time, status (Admitted / Discharged / Transferred), reason, source (walk-in, ER incident, ambulance), and a link to the originating emergency incident when one exists.

**Ward transfers** — one timestamped row per move: from ward/bed, to ward/bed, who moved them, reason.

**Attending doctors** — many doctors per admission, one flagged as Primary Attending, the rest consulting; each with assigned and unassigned timestamps.

**Attending nurses** — nurses assigned to an admitted patient for a given shift: the nurse, the admission/patient, the shift it belongs to, care role (Primary Nurse, Support, Specialist), assignment window, and the care tasks they are responsible for (e.g. vitals rounds, medication administration, wound care, observation). Multiple nurses can attend one patient; one nurse attends many patients per shift.

**Shift clock-in / clock-out** — every doctor and nurse shift records scheduled start/end plus actual clocked-in and clocked-out timestamps and a live status (Scheduled, On shift, Completed, Missed). Staff clock in and out from their own screen; the hospital sees who is actually on the floor right now versus merely rostered.

**Staff shifts** — staff member (doctor profile or hospital nurse), role, shift type (Day / Night / On-Call), start and end time, assigned ward.

**Patient activity log** — timestamped entries against the patient: staff member name + role, action type (Vitals Check, Medication Administered, Doctor Consultation, Nursing Care, Admission, Ward Transfer, Ambulance Pickup, Ambulance Drop-off, Discharge, Note), and details.

Access rules: hospital staff and admins can manage records for their own hospital; the patient can read their own admission and activity log; a doctor linked to the patient, or a doctor/nurse attending on the admission, can read and add log entries.

## Automatic activity logging

Database triggers write log entries so nothing is entered twice:
- New inpatient admission → "Admitted to {ward}, bed {n}".
- Ward transfer → "Transferred from {ward A} to {ward B}".
- Attending doctor added or changed → "Dr {name} assigned as primary/consulting".
- Attending nurse assigned or released → "Nurse {name} assigned for {care task} this shift".
- Nurse or doctor clocks in or out → shift event recorded against the ward (and against each patient they attend on that shift).
- Discharge → "Discharged".
- Emergency incident reaching the hospital → "Ambulance drop-off at ER" (hooked into the existing incident status flow).
Manual entries (vitals, medication, consultation and nursing notes) are added from the patient record by on-shift staff.

## Screens

**Hospital Dashboard** (new landing page for the hospital portal, matching the reference)
- Top stat cards: bed occupancy %, admitted patients, ambulances available, staff clocked in now.
- Ward occupancy panel: one coloured progress bar per ward with `used / capacity`.
- Ambulance status panel: each vehicle with an Available / Dispatched / Maintenance pill.
- Recent patient activity feed: latest activity-log entries with time, staff member and action.
- Live-updating via realtime subscriptions, in the existing card/typography style.

**Wards** — list of wards with occupancy; open a ward to see its bed grid, admitted patients with bed numbers, and the doctors and nurses currently clocked in for it. Add, edit and archive wards.

**Admissions** — the current ER-incident view becomes a tabbed screen: *Inpatients* (ward-based admissions, with Admit, Transfer, Assign nurse and Discharge actions) alongside the existing *ER / Incidents* list.

**Shifts** — weekly schedule grid for doctors and nurses, filterable by ward and role, with an "On shift now" summary showing clocked-in versus rostered. Add and edit shifts.

**My Shift** (nurse and doctor view) — the staff member's current and upcoming shifts with a Clock In / Clock Out button, and, once on shift, the list of patients they are attending with each patient's assigned care tasks and a one-tap way to log a completed task (which writes to that patient's activity log).

**Patient profile** — new "Hospital stay" section showing current ward, bed and admission date, all attending doctors with the primary flagged, attending nurses for the current shift with their care responsibilities, transfer history, and a chronological Activity Log timeline.

**Doctor profile** — specialty plus a list of currently assigned inpatients (ward and bed).

**Nurse profile** — current shift and clock status, ward assignment, and the patients they are attending with care tasks.

**Navigation** — hospital sidebar becomes: Dashboard → Emergency Queue → Admissions → Wards → Shifts → Dispatch Dashboard → Fleet Live → Admin.

## Demo data

Seed the existing demo hospital with sample wards (ICU, General Ward A, Maternity, Paediatric), admitted sample patients in beds, attending doctor assignments, attending nurses with care tasks, a week of doctor and nurse shifts including some already clocked in, and a set of activity-log entries so the dashboard and timelines are populated on first load. All seeded patients keep the existing sample marker so it is visibly not real data.

## Technical notes

- Occupancy is always computed from active admissions joined to wards, so capacity numbers can't drift.
- Activity logs are append-only and written by `SECURITY DEFINER` triggers, so an entry is created even when the acting user can't write to the log table directly.
- Shifts reference either a doctor profile or a `hospital_nurses` row, with a constraint ensuring exactly one is set; clock-in/out is guarded so a staff member cannot hold two open shifts at once.
- Nurse assignments hang off both the admission and the shift, so "who was caring for this patient at 03:00" is answerable from history.
- New tables get explicit grants and row-level security policies in the same migration; all UI reads go through the existing Supabase client with realtime channels.
- The build runs in stages: schema first, then dashboard and wards, then admissions/transfers and attending doctors, then shifts with clock-in/out and nurse assignments, then activity log surfaces and demo seed.
