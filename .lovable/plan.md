## 1. Template "Preview" (eye) shows raw placeholders

Confirmed: in `Documents.tsx` the template preview dialog renders `previewTemplate.content` straight through `renderFormattedContent` with no token resolution, while Edit → Show Preview runs the same content through the template token resolver (which is why the signature appears there).

Fix: run the template content — and its linked header/footer sections — through the same resolver used by the editor preview, so doctor name, practice/registration number, date and `[DoctorSignature]` populate identically.

## 2. To-Do list preview (eye icon) missing signature

The To-Do preview already calls the shared document resolver, which only inlines the signature when the document's owning doctor profile loads and has signature settings. Root cause not yet confirmed (candidates: missing owner id on the document row, or content previously auto-healed with the signature stripped).

Plan: inspect the actual document rows behind a failing preview first, then fix accordingly — fall back to the signed-in doctor's signature when the owner profile is missing, and stop persisting an auto-healed copy when the signature could not be resolved so it is retried next time.

## 3. Template preview and To-Do preview look formatted differently

The two previews use different render paths and wrappers (dialog markup, page width, font/logo handling), so the same document renders with different type sizes, spacing and letterhead layout.

Fix: render both through one shared document-preview surface — same page frame, width, font family, letterhead/header-footer layout, and body typography — so a template preview and a document preview are visually identical. Also fix the visible date/address run-together in the prescription body (`Date: [PrescriptionDate]` resolving without a line break before the practice address).

## 4. Image upload to prescription fails with a security-policy error

Storage rules for the image bucket allow an upload only when the first folder of the path equals the signed-in user's id. The uploader builds that folder from the app-level user object, which can differ from the actual authenticated session (profile switching / impersonation), producing "new row violates row-level security policy".

Fix: build the upload path from the live authenticated session id fetched at upload time, with a clearer message when there is no active session. Keep the local-embed fallback so the image still appears.

## 5. Communicate that placeholder fields are draggable

Add a visible hint in the template editor placeholder panel ("Drag a field into the text, or click to insert"), plus drag affordances (grab cursor, drag-handle icon) and tooltips on each placeholder chip.

## Technical notes

- Files: `src/pages/Documents.tsx` (preview dialog), `src/features/documents/lib/resolveTemplatePreview.ts`, `src/features/documents/lib/resolveDocumentPreviewContent.ts`, the shared document preview component used by the To-Do previews, `src/features/documents/templates/TemplateSectionEditor.tsx` (upload path), and the placeholder chip list in the templates feature.
- No database or storage-policy changes; the upload fix is client-side path correctness.