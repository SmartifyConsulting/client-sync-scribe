

# Plan: Show Headers & Footers on Patient Documents

## Why headers/footers are missing today

The patient `My Documents` page (`src/pages/patient/PatientDocuments.tsx`) **never renders the document body at all** — the document cards only expose a *Send* button (and an *AI* button for images). There is no preview dialog, so the saved letterhead never has a chance to appear.

The doctor page (`src/pages/Documents.tsx` lines 965–1037) does show header/footer because it opens a preview `Dialog` and resolves the letterhead by matching `documents.template_name` → `templates.header_footer_template_id` → `header_footer_templates` row.

A second, deeper issue: header/footer templates are owned by the **doctor** (`user_id` scoped), so even if we copy the doctor's preview code verbatim into the patient page, the patient's `useHeaderFooterTemplates()` hook returns *the patient's* (empty) list and the lookup fails. We need to fetch the header/footer that belongs to the document's author.

## Changes

### 1. New hook: `useDocumentHeaderFooter(document)`
File: `src/hooks/useDocumentHeaderFooter.ts` (new)

Given a document row, fetch the matching header/footer for **the document's author** (`documents.user_id`), not the current user:
1. Query `templates` where `user_id = document.user_id` AND `name = document.template_name` → get `header_footer_template_id`.
2. Query `header_footer_templates` by that id (fall back to that doctor's `is_default = true` row if none linked).
3. Return `{ headerFooter, isLoading }`.

Both queries are read-only and already covered by existing RLS (header/footer templates and templates are readable by the patient when the patient has a record under that doctor — verify; if RLS blocks it, add a policy in step 4).

### 2. Add a Preview button + Preview Dialog to `PatientDocuments.tsx`
- Add an **Eye** icon button next to the existing Send button on each `documents`-source card (skip for `prescriptions` / `invoices` rows, which have no `content`/template).
- Add a `previewDoc` state and a `<Dialog>` that mirrors the doctor preview structure (lines 965–1037 of `Documents.tsx`):
  - Header section (rendered via the same 3-cell `<table>` layout used in `DocumentPreview.tsx` / `documentExport.ts`)
  - Document body via `renderFormattedContent()` (reuse the helper — extract to `src/utils/documentFormatting.ts` so both pages import it)
  - Footer section (same 3-cell table)
  - Close + Download PDF buttons
- Use `useDocumentHeaderFooter(previewDoc)` inside the dialog to fetch the doctor-owned letterhead.

### 3. Extract shared formatter
Move `normalizeHeadingMarkup` + `renderFormattedContent` from `Documents.tsx` and `DocumentPreview.tsx` into `src/utils/documentFormatting.ts` and import from both, plus the new patient preview. Avoids a third copy.

### 4. RLS check for header/footer templates
Verify patients can `SELECT` a header/footer template owned by their doctor. If the current policy is `user_id = auth.uid()` only, add a policy:

```sql
CREATE POLICY "Patients can read header/footer templates of their providers"
ON public.header_footer_templates FOR SELECT TO authenticated
USING (
  user_id IN (
    SELECT DISTINCT d.user_id FROM public.documents d
    JOIN public.patients p ON p.id = d.patient_id
    WHERE p.patient_user_id = auth.uid()
  )
);
```

Same pattern for `templates` if needed for the name→id lookup.

## Out of scope

- No changes to how documents are saved (header/footer continue to be resolved at render time, not baked into `content`).
- No layout/UI redesign of the patient document list — only adds one Eye button + a dialog.
- Doctor-side rendering is unchanged.

## Files touched

| File | Change |
|---|---|
| `src/utils/documentFormatting.ts` | **new** — shared `renderFormattedContent` |
| `src/hooks/useDocumentHeaderFooter.ts` | **new** — author-scoped letterhead lookup |
| `src/pages/patient/PatientDocuments.tsx` | add Preview button + Preview Dialog |
| `src/pages/Documents.tsx` | swap local helpers for shared util |
| `src/components/sessions/DocumentPreview.tsx` | swap local helpers for shared util |
| `supabase/migrations/<ts>_patient_letterhead_read.sql` | RLS policies (only if verification confirms they're missing) |

