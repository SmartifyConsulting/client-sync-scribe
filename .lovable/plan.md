# Big AI upload on Documents + fix "AI description failed"

## 1. Fix the AI analysis error

The patient-media bucket is private, so the analyser is handed a public URL it cannot actually read. It downloads an error page instead of the image, falls back to sending the unreadable link to the AI provider, and the provider rejects it — surfacing as "Edge Function returned a non-2xx status code".

Fix, mirroring the transcription function that already works:
- The uploader sends the storage path (and bucket) alongside the document id, not just the URL.
- `analyze-medical-image` downloads the bytes with the service role and inlines them as a base64 data URL; it keeps the URL path only as a fallback for externally hosted images.
- Guard for empty/oversized files and return a clear message instead of a generic failure.
- Surface the real reason in the toast (e.g. "image could not be read", "credits exhausted") rather than the raw edge-function wording.

## 2. Big AI upload zone on the Documents screen

The large drag-and-drop "AI describe" zone currently exists only inside the patient Documents tab. Add the same zone to the main Documents page:
- Same prominent dashed drop area with live stage feedback (Uploading → Analysing → Saving).
- Same category dialog after file selection (X-Ray, CT, Scan, Lab result, etc., with on-the-fly category creation) plus optional record date.
- Uploads here have no patient attached by default; if the page already has a patient filter selected, the file is linked to that patient.
- Uploaded files land in the existing document list with the "AI described" badge and the "Analyse with AI" action for anything not yet described.

## Technical notes

- `supabase/functions/analyze-medical-image/index.ts`: accept `storagePath`/`bucket`, service-role download, base64 inline, better error text; redeploy.
- `src/features/documents/components/DocumentsBrowser.tsx`: pass `storagePath` to the analyser and improve the failure toast.
- `src/pages/Documents.tsx`: render the shared upload zone (extracted from `DocumentsBrowser` so both screens use one component) above the document list, reusing `UploadDocumentsDialog` and `UploadProgressBar`.

## 3. Session transcript frame moves under Patient Overview

- Remove the standalone bordered frame currently wrapping the live session transcription.
- Render the transcript accordion inside the Patient Overview frame instead, so the session screen has one container rather than two stacked frames.
- Keep the existing transcript behaviour (live text, resume, expand/collapse) unchanged.

## 4. Accentuate "Review AI Clinician notes"

- Restyle the brain-icon button in the post-session step dialog with a warm orange→yellow→red gradient (new semantic tokens in the design system, not hardcoded colours) and white text, so it stands out from the other step actions.

## 5. Referral letter must pull all patient fields

- The referral template renders section headings with empty bodies because only the referral form fields are mapped; patient-derived fields are not.
- Populate Relevant History, Current Medications, Investigations Performed and Diagnosis from the patient record and the current session when the referral form leaves them blank (conditions/history, active medication list, recent results, working impression).
- Also fill patient identity/contact tokens (name, DOB, ID, medical aid, phone, address) on the referral document the same way the prescription does.
- Any section that still has no data is dropped from the letter rather than printed as an empty heading.

## 6. Prescription must not print blank medication slots

- The default prescription template hardcodes slots 1, 2 and 3. Empty slots leave forgeable blank lines.
- Replace the fixed three slots with a repeated block that renders only the medications actually prescribed, numbered sequentially.
- Existing saved prescriptions render the same way: blank numbered blocks are stripped from the preview, the PDF and the emailed copy.
- Trailing separators and the "---" rule are cleaned up when fewer items are present.

## Technical notes (additions)

- `src/pages/Sessions.tsx`: move `SessionTranscriptAccordion` inside the Patient Overview panel and drop its outer frame.
- `src/features/sessions/components/PostSessionStepDialog.tsx`: gradient variant for the AI Clinician notes button.
- `src/features/documents/lib/fillDocumentPlaceholders.ts`: referral fallbacks from patient/session context; blank-section pruning.
- `src/hooks/useTemplates.ts` + prescription fill logic: dynamic medication list instead of `[Medication1..3]`.

## 7. Document previews missing signature and prescription date

- Document previews render `[DoctorSignature]` as blank because the doctor's selected signature (font style / drawn image) is not resolved into the preview path — only the export path fills it. Resolve the signature the same way for preview, PDF and email so what the doctor sees matches what is sent.
- `[PrescriptionDate]` (and `[SignatureDate]`) are left empty on prescriptions. Default them to the session/document date, formatted like the rest of the app, whenever the prescription form does not supply one.
