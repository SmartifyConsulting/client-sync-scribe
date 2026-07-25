# UI Polish – outstanding items

Audit of the codebase confirmed that most of the previously agreed items were never actually applied. Below is exactly what still needs to be done, in the order I'll ship it.

## 1. Footer alignment (global)
`src/components/layout/Footer.tsx` currently uses `mx-auto` + `justify-center` inside a `max-w-7xl`. Page headings live in narrower containers (`max-w-5xl`, `max-w-3xl`) and are left-aligned.

- Change footer inner container to `justify-start`.
- Match the page-content gutter used by `AppLayout` / `PatientAppLayout` / `ProviderAppLayout` (same `px` + `max-w-*` used for the page heading wrapper) so the copyright text starts at the same x-position as each page's `<h1>`.

## 2. Heading normalization
Every page heading is still `text-3xl font-bold`. Standardize on `text-base font-semibold` H1 + `text-xs text-muted-foreground` subtext for:
- `src/pages/MySessions.tsx`
- `src/pages/Documents.tsx`
- `src/pages/TodoList.tsx`
- `src/pages/ReferralDoctors.tsx`
- `src/pages/MyPractice.tsx` (already-normalized tabs stay as-is)

## 3. Button parity
- `ReferralDoctors.tsx`: make both add buttons `size="sm" variant="outline"` (matching My Practice tab-body buttons).
- `HospitalAdmissionEditor.tsx`: apply `size="sm"` to Cancel/Save footer buttons.
- `ManualLogAdmissionDialog.tsx` and `UploadAdmissionDialog.tsx`: change primary Save/Log/Upload buttons to `size="sm" variant="default"` with the same rounded/padding used by the My Practice section buttons.
- Credentials screen: audit `ProviderVettingForm` (closest match) and apply the same button size reduction.

## 4. Accordion standard cleanup
Extend the green-when-open pattern already used in `MyPractice`/`MySessions`/`Sessions`:
- `PatientDetailsEditor.tsx` nested triggers at ~line 2027 and ~3541: apply `data-[state=open]:bg-primary data-[state=open]:text-white` and `hover:bg-muted` (light grey).
- `EmergencyContactsInline.tsx`: same treatment on nested items.
- Add `hover:bg-muted` on every collapsed accordion row and on the template cards in `Documents.tsx`.

## 5. Add-Task composer redesign
In `src/pages/TodoList.tsx` and `src/components/dashboard/CompactTodoList.tsx`:
- Collapse the composer by default: show only a green primary `Add task` button (+ mic).
- Clicking `Add` reveals the input inline; blurring an empty input collapses it again.
- Keeps the dictation mic button visible in both states.

## 6. Documents parity (Patient ↔ Doctor)
- Introduce a shared `DocumentsList` component with:
  - Column-header row (Name · Type · Date · Actions).
  - Group-by toggle: Type / Date / Patient (Patient only shown for doctors).
  - Only the first group expanded by default; light-grey hover on rows.
- Refactor `src/pages/patient/PatientDocuments.tsx` and `src/pages/doctor/DoctorDocumentsTab.tsx` to render it. Doctor version gains CRUD actions matching the patient version.

## 7. Doctor Tasks grouping
In `src/pages/TodoList.tsx` (shared), when the user is a doctor:
- Add a Group-by control: Date (default) | Patient.
- Date buckets: `Today`, `This Week`, `This Month`, then per-year (`2026`, `2025` …).
- Only the top bucket expanded by default; other buckets collapsed.
- Patient grouping reuses the existing per-patient grouping already in place.

## Technical notes
- No schema changes; all work is in `src/` presentation layer.
- Colours are untouched — only tokens `bg-primary`, `text-white`, `bg-muted`, `text-muted-foreground` are used.
- Shared `DocumentsList` will live at `src/features/documents/components/DocumentsList.tsx` to avoid bloating either page.
- I'll flush the HMR gate after each batch and spot-check the preview so you actually see the changes this time.
