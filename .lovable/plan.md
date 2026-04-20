

# Plan: Show Header & Footer when Previewing Documents from To-Do List

## Why it's missing now

`src/pages/TodoList.tsx` previews documents but resolves the letterhead via:

```ts
const { headerFooter } = useTemplateWithHeaderFooter("General");
```

That hook is hard-coded to look up a template literally named **"General"** owned by the *current user*. If the document was generated from a different template (Invoice, Prescription, Referral Letter, Medical Certificate, Hospital Admission…), or if the doctor's header/footer isn't linked to the "General" template, the header/footer never resolves and the preview renders without letterhead.

We already built the right hook for this — `useDocumentHeaderFooter(document)` (used by `PatientDocuments`) — which resolves the letterhead from the **document's own `template_name` + author `user_id`**, with a fallback to the author's default letterhead.

## Changes

### 1. `src/pages/TodoList.tsx`

- **Replace** `useTemplateWithHeaderFooter` import + call with `useDocumentHeaderFooter` from `@/hooks/useDocumentHeaderFooter`.
- Extend `previewDoc` state to also carry `userId` and `templateName` from the fetched document row:
  ```ts
  const [previewDoc, setPreviewDoc] = useState<{
    content: string;
    title: string;
    logoUrl?: string;
    fontFamily?: string;
    userId?: string;
    templateName?: string;
  } | null>(null);
  ```
- In `handlePreviewDoc`, after fetching `doc`, populate `userId: doc.user_id` and `templateName: doc.template_name` on the state. Drop the eager `headerFooter?.font_family` (it'll come from the resolved letterhead).
- Use the new hook **inside the render block** keyed off `previewDoc`:
  ```ts
  const { headerFooter } = useDocumentHeaderFooter(
    previewDoc ? { user_id: previewDoc.userId, template_name: previewDoc.templateName } : null
  );
  ```
  Pass `headerFooter={headerFooter}` and `fontFamily={previewDoc.fontFamily ?? headerFooter?.font_family}` into `<DocumentPreview>`.
- Remove the now-unused `useTemplateWithHeaderFooter` import.

### 2. No other files change

- `useDocumentHeaderFooter`, `DocumentPreview`, and the patient-side RLS policies added in the previous task already do the right thing.
- Doctor-side preview in `Documents.tsx` and editor previews are unaffected.

## Files touched

| File | Change |
|---|---|
| `src/pages/TodoList.tsx` | Swap `useTemplateWithHeaderFooter("General")` → `useDocumentHeaderFooter(previewDoc)`; thread `user_id` + `template_name` through preview state |

## Out of scope

- No DB / RLS changes (already in place).
- No edits to `DocumentPreview`, the formatter, or any editor.
- No visual redesign — purely fixes letterhead resolution so headers/footers actually render.

