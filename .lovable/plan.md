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

## 5. AI Clinician notes cleanup and accordions

When a session finishes, de-duplicate the AI output: strip repeated cautions/disclaimers
and repeated bullet lines, keeping one instance of each. Render the cleaned notes as
collapsible accordion sections: **Working Impression**, **Safety Checks**,
**Differentials**, **Suggested Checks** (same always-green accordion styling used
elsewhere).

The prescription review step shows this same cleaned, de-duplicated, sectioned view via
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
