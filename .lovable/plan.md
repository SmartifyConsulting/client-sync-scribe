# Populate Holarc General Hospital and Renken ER with linked demo data

Goal: make both provider portals show a realistic, connected workflow, using patient records that already exist in the database (so the same stay is visible from the patient's own profile).

## Current state (verified)

- Holarc General Hospital has only 1 sample ward ("General Ward"), no beds, 2 nurses, 3 shifts, and a single admission for "Shannon Kennedy" that is **not** linked to any patient record.
- The real patient record is **Sharon Kennedy** (also has a login). Other real patients available: Dean Allie, Samuel Okoli, Georgia Adams, Sarah Mitchell, Stella Chioma, Dennis Ofordum.
- Renken Ambulance Service has 9 vehicles, 21 crew members, 1 paramedic shift, and a mix of incidents (2 open, 2 assigned, 1 en route, 1 patient collected, 1 arrived, 1 at hospital).

## What gets seeded

### Holarc General Hospital

1. Wards: ICU, General A, General B, Maternity, Paediatrics, plus an ER/Trauma area — with bed rows so occupancy percentages are real, not estimated.
2. Inpatients (~10), of which 5 are **linked to real patient records** via `patient_id` / `patient_user_id`:
   - Sharon (Shannon) Kennedy — admitted to ICU after an emergency arrival, primary case for the demo.
   - Dean Allie, Samuel Okoli, Georgia Adams, Sarah Mitchell — general/maternity/paediatric mix, various statuses (admitted, discharge pending, one recent discharge).
   - Remaining beds filled with clearly sample-named patients.
3. For Sharon's admission specifically, a full clinical trail so every hospital tab has content:
   - Attending doctor (Dr Gianna Buttons as primary) and 2 nurse assignments across shifts
   - Vitals series over the last 48 hours
   - Medications, lab results, one imaging study
   - Progress notes and ward-transfer / activity log entries
4. Staff shifts and nurse roster for the current and next shift, so Shifts and Nurses screens populate.
5. ER coordination: 2–3 incoming ambulance incidents destined for Holarc General with triage priority, bay and acceptance status, so the ER Coordination and Trauma Bays boards are not empty.

### Renken Ambulance Service (ER profile)

1. Refresh the incident board so the Dispatch Console has one incident in each stage: open (unassigned), assigned, en route, patient collected, at hospital, plus recent completed jobs for reporting.
2. The **at hospital / patient collected** incident is Sharon Kennedy's transport, with Holarc General as destination hospital — this is the same incident that produced her hospital admission, so the flow reads end to end: SOS → dispatch → transport → ER arrival → ward admission.
3. Crew assignments and vehicle statuses aligned to those incidents (vehicles on active jobs marked assigned, crews on shift).
4. Two active paramedic shifts with crew partners so Crews and Fleet Live show live staffing.
5. Timeline events (`holarchelp_incident_events`) for the active incidents so the incident detail views show progression.

## Technical notes

- All rows written through the data-insert path (no schema changes needed); every seeded row is flagged `is_sample = true` where the column exists so it can be identified and cleaned up later.
- Linked admissions set `patient_id` and `patient_user_id` from the existing `patients` rows so patient-side screens (My Admissions) render the same stay.
- The existing unlinked "Shannon Kennedy" admission is updated in place to point at Sharon Kennedy's real record rather than creating a duplicate.
- Ambulance and hospital records stay on the shared `holarchelp_incidents` model — no duplicated incident data.
- No UI, styling or navigation changes.
