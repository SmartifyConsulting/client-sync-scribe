# X-ray uploads + retrospective capture of the handwritten record

## 1. Where X-rays are uploaded and interpreted

Two places, both using the same AI image interpretation:

- **Doctor side:** Patient profile > Documents tab — upload the image, then open it and use the AI analysis action. Two to six images of the same region can also be compared over time (image comparison).
- **Patient side:** My Documents (`/patient/documents`) — upload, then "Analyse" on the item; the result is stored on the document and shown with the medical disclaimer.

Nothing needs to be built here. One observation: the most recent X-ray upload ("L1-L2-L3", Georgia Adams, today 19:09) was pushed through the **handwritten-record transcription** path instead of the **image interpretation** path, so the stored result reads "This image is a medical X-ray and does not contain any written clinical record…". That is the fix worth making below.

## 2. Did the OCR'd handwritten PDF capture the historic data?

**No — only partially.** Findings from the database:

- The upload exists: "SOLDATOS History.pdf" (Paraskavoula Soldatos, 9 Aug 2026), ~8,800 characters of transcribed text, correctly OCR'd from 2022 onwards.
- That text lives **only inside the document**. Her patient record was last updated 28 June 2026 — before the upload — and holds no entries tagged "Transcribed handwritten record". Conditions, medications, allergies, surgeries and family history were never written back.
- Her history timeline also only covers Aug 2026 consultations; nothing from the paper record was merged into it.
- No patient in the database has any field sourced from a transcribed handwritten record, so the apply step has never completed successfully for anyone.

Cause to confirm during implementation: the extracted history is offered in a follow-up "Apply history" dialog after the transcription finishes. If that dialog is skipped, closed, or never fires (for example when the upload is not tied to a selected patient), the transcription is saved and the structured history is silently discarded.

## What to build

1. **Route X-rays to the right engine.** On upload, detect image files (jpg/png/dicom-style scans) and run medical image interpretation instead of record transcription; keep handwritten transcription for PDFs and photos of written notes. Offer a manual switch ("Interpret as image" / "Transcribe as record") so the doctor can override.
2. **Stop losing extracted history.** Persist the extracted history with the document when the apply dialog is dismissed, and add a "Review & apply history" action on any transcribed record so it can be applied later.
3. **Re-run for Soldatos.** Re-extract structured history from the stored transcript of "SOLDATOS History.pdf" and present it for review, so the 2022-onwards conditions, medications, allergies, surgeries and family history land on her record with dates and a "Transcribed handwritten record" source.
4. **Fold paper history into the timeline.** Include applied paper-record entries when the patient history timeline is regenerated, so historic events appear chronologically alongside in-app sessions.
5. **Verification.** After applying, confirm her record shows the historic entries with their original dates and that the timeline starts in 2022 rather than Aug 2026.

## 3. To-Do document defects

Two further issues to fix in the same pass:

6. **"Review Referral" opens an empty template.** The referral document reached from the To-Do list still renders unfilled placeholders instead of the session's real data (referring doctor, specialist, patient details, presenting complaint, clinical findings, reason for referral). Map the AI-extracted session fields onto the referral template tokens the same way the medical certificate was fixed, and blank out any token with no value instead of leaving the raw placeholder text visible. Verify by opening the referral from a real session's To-Do entry and confirming every line carries patient/session data.
7. **Prescription medications must be bulleted, not numbered.** Yesterday's prescription in the To-Do list renders medications as "1., 2., 3.". Per the agreed format, each prescribed medication is a plain bullet — one bullet per medication, no ordinal numbering. Change the prescription template/generation to emit bullets and check both the newly generated document and the previously generated one shown in the To-Do list.


## Technical notes

- Upload/transcription flow: `src/features/documents/UploadDocumentDialog.tsx` → `transcribe-record` edge function → `src/features/documents/components/ApplyHistoryDialog.tsx` (writes `conditions_diagnoses`, `current_medications`, `allergies`, `surgeries`, `family_history` on `patients`).
- Image interpretation flow: `analyze-medical-image` edge function, surfaced in `src/pages/PatientProfile.tsx` and `src/pages/patient/PatientDocuments.tsx`.
- Extracted history will be stored on the document row so it survives a dismissed dialog; timeline regeneration goes through `summarize-patient-history`.
