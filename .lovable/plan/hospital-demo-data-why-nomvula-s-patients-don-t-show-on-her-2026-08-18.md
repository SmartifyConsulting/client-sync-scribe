# Hospital demo data + why Nomvula's patients don't show on her shift

## Why her assigned patients aren't visible on Shifts

Verified in the database and the code:

- Nomvula (nurse `bd493577…`) has 5 shifts in General A, one in progress, and she is the assigned nurse on 5 General A admissions. So the data is there.
- The My Shift screen renders **two different layouts**. For doctors it shows "Upcoming & current shifts" **and** a "My patients" panel. For nurses (`isNurse === true`) it renders **only** the calendar and returns before the "My patients" panel — so a nurse can never see her patients on that screen. That is the whole reason it looks empty.
- Secondary issue: every `hospital_nurse_assignments` row has `shift_id = null`, so even if the panel rendered, patients could not be tied to a specific shift — only to the nurse.

### Fix

1. Show the "My patients" panel for nurses too, underneath the calendar (keep the nurse calendar as-is).
2. Make the panel shift-aware: when a shift is selected/current, list the patients in that shift's ward that she is assigned to, with her care tasks, bed number and attending doctor; clicking a name opens Patient Overview.
3. Link the demo nurse assignments to her current shift (`shift_id`) so the "this shift" grouping is real, not inferred.

## Demo data for the hospital end-to-end workflow

Holarc General Hospital currently has: ICU (3 patients), General A (8), General B (1), Maternity (1), Paediatrics (1), ER/Trauma (0 patients, 6 bays), Theatre Room A (no beds, no patients). There is no High Care ward at all, and Trauma Bays only shows live SOS incidents routed to the hospital.

Seed (all `is_sample = true`, idempotent, existing patient records reused so names click through to charts):

- **High Care** — new ward, 8 beds, 5 admissions stepping down from ICU/Theatre, with vitals trends, active medications and nursing notes.
- **ICU** — top up to 6 ventilated/high-acuity patients, hourly observations over the last 24h, infusions, ICU progress notes, intensivist as attending doctor.
- **Theatre Room A** — beds + a theatre list for today and tomorrow: pre-op patients in General A/High Care booked for procedures, intra-op status and post-op recovery notes, surgeon + anaesthetist as attending doctors.
- **Trauma Bays / ER** — 4 arrivals across bays 1–4: two brought in by Renken ambulance as incidents routed to the hospital (so bay assignment, severity and handover status populate the Trauma Bays screen), two walk-ins, each triaged and then either admitted to ICU/High Care/Theatre or discharged.
- **Staffing** — nurse and doctor shifts covering ICU, High Care, Theatre and ER for the current week, with two colleagues clocked in now so handover panels are populated.
- **Flow linkage** — the same patients appear along ER → Theatre → ICU → High Care → General A → discharge, with ward transfer rows so the end-to-end journey can be demonstrated on one patient.

## Technical notes

- Frontend: `MyShiftScreen.tsx` — render the patients panel for nurses; derive patients from the selected/current shift's `ward_id` plus `hospital_nurse_assignments` for her nurse ids.
- Migration: insert High Care ward + beds, admissions, `hospital_attending_doctors`, `hospital_nurse_assignments` (with `shift_id` set), `admission_vitals`, `admission_medications`, `admission_progress_notes`, `hospital_ward_transfers`, `hospital_staff_shifts`, and ER `holarchelp_incidents` with `assigned_trauma_bay` / `handover_status`, all guarded with `NOT EXISTS`.
- No new patient records are created; existing `patients` rows are admitted.
