# Fix Dean’s Patients error and unify session layouts

## Outcome
- Opening **Patients** on Dr Dean Allie’s doctor profile will reuse his existing linked patient record instead of attempting to create a duplicate.
- During recording, the desktop workspace will use three columns: recording controls, Patient Overview spanning two columns, and Live AI Clinician in the third column.
- Safety checks will be grouped under clear visit/update dates.
- Reopened completed sessions will follow the same structure and element order as the session recording/completion screen.

## Implementation

### 1. Stop duplicate “ME” patient creation
- Update the Patients screen’s self-record lookup to check for an existing patient by `patient_user_id`, rather than relying on the filtered doctor-owned patient list and an email match.
- Reuse Dean’s existing active patient record and suppress auto-creation when a linked record already exists.
- Make the patient-creation helper resolve and return an existing active record when the requested `patient_user_id` is already linked, instead of exposing the raw unique-constraint error.
- Keep the database uniqueness rule; it is correctly preventing duplicate active clinical records.

### 2. Create one reusable session workspace
- Extract the shared session presentation into focused components so the live screen and `/sessions/:id` use the same clinical hierarchy.
- Keep recording controls interactive on the live screen; show the matching completed/read-only recording card when reopening a session.
- Reuse the same Patient Overview, AI Clinician, transcript/audio, summary, action points, generated documents, and private-notes components in both states.
- Move completed-session Quick Actions into a compact top-right menu instead of retaining the separate large button grid.

### 3. Update the recording layout
- Replace the current two-column desktop frame and full-width clinician panel with a stable three-column workspace.
- Keep recording controls in the first column.
- Give Patient Overview two column spans and place Live AI Clinician beside it in the third column.
- Change Patient Overview’s Conditions / Current Meds / Allergies area from three internal columns to two, with single-column stacking on small screens.
- Preserve the existing mobile order and touch sizing.

### 4. Separate Safety Checks by date
- Capture each live clinician update with its timestamp/date instead of flattening all safety lines into one undated list.
- Extend the clinician-note parser and renderer to recognise dated Safety Check groups while remaining compatible with existing undated notes.
- Render date subheadings inside Safety Checks and deduplicate within the appropriate dated group so warnings remain attributable to the correct visit/update.
- Persist the live clinician note during session completion so the reopened session shows the same dated content.

### 5. Align completed and reopened sessions
- Replace the divergent `SessionDetail` composition with the shared workspace used after recording completes.
- Load the patient data needed by Patient Overview when reopening a session.
- Place stored clinician notes, transcript, audio, documents, action points, and private notes in the same positions as the completed live screen.
- Keep doctor/admin permissions, translation, narration, downloads, document actions, private-note editing, and deletion rules intact.

## Technical notes
- The Dean error is confirmed: Dean already has one active linked patient row. `usePatients()` filters out rows owned by the signed-in doctor, then the Patients page concludes the “ME” record is absent and inserts another row with the same `patient_user_id`. The `patients_one_active_record_per_user` index correctly rejects that insert.
- The layout divergence is confirmed: the live screen uses `SessionPatientOverview` plus a separate full-width Live AI Clinician panel, while reopened sessions use `SessionResultPanels` and omit Patient Overview.
- Existing session rows already expose `ai_diagnosis`, `ai_findings_note`, `notes`, `summary`, transcript/audio, and timestamps. If dated clinician updates require structured persistence, add a backward-compatible JSONB field through a migration while retaining the sessions table’s current access grants and policies.

## Verification
- Sign in as Dr Dean, open Patients, and confirm there is no duplicate-key toast and only one active self patient record remains.
- Record a session long enough to receive multiple clinician updates; verify the desktop three-column composition and dated Safety Checks.
- Complete the session, navigate away, reopen it, and compare its element order and content with the just-completed screen.
- Verify mobile stacking, transcript/audio downloads, generated-document actions, translation/narration, private-note editing, and admin-only deletion.