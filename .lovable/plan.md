## Browser-driven test run — 15 scenarios

### Pre-flight findings from the DB

- **Georgia Adams** already exists twice: one patient (`7c12a3…`) and one doctor-shaped profile with no role (`9ceb12…`, specialty "Obstetrician/Gynecologist"). I'll **not** create a third — I'll use the existing patient profile and verify/repair.
- **Sharon Elise Kennedy** exists (`cf9b1d…`); avatar upload will use a generated headshot.
- **Paraskevi Soldatos** exists (`2490a2…`). Allergy + chronic display checks run against her record.
- **Dr Dean Allie** (Orthopaedic) and **Dr Jean Prodromos** (Dentist) exist. **Dr Christina Papadopoulos (cardiologist) is missing** — she will be created through the UI as part of Block 0 below.
- **ZA Private Clinic** (hospital) and **Renken ER Services** (ambulance) both exist and are approved.

### What I need from you before starting

1. **Confirm or create the test login.** Browser uses the preview's current session:
   - A **doctor** account for doctor-side flows.
   - A **patient** account for patient-side flows.
   - You log in once in the preview, then I take over.
2. **Switch the preview to desktop (1280×800).** Doctor flows render the sidebar and calendar properly there; you're currently at 390×844.
3. **Confirm I may use Playwright `setInputFiles` for binary uploads** (avatar, ECG, X-ray).

### Execution sequence

**Block 0 — Seed Dr Christina Papadopoulos via the UI** (new)
1. Sign up a new **doctor** account for "Dr Christina Papadopoulos", specialty **Cardiologist**, through the normal signup form (not via DB). Complete her doctor profile (practice number, doctor number, practice address, mobile, preferred language).
2. From the same flow, also sign her up / create her **patient** profile through the patient signup or "Add as patient" UI so she exists both as a practitioner and as a patient record. Verify the multi-role resolution shows the profile switcher.

**Block A — Patient registration (logged in as doctor)**
1. Open Georgia Adams' existing patient record; complete any missing required fields instead of duplicating. Flag duplicate doctor-shaped Georgia profile.
2. Generate a portrait placeholder → upload as Sharon Kennedy's avatar.
3. Open Paraskevi → add **Shellfish** to allergies → trigger prescription/med-add flow that surfaces allergy warning; capture warning UI.
4. Open Paraskevi's chronic medications list → confirm rendering, sort, line-through for deactivated meds.

**Block B — Doctor assignment**
1. Assign Dean + Jean + **Christina** to Paraskevi via the patient access flow.
2. From each doctor's roster, verify Paraskevi appears.
3. Confirm shared-practice behaviour between Christina and Jean (or Dean + Jean if Christina/Jean don't share one).

**Block C — Emergency flow (logged in as patient with HolarcHelp enabled)**
1. SOS → pick **Renken ER Services** as ambulance; confirm incident locks to that provider.
2. SOS → pick **ZA Private Clinic** as destination hospital; confirm assignment + event log.
3. Verify ambulance-dispatch event timeline (`sos_triggered` → `patient_picked` → `assigned`).

**Block D — Appointments (doctor side)**
1. Book a cardiology appointment for Georgia **with Dr Christina Papadopoulos** (now possible thanks to Block 0).
2. Book a dental cleaning for Paraskevi with Dr Jean Prodromos.
3. Attempt overlapping appointment for the same doctor at the same time; expect constraint trigger / UI guard to block it.

**Block E — Medical records**
1. Generate ECG-strip placeholder → upload to Georgia's documents tagged "ECG report".
2. Add depression-screening notes to Sharon (text-only).
3. Add cholesterol lab result to Paraskevi via Add Lab Result.
4. Generate dental-X-ray placeholder → upload to Paraskevi's documents tagged "Dental X-ray".

### Deliverable

Test report at `/mnt/documents/test-run-2026-05-16.md` with per-scenario pass/fail, screenshot references, and data-hygiene findings (duplicate Georgia, etc.). All records remain in the live DB as real seed data.

### Honest limitations to expect

- File-picker uploads may fail on some inputs; if `setInputFiles` is rejected I'll log and continue.
- "Overlapping schedule" detection depends on whether UI surfaces the DB constraint — may show as toast only.
- Dr Christina's doctor signup may require email verification; if so I'll pause for you to confirm her email.

Reply with login creds (or "I've logged in"), confirm desktop switch + `setInputFiles` use — then I'll execute starting with Block 0.