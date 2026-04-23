

# Plan: Bigger fonts + Preview/Edit icons on patient Documents tab

The Documents tab inside a patient's profile (`/patients/:id` → Documents) currently uses 7–10px fonts and only renders a Send icon per row. The user wants:

1. **Font size = 11px** for all row text (name, date, badges).
2. **Preview** and **Edit** icons added to each row, matching the row pattern used on the doctor home page / Documents page.

## File touched

`src/pages/PatientProfile.tsx` — the Documents tab row renderer (lines ~738–807).

## Changes

### 1. Bump font sizes to 11px

| Element | Current | New |
|---|---|---|
| Document name | `text-[10px]` | `text-[11px]` |
| Date below name | `text-[9px]` | `text-[11px]` |
| `DRAFT` pill | `text-[7px]` | `text-[11px]` (with `px-2 py-0.5` so the pill grows proportionally) |
| Template-name pill | `text-[8px]` | `text-[11px]` (with `px-2 py-0.5`) |

Icons in the avatar circle bump from `h-4 w-4` to keep visual balance with the new type size; the circle stays `h-8 w-8`.

### 2. Add Preview + Edit icon buttons

Insert two icon buttons immediately to the **left** of the existing green Send arrow, in this order: **Preview · Edit · Send**. Each is a 28×28 ghost button with a 16×16 icon, matching the patterns already used in `Documents.tsx` and `TodoList`.

- **Preview** (`Eye` icon, `text-muted-foreground hover:text-foreground`):
  - Opens the standardized `<DocumentPreview>` component already imported elsewhere in the project. Reuses the same `DocumentPreviewWithLetterhead` wrapper introduced for the Documents page so the letterhead/header-footer renders identically. Add a small piece of local state (`previewDoc: Document | null`) to control the dialog.
- **Edit** (`Edit3` icon, `text-muted-foreground hover:text-foreground`):
  - Opens the existing `DocumentEditor` modal (already imported in this file as `DocumentEditor`) preloaded with the document's `name`, `content`, `template_name`, `patient_id`, and `id`. On save, call `fetchDocuments()` to refresh the list.
  - Add `editingDoc: Document | null` local state.
- **Send** stays unchanged in behaviour and position (rightmost). Bumped from `h-3 w-3` to `h-4 w-4` to match the new icon size.

Both new buttons use `e.stopPropagation()` so they don't trigger the row's navigate-to-Documents click handler.

### 3. Tighten row layout for the wider content

- Row gap stays `gap-3`; right-side action cluster wrapped in `<div className="flex items-center gap-1">` so the three icons sit flush.
- Row vertical padding stays `p-3`; the slightly taller text is comfortably accommodated.

## Out of scope

- Changing the doctor-side `Documents.tsx` row (already has these icons after the prior plan).
- Patient-facing documents list (different component, different request).
- Changing the avatar icon, the divider styling, or the empty-state.
- Wiring a brand-new editor — the existing `DocumentEditor` modal is reused as-is.

