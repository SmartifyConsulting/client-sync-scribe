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
