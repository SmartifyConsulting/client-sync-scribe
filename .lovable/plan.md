

# Auto-Created Documents: Template Integration, Preview with Templates, and Edit Button

## Problems Identified

1. **Auto-created documents don't use templates**: The `process-todo-actions` edge function and `useSessions.ts` generate documents with hardcoded HTML content instead of fetching the doctor's saved templates and header/footer layouts.

2. **Document preview doesn't show header/footer**: The document preview dialog (lines 923-980) renders raw content without looking up and displaying the linked header/footer template based on `template_name`.

3. **No edit button on document records**: The document list (lines 599-661) has Preview, Share, Export, Print, and Delete buttons but no Edit button.

## Solution

### 1. Edge function: Use doctor's templates when auto-creating documents

**File: `supabase/functions/process-todo-actions/index.ts`**

Before generating document content, fetch the doctor's content template (by name match: "Medical Certificate", "Referral Letter", "General Letterhead") and its linked header/footer template. Use the template's content as the base, replacing placeholders with extracted data. If no template exists, fall back to the current hardcoded HTML.

Similarly update `src/hooks/useSessions.ts` for the hospital admission auto-creation to fetch the doctor's "Hospital Admission" template.

### 2. Document preview: Show header/footer from matched template

**File: `src/pages/Documents.tsx`** (Document Preview Dialog, lines 923-980)

When previewing a document, look up the content template by `template_name` match, find its linked `header_footer_template_id`, and render the header/footer sections (using the existing `renderHFSectionPreview` helper) above and below the document content. Fall back to the default header/footer template if no specific link exists.

Also apply this to the PDF export and print functions so exported documents include headers/footers.

### 3. Add Edit button to document records

**File: `src/pages/Documents.tsx`**

- Add an Edit button (pencil icon) to each document row in the document list (between Preview and Share buttons)
- Add state for `editingDocument`
- Create an edit dialog with a text area/rich editor pre-filled with the document content and name
- On save, call `updateDocument` from `useDocuments` hook (already implemented)

## Files Modified

| File | Change |
|------|--------|
| `supabase/functions/process-todo-actions/index.ts` | Fetch doctor's templates before generating document content; use template content with placeholder replacement |
| `src/hooks/useSessions.ts` | Fetch hospital admission template for auto-created admission docs |
| `src/pages/Documents.tsx` | Add Edit button to doc list; show header/footer in preview dialog; add edit document dialog |

