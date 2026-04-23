
Fix the remaining document preview paths so session-generated documents always show real values instead of raw placeholders.

## What is still broken

The current route is `/doctor-dashboard`, which renders `CompactTodoList`. That component still uses an old preview path that only replaces a few doctor tokens (`[PracticeNumber]`, `[DoctorName]`, etc.). It does not resolve:

- patient placeholders
- invoice placeholders
- prescription indexed slots like `[Medication1]`, `[Dosage1]`
- session-linked data needed after auto-generation

There are also other preview surfaces still rendering raw `document.content` directly:

- `src/components/dashboard/CompactTodoList.tsx`
- `src/pages/PatientProfile.tsx`
- `src/pages/patient/PatientDocuments.tsx`
- `src/pages/Documents.tsx` still has raw-content fallback rendering in `DocumentPreviewBody`

So even though some preview flows were fixed earlier, the dashboard/admin/patient preview entry points are not all using the same resolution logic.

## Implementation

### 1. Add one shared document-preview resolver
Create a shared helper that loads all context needed for previewing a stored document before rendering it.

**New helper:** `src/lib/resolveDocumentPreviewContent.ts`

It will:
- accept a `documents` row
- fetch:
  - `patients` row when `patient_id` exists
  - doctor `profiles` row from `user_id`
  - matching `invoices` row when `template_name` is invoice-related and `session_id` exists
  - matching `prescriptions` rows when `template_name` is prescription-related and `session_id` exists
- build a `prescription` object for `fillDocumentPlaceholders(...)`
- replace `[DoctorSignature]` with the stored signature image
- return:
  - `resolvedContent`
  - `logoUrl`
  - `template/user metadata`
  - `didChange` so callers can auto-heal the stored `documents.content`

For prescriptions, prefer:
- rows from `prescriptions` filtered by `session_id`
- fallback to latest active/current patient prescriptions if the session-linked rows are missing

### 2. Use the shared resolver in every preview entry point
Replace all ad-hoc preview logic with the shared resolver in:

- `src/components/dashboard/CompactTodoList.tsx`
- `src/pages/TodoList.tsx`
- `src/pages/Documents.tsx`
- `src/pages/PatientProfile.tsx`
- `src/pages/patient/PatientDocuments.tsx`

That means every preview modal will pass resolved content into `DocumentPreview`, not raw `document.content`.

### 3. Fix dashboard preview specifically
Update `CompactTodoList.tsx` so the doctor dashboard preview behaves the same as the main To-Do page.

Today it only does string replace for a few doctor fields. Replace that entire block with the same full resolver used elsewhere.

This is the likely reason the user is still seeing “no data” from the dashboard preview.

### 4. Ensure prescription previews resolve session medication data
Extend the preview resolution path so prescription templates with indexed tokens work everywhere:

- `[Medication1]`, `[Medication2]`, `[Medication3]`
- `[Dosage1]`, `[Quantity1]`, `[Frequency1]`, `[Instructions1]`
- `[PrescriptionDate]`
- `[NumberOfRepeats]`
- `[SpecialInstructions]`

The resolver will populate these from real prescription rows linked to the session/patient before the preview opens.

### 5. Remove raw-content preview fallbacks
Update remaining components that still directly render `document.content` / `doc.content` without resolution:

- `src/pages/PatientProfile.tsx`
- `src/pages/patient/PatientDocuments.tsx`
- `src/pages/Documents.tsx` (`DocumentPreviewBody` raw-content branches)

They should either:
- use `DocumentPreview` with resolved content, or
- run the shared resolver before any `dangerouslySetInnerHTML`.

### 6. Keep lazy auto-heal for legacy docs
When the resolved content differs from stored `documents.content`, update the document row so later previews, emails, and prints are already clean.

This should be applied consistently in every preview path, not only some of them.

## Files touched

| File | Change |
|---|---|
| `src/lib/resolveDocumentPreviewContent.ts` | New shared resolver for stored document previews |
| `src/components/dashboard/CompactTodoList.tsx` | Replace old doctor-only placeholder substitution with full resolver |
| `src/pages/TodoList.tsx` | Refactor to use shared resolver |
| `src/pages/Documents.tsx` | Refactor preview flow and remove raw-content fallback rendering |
| `src/pages/PatientProfile.tsx` | Resolve stored document content before preview |
| `src/pages/patient/PatientDocuments.tsx` | Resolve stored document content before preview |
| `src/lib/fillDocumentPlaceholders.ts` | Reuse existing prescription/invoice support; only minor extension if resolver needs extra fields |

## Expected result

After this change:
- previews opened from the doctor dashboard will show real data
- prescription previews will show medication data from the session
- patient/admin/document-library preview surfaces will behave consistently
- legacy docs will self-heal after first preview

## Out of scope

- Changing document templates themselves
- Reworking session AI extraction
- Redesigning the preview modal UI
- Database schema changes
