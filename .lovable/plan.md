

# Plan: Make `/documents` preview use the same letterhead resolver as everything else

## Why headers/footers still don't appear

The fix from last round only updated the To-Do list preview. The **Patient Documents page (`/documents`) preview dialog has its own inline lookup** that:

1. Searches `templates` from `useTemplates()` — which returns the **logged-in user's** templates only.
2. Picks the matched template's `header_footer_template_id`, falling back to a letterhead with `is_default = true` from `useHeaderFooterTemplates()` — again, the **logged-in user's** list.
3. Has **no last-resort fallback** to "any owned letterhead".

For the active doctor (`54fa34d8…`):
- Their `Medical Certificate` template has `header_footer_template_id = NULL`.
- So step 1 produces a match but no linked id → falls to step 2.
- Step 2 *should* now succeed because the migration set their sole letterhead to `is_default = true`.

Re-running the data check confirmed the migration **did** apply. So why is the screenshot blank? Two suspects:

- **a)** `useHeaderFooterTemplates()` is filtering `user_id = auth.uid()` and the document being previewed was authored by a *different* doctor (not the logged-in viewer). The patient screenshot is on `/documents` — which on the patient side shows documents from multiple providers. Same root cause as the original `PatientDocuments` bug we already solved with `useDocumentHeaderFooter`.
- **b)** Even when viewed by the author, the inline code uses `templates.find(...)` against `useTemplates()` which is `user_id = auth.uid()` scoped — fine for the author themselves, so (b) only bites in the cross-user case.

Either way, the fix is the same: **delete the inline lookup and use the shared `useDocumentHeaderFooter` hook**, which already does author-scoped resolution + the `is_default` + "any owned" fallbacks.

## Changes

### `src/pages/Documents.tsx`

1. Import `useDocumentHeaderFooter` from `@/hooks/useDocumentHeaderFooter`.
2. **Extract the preview dialog body into a small inner component** `<DocumentPreviewBody document={previewDocument} />` so we can call the hook with the previewed document (hooks can't go inside `previewDocument && (...)` conditionals cleanly otherwise).
3. Inside `DocumentPreviewBody`:
   - `const { headerFooter } = useDocumentHeaderFooter(document);`
   - Render header/footer from `headerFooter.header` / `headerFooter.footer` using the existing `renderHFSectionPreview` helper.
   - Drop both inline IIFEs (lines 947–971 and 979–1003).
4. Leave the rest of the dialog (title, body via `renderFormattedContent`, Close/Share/Download buttons) unchanged.

That's it — no schema, no RLS, no other components.

## Why this finally works

`useDocumentHeaderFooter` resolves in this order:
1. `templates` matched by **the document's author** + `template_name` → `header_footer_template_id`
2. The **author's** `is_default = true` letterhead (now populated by Part B migration from last round)
3. The **author's** first letterhead by `is_default DESC, created_at ASC`

For the screenshot's Medical Certificate, step 2 will hit because the migration flagged the doctor's sole letterhead as default.

## Files touched

| File | Change |
|---|---|
| `src/pages/Documents.tsx` | Replace inline preview lookup with `useDocumentHeaderFooter`-powered `<DocumentPreviewBody>` |

## Out of scope

- No DB / RLS changes (already in place).
- No edits to `DocumentPreview`, `TodoList`, or `PatientDocuments`.
- No visual redesign — same dialog, same renderers, just a corrected data source.

