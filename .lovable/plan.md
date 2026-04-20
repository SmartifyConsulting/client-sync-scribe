

# Plan: Clarify the To-Do document preview close behavior

## What's actually happening

The To-Do list preview already opens `<DocumentPreview>` as an **overlay** and closes via `onClose={() => setPreviewDoc(null)}` — there is no `navigate(...)` call. The X icon (top-right) and the bottom-left button both just dismiss the modal in place.

The confusion is the **bottom button label**: it currently reads **"Back to Form"**, which is correct when the modal is opened from inside an editor (e.g. PrescriptionEditor) but misleading when opened from the To-Do list or Patient Documents — there's no form to go back to, so it looks like it might navigate to Templates.

## Fix

Make the close-button label context-aware in `src/components/sessions/DocumentPreview.tsx`:

1. Add an optional prop `closeLabel?: string` (default `"Close"`).
2. Render the bottom-left button as `{closeLabel}` instead of the hard-coded `"Back to Form"`.
3. In editor callers (PrescriptionEditor, InvoiceEditor, MedicalCertificateEditor, ReferralLetterEditor, GeneralLetterEditor, HospitalAdmissionEditor), pass `closeLabel="Back to Form"` to keep their existing wording.
4. Leave the To-Do (`TodoList.tsx`) and Documents (`Documents.tsx`) callers untouched so they get the new default `"Close"`.

The X icon in the top-right already dismisses cleanly — no change needed there.

## Files touched

| File | Change |
|---|---|
| `src/components/sessions/DocumentPreview.tsx` | Add `closeLabel` prop (default `"Close"`); replace hard-coded `"Back to Form"` |
| `src/components/sessions/PrescriptionEditor.tsx` | Pass `closeLabel="Back to Form"` |
| `src/components/sessions/InvoiceEditor.tsx` | Pass `closeLabel="Back to Form"` |
| `src/components/sessions/MedicalCertificateEditor.tsx` | Pass `closeLabel="Back to Form"` |
| `src/components/sessions/ReferralLetterEditor.tsx` | Pass `closeLabel="Back to Form"` |
| `src/components/sessions/GeneralLetterEditor.tsx` | Pass `closeLabel="Back to Form"` |
| `src/components/sessions/HospitalAdmissionEditor.tsx` | Pass `closeLabel="Back to Form"` |

## Out of scope

- No routing changes (none needed — the modal already overlays in place).
- No visual redesign, no schema, no RLS.

