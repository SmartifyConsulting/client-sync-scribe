# Fix: JPG not visible in AI document, and OCR history missing from the timeline

## 1. The uploaded JPG does not render

Confirmed cause: the `patient-media` bucket is private, but the document preview renders the file with the **public** storage URL. Requesting that URL returns HTTP 400, so the image tile is blank (the AI description next to it shows fine — the newest scan has a 2,280-character AI interpretation stored).

Fix:
- Add a small helper that turns a stored `media_url` (or source file URL) into a **signed** URL valid for one hour, by extracting the object path from the URL and signing it against the bucket.
- Use it in the document preview builder before rendering the `<img>`, PDF iframe, video, audio, or "Open original file" link, so every attachment loads.
- Apply the same signing wherever else a stored `media_url` is rendered directly (document rows/thumbnails, patient media views).

## 2. OCR history only partially reaches the timeline

Confirmed causes for the Soldatos handwritten record (8,829 characters of transcribed text):
- The timeline generator sends only the **first 4,000 characters** of each historical record to the AI, so more than half of the transcription is never seen.
- Only documents flagged as transcribed are included, and only the 20 most recent — AI-described images (X-rays, scans) with an interpretation stored are excluded entirely.
- The record has no `record_date`, so its events fall back to the upload date instead of the historical date.

Fix:
- Send the full transcription to the timeline generator, splitting long records into ordered chunks instead of truncating, and raise the record limit.
- Also feed AI-analysed images (their stored interpretation plus record date) into the timeline as historical records.
- Strengthen the timeline instruction so every dated event found in a historical record becomes its own entry, ordered by the record date rather than the upload date.
- When the transcription extraction returns a `record_date` and the document has none, save it on the document so the timeline dates events correctly.
- Add a "Re-extract history" action on an already-transcribed document so the confirm-and-apply history dialog can be re-run for records uploaded before this fix.
- Regenerate the timeline (bypassing the cached fingerprint) right after history is applied.

## Technical notes

- Files: `src/features/documents/lib/resolveDocumentPreviewContent.ts` (signed media), a new `src/features/documents/lib/signedMediaUrl.ts`, `src/features/patients/components/PatientOverview.tsx` (record fetch + force refresh), `supabase/functions/summarize-patient-history/index.ts` (chunking + prompt), `supabase/functions/transcribe-record/index.ts` / `AiUploadZone` (persist `record_date`), `src/features/documents/components/DocumentsBrowser.tsx` (re-extract action).
- No schema changes; signing uses the existing private bucket.
- Verification: open the newest scan document and confirm the image renders next to its AI interpretation; regenerate the Soldatos timeline and confirm entries appear from the later parts of the transcription.
