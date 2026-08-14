# Ask Angel rebrand, tabbed session view, and v2.0 demo profile

## 1. Rename Maeve to Angel

- Replace every user-visible "Maeve" with "Angel" ("Ask Angel") across pages, components, nav, buttons, empty states, toasts and the `en.json` locale (plus the other locale files where the string appears).
- Rename the persona in the assistant, summary and voice edge functions so it introduces itself as Angel.
- Default voice stays Nova. The pronunciation helper that spoke "Meev" is removed — "Angel" needs no phonetic swap.
- Internal file/table names (`ask_maeve_*`, `maeve-speak`) stay as they are so nothing breaks; only the label changes.

## 2. Angel transcripts become session documents

- When an Angel exploration ends (or on demand via "Save as document"), the transcript is written into the documents store as a normal document with type "Exploration Transcript", linked to the patient.
- It then appears alongside the auto-generated session documents, with the same preview, download, email and share behaviour.
- The same applies to consultation recordings: when a session's transcription is finalised, the transcript is saved as a document (type "Session Transcript", linked to the patient and that session) so it sits with the other auto-generated session documents and can be previewed, downloaded, emailed and shared.

## 3. Medical Certificate preview shows real data

- The to-do review preview renders the raw template, so placeholders stay unfilled. It will use the same fill pipeline the session documents use (template + header/footer + placeholder fill with patient, doctor and practice data) so the preview matches the generated document.

## 4. Sessions list

- Add vertical padding/spacing between session rows.
- Inside each month group, add a second level of accordions grouped by patient. The patient-level header row uses a grey background (the month header keeps the current green style).

## 5. Admissions — "Other doctors" tab

- Each record shows patient name, admitting doctor, hospital and procedure/diagnosis on the row.
- Clicking a record opens that specific admission (admission detail) instead of the generic patient page.

## 6. Session detail screen

- Quick Actions becomes a single dropdown in the top-right corner (Prescription, Invoice, Medical Certificate, Referral Letter, General Letter, Drawing Pad, Hospital Admission). The row of large buttons is removed.
- The body becomes tabs in this order:
  1. **AI Summary**
  2. **Session Records** — transcript first, then the audio player/download, then the auto-generated documents for that session
  3. **Action Points**
  4. **AI Clinician Notes** — sub-tabs: Working Impression, Safety Checks, Differentials, Suggested Checks
  5. **Private Notes**

## 7. Action Points vs Safety Checks

- The session analysis prompt is tightened so the AI only emits an Action Point when there is a real follow-up task after the consultation, and routes anything the doctor does or must do *during* the session into Safety Checks.
- Action Points that are patient tasks are assigned to the patient's To-Do list (existing task routing), not the doctor's.

## 8. Georgia Adams demo profile (v2.0)

- Create the auth user `georgia.adams@smartify.co.za` with the given password, a comprehensive doctor profile (credentials, practice details, specialty, about-me, signature) **and** a linked patient record — she is both doctor and patient.
- Add both her doctor and patient identities to the avatar profile switcher and to the test-profile switcher list.
- Add a `v2_demo` boolean flag on profiles (admin-toggleable). Ask Angel, Biolog and the patient relationship/Enneagram survey are only visible when that flag is on; Georgia's profile has it enabled.

## Technical notes

- New migration: `profiles.v2_demo boolean not null default false`; admin-only update policy.
- Angel transcript document reuses the existing documents insert path so RLS, storage and email flows are unchanged.
- Session detail tabs reuse `SessionResultPanels` content blocks rather than duplicating them; `ClinicianNotesAccordion` sections are re-projected as sub-tabs using the existing `clinicianNotesSections` parser.
- Sessions list nesting reuses `ListGroupToolbar` with a nested patient-level accordion and a grey trigger variant added to `section-accordion.tsx`.
