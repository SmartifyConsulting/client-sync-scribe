

# Fix: Document Preview Should Render Header/Footer as 3-Column Layout

## Problem
The header/footer template system stores left, center, and right columns — matching the uploaded image (doctor details left, practice name center, contact right). However, the `useTemplateWithHeaderFooter` hook and all preview code joins these 3 sections into a single plain-text line with spaces (`parts.join("    ")`), destroying the columnar layout. The `DocumentPreview` component has no concept of structured header/footer sections — it just receives a flat string.

The user sees raw text instead of the professional 3-column letterhead shown in their uploaded image.

## Solution
Pass structured header/footer data to `DocumentPreview` and render it as a proper 3-column HTML grid, matching the layout in the `HeaderFooterTemplateForm` preview (which already uses `grid grid-cols-3`).

### 1. Update `DocumentPreview` Props & Rendering

**File:** `src/components/sessions/DocumentPreview.tsx`
- Add optional `headerFooter` prop (the `HeaderFooterTemplate` object)
- Before the main content `dangerouslySetInnerHTML`, render header as a 3-column grid:
  - Left column: left-aligned text (doctor names, MP numbers)
  - Center column: center-aligned text (practice name, address)
  - Right column: right-aligned text (contact details)
  - Horizontal rule below
- After main content, render footer the same way (with rule above)
- Support `imageUrl` in each section (for logos)

### 2. Update `useTemplateWithHeaderFooter` Return

**File:** `src/hooks/useTemplateWithHeaderFooter.ts`
- Stop embedding header/footer text into `formattedContent` — the formatted string should contain only the document body content (template content with placeholders replaced)
- The `headerFooter` object is already returned; consumers will use it directly

### 3. Update All Consumers to Pass `headerFooter` to `DocumentPreview`

**Files:** All places that render `DocumentPreview` and currently prepend/append header/footer text:
- `src/pages/TodoList.tsx` (line 126-137): Remove the text-join logic, pass `headerFooter` prop instead
- `src/components/dashboard/CompactTodoList.tsx`: Same fix
- `src/components/sessions/InvoiceEditor.tsx`: Pass `headerFooter` to `DocumentPreview`
- `src/components/sessions/PrescriptionEditor.tsx`: Pass `headerFooter`
- `src/components/sessions/ReferralLetterEditor.tsx`: Pass `headerFooter`
- `src/components/sessions/MedicalCertificateEditor.tsx`: Pass `headerFooter`
- `src/components/sessions/GeneralLetterEditor.tsx`: Pass `headerFooter`
- `src/components/sessions/HospitalAdmissionEditor.tsx`: Pass `headerFooter`

### 4. Update Print Export

**File:** `src/utils/documentExport.ts`
- Update `printDocument` to accept `headerFooter` object
- Render header/footer as 3-column HTML table in the print layout (matching the preview)

## Layout Structure (matching uploaded image)

```text
┌──────────────────┬──────────────────┬──────────────────┐
│ Dr. D. Allie:    │ BORDER ORTHO...  │ CONTACT DETAILS: │
│ MP 0409820       │ ADDRESS: Room... │ Practice Contact │
│ [Cell: ...]      │ Royal Buffalo... │ Number:          │
│ Dr. K. Daniel... │ Amalinda Avenue  │ 0434220461       │
│                  │ East London 5201 │                  │
├──────────────────┴──────────────────┴──────────────────┤
│                                                        │
│              Document content appears here             │
│                                                        │
├────────────────────────────────────────────────────────┤
│              REGISTRATION NO.:                         │
│              2022/414807/21                             │
└────────────────────────────────────────────────────────┘
```

## Files Modified

| File | Change |
|------|--------|
| `src/components/sessions/DocumentPreview.tsx` | Add `headerFooter` prop, render 3-column header/footer grid |
| `src/hooks/useTemplateWithHeaderFooter.ts` | Remove header/footer from `formattedContent` string |
| `src/utils/documentExport.ts` | Add 3-column header/footer to print layout |
| `src/pages/TodoList.tsx` | Pass `headerFooter` to DocumentPreview instead of text-joining |
| `src/components/dashboard/CompactTodoList.tsx` | Same |
| `src/components/sessions/InvoiceEditor.tsx` | Pass `headerFooter` prop |
| `src/components/sessions/PrescriptionEditor.tsx` | Pass `headerFooter` prop |
| `src/components/sessions/ReferralLetterEditor.tsx` | Pass `headerFooter` prop |
| `src/components/sessions/MedicalCertificateEditor.tsx` | Pass `headerFooter` prop |
| `src/components/sessions/GeneralLetterEditor.tsx` | Pass `headerFooter` prop |
| `src/components/sessions/HospitalAdmissionEditor.tsx` | Pass `headerFooter` prop |

