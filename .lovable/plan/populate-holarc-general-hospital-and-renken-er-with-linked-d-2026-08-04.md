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
- No UI, styling or navigation changes from the seeding work itself.

## Additional UI fixes (same turn)

### 1. Vula card height on the doctor dashboard

The Vula promo tile in the stats row is a custom link block with its own `min-h`, so it grows taller than the neighbouring stat cards. Make it fill the row height exactly like the other cards (same min-height and padding rhythm, `h-full`), so all cards in the row line up.

### 2. One consistent document/template rendering surface

Today three surfaces render the same content differently:

- Left "Content" editor in Edit Template — 12pt body, chosen font.
- Right "Content Preview" panel — the shared canvas in compact mode.
- The three-dot "Preview" dialog on a template card — a different preview component with 14px body.

Changes:

- Make the shared canvas the single renderer for all three, so the three-dot Preview dialog shows exactly what the Content Preview panel shows (page-sized, but identical typography).
- Adopt the Content Preview typography as the app-wide default: body at 12pt in both compact and full page modes, same line height and font resolution.
- Header and footer cells currently render at a fixed 9px, which is why letterheads look tiny and out of proportion. Raise them to a proportional size relative to the body (around 10.5pt), with the logo and divider spacing scaled to match.
- The three-dot Preview must resolve known data the same way the editor preview does — practice, doctor and patient tokens, linked header/footer letterhead, signature — so populated fields show real values instead of raw placeholders.

### Technical notes

- Work stays in `src/features/documents/templates/DocumentCanvas.tsx` (font size constants, header/footer sizing), the template preview dialog wiring in `src/pages/Documents.tsx` (switch to the shared canvas and reuse the same token resolution), `TemplateSectionEditor.tsx` (default size alignment), and the Vula tile markup in `src/pages/Dashboard.tsx`.
- No colour or brand changes; typography and sizing only.
