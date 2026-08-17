# Nurse Ward Demo Data — Nomvula Dlamini

Goal: make the nurse workflow fully demonstrable end-to-end on Nomvula's ward (General A, Holarc General Hospital) using existing patient records rather than name-only placeholders.

## Current state (verified)

- Nomvula is rostered to General A (16 beds) and has 5 shifts, one currently in progress.
- General A has 3 admitted patients, but one ("Karabo Sithole") has no link to a patient record, so her name is not clickable through to a patient chart.
- Her ward's admissions have **zero** vitals, medications and progress notes — every nurse working screen is empty.
- Only 2 nurse-to-patient care assignments exist, so "Assigned to me" barely populates.

## What will be added

### 1. Link ward beds to real patient records
Fill General A up to 8 admitted patients by admitting existing demo patient records (e.g. Faith Akeno, Amahle Zulu, Daniel Okafor, Fatima Noor, Chen Wei, Aisha Khan) into free beds GA-01…GA-12, each with `patient_id` set so the nurse can click through to the patient chart. Existing rows keep their beds; the unlinked "Karabo Sithole" row is linked to a real patient record or replaced.

Each admission gets a realistic reason, admitted date within the last 5 days, and an attending doctor row.

### 2. Nurse care assignments
Assign Nomvula as primary nurse on 4 of the 8 patients (and a second nurse on the rest) with care tasks such as 4-hourly observations, IV antibiotics, wound care, mobilisation — so "My patients" vs "Ward patients" reads differently.

### 3. Clinical activity on each admission
For every admitted patient in General A:
- 3–5 vitals rounds over the past 48 hours (HR, BP, SpO2, temp), attributed to Nomvula or a colleague, with one patient trending abnormal so escalation can be shown.
- 2–4 active medications with dosage/frequency (plus one stopped medication).
- 2–3 progress notes across nursing/observation categories, signed with the recording nurse's name.

### 4. Colleagues on shift
Ensure 2–3 other nurses have overlapping General A shifts (day/night/on-call) so the "On shift now" panel and handover story are populated.

All rows are inserted with `is_sample = true` and are idempotent (skipped if the same bed/patient already exists), so re-running is safe.

## Technical notes

- Single migration, insert-only, guarded with `NOT EXISTS` per bed/admission.
- Tables touched: `hospital_inpatient_admissions`, `hospital_attending_doctors`, `hospital_nurse_assignments`, `admission_vitals`, `admission_medications`, `admission_progress_notes`, `hospital_staff_shifts`.
- Patient linkage uses existing `patients.id` values; no new patient records are created.
- Hospital `217bbf9f…`, ward `a0000000-…-0002` referenced by id so the seed cannot miss the wrong ward.
