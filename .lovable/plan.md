# Session documents, uploads and AI Clinician cleanup

## 1. Fix manual document upload (RLS error)

Confirmed cause: the "Add Document" upload dialog builds the storage path as
`<patient id>/<timestamp>.<ext>` when a patient is selected. The storage rule for
patient media requires the **first folder to be the uploader's own user id**, so any
upload attached to a patient is rejected with "new row violates row-level security policy".

Fix: build the path as `<user id>/<patient id or "self">/<timestamp>-<file>` (same
scheme the drag-and-drop browser already uses), and raise the size cap for this dialog
to 20MB so it matches the drag-and-drop limit.

## 2. Upload + transcription progress

Add an animated progress bar to both upload paths (drag-and-drop area and the upload
dialog) with staged labels: Uploading -> Transcribing -> Saving. Per-file progress with
an indeterminate shimmer while the AI transcription runs, plus a file counter when
several files are dropped.

## 3. Transcript should update the patient record

Today a transcribed handwritten record is only stored as a document. After transcription,
send the text to the AI to extract structured history (conditions, medications, allergies,
surgeries, notable events) and present a short "Apply to patient record?" confirmation.
On confirm, append to the patient's medical history / overview fields (never overwrite),
tagged with the retrospective record date. Doctor confirmation is required before any
patient field is changed.

## 4. Post-session document sequence

Fixed order of the generated-document steps:

```text
1. Prescription   (with "Review AI Clinician notes" button)
2. Medical Certificate   (if relevant)
3. Referral              (if relevant)
4. Any other document types (if any)
5. Invoice               (second last)
6. Vulas                 (last)
```

Every step gets:
- a preview (eye) icon,
- Send and Save buttons,
- micro-animations on completion: paper plane flying off for Send, rotating floppy disk
  for Save, calendar-with-tick for Scheduled.

## 5. AI Clinician notes → Live Clinical Intelligence Panel

Replace the dense prose block (currently a raw `<pre>` dump of the AI text) with a
structured, scannable panel. The AI engine, live hint merging, transcription, extraction
and clinical logic stay exactly as they are — this is a presentation and
information-architecture change only. Nothing is fabricated; every element is mapped from
existing AI output, and the raw text is retained underneath.

**Parsing layer (presentation only).** A `parseClinicianNotes` helper turns the existing
note text into a structured model: impression (+ confidence when stated), attention items
(CRITICAL / CAUTION / interactions / contraindications / discrepancies / safety flags),
findings, differentials, suggested checks, and background. It de-duplicates repeated
lines and repeated cautions, and keeps each item's own detail text for expansion. Nothing
that can't be classified is dropped — it lands in a "Other AI notes" expandable block.

**Panel layout** (single primary column, stacks on narrow widths):

1. Compact header: "AI Clinical Assistant", a small `● Listening` indicator (subtle
   "Updating" pulse while processing), the existing Edit action, and the subtitle
   "Continuously analysing the consultation".
2. One-line compact disclaimer, always visible:
   "AI-generated clinical insights are decision support only and must be reviewed by the
   treating clinician."
3. **Current Impression** card — impression + confidence; placeholder
   "Building clinical impression…" when empty.
4. **Needs Attention** with a count — items ordered critical → caution → informational.
   Severity is shown through visual hierarchy (border weight, tone, small icon), not
   literal `[CAUTION]`/`[CRITICAL]` labels. Red reserved for genuinely critical items.
   Each item expands via "Why am I seeing this?" showing the AI's own explanation.
5. **Clinical Findings** — short titled findings with concise qualifiers, as compact rows
   rather than paragraphs. Where the source distinguishes them, findings are labelled
   *Patient reported* vs *AI interpretation* so an inference never reads as a fact.
6. **Differentials** — compact chips, expandable for the AI's context/confidence, headed
   "AI-generated differential considerations".
7. **Suggested Checks** — consolidated single-instance list, with "View all →" when long.

**Live update behaviour.** New AI output is merged into the existing structured model by
stable item key rather than appended: existing cards update in place, duplicates
consolidate, section order stays fixed so the page does not reflow or jump. Newly added
items show a subtle "NEW" badge that fades after a few seconds.

**Empty states.** "Building clinical impression…", "Listening for clinically relevant
findings…", "No differential considerations identified yet.", "Will appear as clinically
relevant information is identified." Sections with nothing and no useful placeholder stay
hidden.

**Edits.** The existing Edit flow is kept. Clinician-edited content is marked
"Edited by clinician" and is never overwritten by later AI updates.

This live panel stays intelligence-focused — the existing post-session summary and
document/final-note workflow are unchanged, and continue to consume the same underlying
AI data.

The prescription review step reuses this same structured, de-duplicated view via
"Review AI Clinician notes", so the doctor can amend the prescription before sending.


## 6. Session view fixes

- Move the voice-recording **Download** control directly beneath the voice recording
  player; remove it from its current position under the AI Clinician block.
- Session Documents list: add the missing preview (eye) icon next to each row.
- Fix the pencil/Edit action so it actually opens the matching editor
  (prescription / medical certificate / referral / invoice / letter) pre-loaded with that
  document, instead of doing nothing.
- Rename the patient profile tab "Session History" to **Sessions**.

## Technical notes

- Upload fix: `src/features/documents/UploadDocumentDialog.tsx` (path + `maxBytes`).
- Progress: shared upload-progress component used by `UploadDocumentDialog` and
  `src/features/documents/components/DocumentsBrowser.tsx`.
- History extraction: extend the `transcribe-record` edge function to also return
  structured history; apply via a confirm dialog.
- Sequencing/animations: `src/features/sessions/components/PostSessionStepDialog.tsx`
  and the generated-documents panel.
- AI notes: new `cleanClinicianNotes` helper + accordion renderer shared by
  `SessionResultPanels.tsx` and the prescription review sheet.
- Session view edits: `src/pages/SessionDetail.tsx`; tab rename in
  `src/pages/PatientProfile.tsx`.
