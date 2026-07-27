## 1. "Couldn't build DISC profile — Failed to send a request to the Edge Function"

That message is the client failing to reach the function at all (not a 4xx/5xx from inside it). The backend has no log entries whatsoever for `analyze-patient-disc`, meaning it has never actually run — the function exists in the codebase and in config, but is not live.

Fix: redeploy `analyze-patient-disc`, then invoke it against a real patient to confirm it returns a profile (and surface the real backend message in the toast instead of the generic transport error).

## 2. Templates showing raw HTML code

Default template bodies are stored with literal markup, e.g. `<u><b>PRESCRIPTION</b></u>`, which shows as code in the template editor and anywhere the body is displayed as plain text.

Fix:
- Rewrite the default template bodies (`useTemplates.ts`) to plain text headings — no `<u>`, `<b>` tags. Heading emphasis moves to the renderer, not the stored text.
- Add a small sanitiser used when a template body is loaded into the editor so **existing saved templates** with tags are cleaned on display/save, rather than leaving old content broken.
- Document generation/preview keeps producing the same visual result (bold, underlined section headings) because the renderer applies the styling.

## 3. Doctor's signature never appears on previews/documents

The signature is configured as *typed text* (font, colour, size — e.g. Great Vibes / Navy / 42px on `profiles.signature_font`, `signature_color`, `signature_font_size`, `signature_bold`, `signature_italic`). But both placeholder resolvers only handle `profiles.signature_url` (an uploaded image). With no image uploaded, `[DoctorSignature]` resolves to a blank line — which is exactly the `___` seen on the prescription.

Fix in `fillDocumentPlaceholders.ts` and `resolveDocumentPreviewContent.ts`:
- If `signature_url` exists → keep the current inline image.
- Otherwise, render the doctor's name in the stored signature font/colour/size/weight/style (self-hosted signature fonts already in the app), so previews, invoices, prescriptions, certificates and exports all show the same signature the doctor sees in My Practice.
- Also apply to `[Signature]` and keep `[SignatureDate]` behaviour unchanged.

## 4. All Documents (doctor) — group by Patient / Date, styled like My Sessions

`DoctorDocumentsTab` is currently a flat, full-width list with its own row format.

Fix: rebuild it using the same shared pieces My Sessions and My Tasks use:
- Date / Patient toggle top-right (default **Date**), search kept above.
- Date buckets: Today · This week · This month · Older; Patient mode grouped by surname.
- Same frame and rows: `SECTION_FRAME_CLASS`, `SECTION_ITEM_CLASS`, `SECTION_TRIGGER_CLASS`, count pills, `max-w-5xl` container width, and the same 12px row typography as My Sessions.
- Keep existing behaviour: click-through to the patient's document, sample-patient badges, pagination.

## 5. My Sessions top row not green/white by default

Verify in the running app why the first row doesn't open with the green/white treatment (the accordion's `defaultValue` is `["today"]`, but the mount order relative to data loading, or an empty "Today" bucket, may be defeating it). Fix so that on load — and on every toggle between Date and Patient — the **top row is expanded, green background, white text**, and any other row clicked takes on the same treatment. Confirm with a browser check rather than assuming.

## Technical notes
- Files: `supabase/functions/analyze-patient-disc/index.ts` (redeploy), `src/features/patients/components/DiscPersonalityCard.tsx` (error surfacing), `src/hooks/useTemplates.ts`, `src/features/documents/templates/*`, `src/features/documents/lib/fillDocumentPlaceholders.ts`, `src/features/documents/lib/resolveDocumentPreviewContent.ts`, `src/pages/doctor/DoctorDocumentsTab.tsx`, `src/pages/MySessions.tsx`.
- No schema changes required; no colour-token changes.
