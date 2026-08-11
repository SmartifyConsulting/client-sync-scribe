# Hospital-side patient records: link admissions, keep users in the hospital profile

## What's happening now

- Georgia Adams' Maternity admission at Holarc General **is** linked to a patient record — but the patient name links to `/patients/<id>`, which is the doctor workspace route. Clicking it drops the hospital user out of the hospital profile into the doctor-side profile view.
- Access rules on patient records currently only allow the patient, the record's owning doctor, practice assistants and share recipients. Hospital staff have no read path, so even a hospital-side view would come back empty.
- Six admissions at Holarc General (Nadia Petersen, Amahle Zulu, Johan Pretorius, Kabelo Sithole, Thabo Mokoena, Lerato Nkosi) have no patient record attached at all, so their names show as plain grey text.
- There are two patient records named Georgia Adams; the admission points at one of them.

## What will change

### 1. A patient record view that lives inside the hospital profile
New screen at `/provider/hospital/patient/:patientId`, rendered inside the hospital operations layout so the sidebar, header and hospital context stay exactly as they are. It shows, read-only:
- Patient header (name, age/gender, contact) with a back link to Admissions
- Clinical Overview summary
- Personal / medical detail sections (conditions, allergies, current medications, emergency contacts)
- That patient's admission history at this hospital

Admission rows link here instead of to the doctor route. No doctor-only actions (no editing, no session recording, no documents authoring) are exposed.

### 2. Access rules for hospital staff
Add a read rule so staff of a hospital may view a patient record while that patient has an admission at their hospital, plus the same scoping for the related clinical detail the screen shows. Access ends when the admission relationship ends, and nothing is granted beyond the hospital's own admitted patients.

### 3. Repair the broken links
- Create patient records for the six unlinked Holarc General admissions and attach them, so every name in the list opens a profile.
- Match any other admission whose name already has a patient record and attach it.
- Leave the duplicate Georgia Adams records in place but keep the admission pointed at the linked one; flag the duplicate rather than deleting clinical data.

### 4. Admissions accordion restyled to match Personal Information
The Admissions list adopts the same section styling used on the patient profile's Personal Information block: a flat single frame, always-green header bar with white 12px semibold title, small icon, right-hand chevron that rotates, and the count pill. Inner per-admission rows follow the same scale so the two screens read identically.

## Technical notes

- New: `src/modules/holarchelp/pages/provider/hospital/HospitalPatientRecordScreen.tsx`; route added to `src/modules/holarchelp/routes-provider.tsx` under the hospital layout.
- `InpatientsScreen.tsx`: `recordLink` points at the hospital route; accordion classes swap to the `SectionHeader` typography/`SECTION_*` scale from `src/features/patients/components/sectionStyles.tsx`.
- Database migration: read policies on `patients` (and the clinical tables the screen reads) via a security-definer helper that checks for a current admission at the caller's hospital; plus data backfill inserting and linking the missing patient records.
- No changes to the doctor-side patient profile.

---

# Session screen: task noise, AI Clinician layout, document confirmations

## 5. Stop non-actionable items landing in the To-Do list

The "General Tasks" bucket is where patient-less to-dos collect, and it is filling with items that are not real tasks. Recent examples from the live list:

- "Schedule appointment with Unknown Patient on 2026-08-18 at 09:00 (30 min)"
- "Schedule a follow-up appointment on 2026-08-18 to discuss HRT treatment plan. (Patient not specified)"
- "Dr. Allie to issue a medical certificate for Georgia Adams for today. (Patient Georgia Adams not found in list)"
- "Schedule an appointment with Dr. Buttons for a foot assessment (No matching patient for Dr. Buttons)"
- Long clinical narration copied verbatim from the AI summary ("Review medications (Oroclor, Ibuprofen) and assess effectiveness… calculate Centor Score…")

Rules to apply when action points are turned into to-dos:
- Discard anything whose text carries an unresolved-patient marker ("Unknown Patient", "Patient not specified", "not found in list", "No matching patient").
- Discard scheduling items — follow-ups are handled by the Schedule step of the post-session queue, so they must not also become a task.
- Discard items that duplicate a document already generated this session (certificate/prescription/referral/invoice), since a "Review …" task is created for those already.
- Keep only short, actionable clinical instructions tied to a patient; anything longer than a sentence is trimmed to its actionable clause.
- Anything still patient-less after that is attached to the session's patient rather than dumped into General Tasks.

## 6. Remove the "Opening session" toast

The toast fired when Start Session is clicked goes away; navigation alone is the feedback.

## 7. Prescription generation

Prescriptions are only created when the analysis returns medications. Add a fallback so that when the transcript clearly contains prescribed medication but the structured prescription is missing, the medications are re-extracted from the summary/transcript before the queue is built, and log the reason when nothing can be produced so the doctor is not left guessing.

## 8. AI Clinician notes: remove CAUTION noise and widen the panel

- Strip the repeated "CAUTION" / "NOTE" prefixes from clinician output; severity is shown by colour, not by a repeated word.
- The left recording frame ends just below the audio playback — no trailing empty space.
- AI Clinician Notes then spans the full width of the screen beneath it.
- Body text drops to the same size as the Patient Overview content in the top frame.
- Section headings render bold; key terms are bold and colour-coded, with a small legend (e.g. red = risk/red flag, amber = caution, teal = medication, grey = investigation) shown inline on the AI Clinician Notes heading row.

## 9. Medical Certificate preview uses the real template

The preview currently shows the raw generated text. It will render through the same document renderer used elsewhere — the doctor's letterhead header, body in the certificate template layout, signature block and footer — so the preview matches exactly what gets sent.

## 10. Replace toast confirmations for documents

Generation, save and send confirmations stop using toast messages. Each step confirms inline in the step dialog with its existing micro-animation (paper plane for sent, floppy disk for saved, tick for generated) and a persistent state on the document card, so the doctor can see what happened after the animation ends.

## Technical notes (this section)

- `src/pages/Sessions.tsx`, `src/features/sessions/components/PostSessionStepDialog.tsx`, `SessionResultPanels.tsx`, `ClinicianNotesAccordion.tsx`, `src/features/sessions/utils/clinicianNotesSections.ts`.
- To-do filtering happens where action points are converted (`supabase/functions/process-todo-actions`) plus a client-side guard before insert.
- `src/pages/PatientProfile.tsx` line ~234: remove the "Opening session" toast.
- Certificate preview reuses the shared document renderer and header/footer hooks already used by the Documents module.

## 11. Remove the duplicate Georgia Adams

There are two patient records named Georgia Adams:

- Created 21 Mar 2026 — 1 document, no sessions, no tasks, no admissions. This is the stale stub.
- Created 10 Apr 2026 — 34 documents, 12 sessions, 27 tasks, and the Maternity Ward admission at Holarc General. This is the real, active record.

The active (10 Apr) record is kept as the single Georgia Adams. The single document on the old stub is moved onto the kept record, then the stub is deleted along with its account link, so there is only one Georgia Adams everywhere — patient list, admissions, documents and search.
