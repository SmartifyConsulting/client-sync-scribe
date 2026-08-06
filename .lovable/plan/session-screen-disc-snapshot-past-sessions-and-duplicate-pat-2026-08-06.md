# Session screen: DISC snapshot, Past Sessions, and duplicate patient fix

## 1. DISC personality snapshot on the Session screen

Add a compact personality strip to the Session Mode layout (directly under the Patient Overview frame), visible to doctors only.

- Reads the existing stored DISC profile for the patient; no new AI call during a session.
- Shows the four D / I / S / C scores as small coloured chips plus the primary and secondary trait.
- Replaces the rationale paragraphs with **adjectives only** — e.g.
  - Dominance: decisive, direct, results-driven, impatient
  - Influence: expressive, sociable, optimistic, talkative
  - Steadiness: calm, patient, cooperative, reserved
  - Conscientiousness: precise, analytical, cautious, detail-focused
- Adjective sets are derived from each dimension's score band (high / moderate), so no schema or edge-function change is needed.
- If no profile exists yet, the strip shows a one-line "No personality profile yet" note instead of occupying space.

## 2. Past Sessions frame back on the Session Mode screen

Restore a "Past Sessions" frame beneath the **Start New Session** button in the idle state, using the past-session data the page already loads for the selected patient.

- Lists the most recent sessions (date, duration, one-line summary), newest first.
- Each row opens that session's detail view.
- Shows "No previous sessions" when the patient has none, and is hidden entirely when no patient is selected.

## 3. Repeating patient names in "+ Admission"

Confirmed cause: the patient list is not the bug — the database genuinely holds duplicate patient records (e.g. 92 rows named "Allie, Dr Dean" and 10 named "Allie, Dean" under the same owners). 147 duplicate rows exist in total, and **none of them have any linked sessions, admissions, documents or prescriptions**.

Fix in two parts:

1. **Data cleanup** — a migration that keeps the oldest record per owner + name and deletes the duplicate rows that carry no clinical data. Records with any linked data are never touched.
2. **Display guard** — the patient pickers (Add Admission dialog and the session patient selector) de-duplicate by owner + normalised name before rendering, so any future duplicates never show as repeated rows.

## Technical notes

- `src/features/sessions/components/SessionDiscStrip.tsx` (new) — compact DISC chip row reading `patient_disc_profiles`, adjectives derived client-side from score bands.
- `src/pages/Sessions.tsx` — render the DISC strip under `SessionPatientOverview`; add the Past Sessions frame under the Start New Session button using the existing `pastPatientSessions` state.
- `src/pages/doctor/DoctorAdmissions.tsx` — de-duplicate the `doctor-admissions-patients` query result.
- One migration deleting orphan duplicate `patients` rows (verified zero rows with dependent data).
