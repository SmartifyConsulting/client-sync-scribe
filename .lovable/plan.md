## 1. Accordion breathing room

In `src/components/ui/section-accordion.tsx`, add a shared content-padding class (top padding + inner row spacing) and apply it wherever `SECTION_FRAME_CLASS` accordions render their `AccordionContent`: My Practice, My Sessions, My Tasks, Documents, the dashboard To-Do list and Personal / Medical Information. Result: a clear gap between the green header row and the first sub-row, and consistent spacing between sub-rows.

## 2. All-green accordion headers

Add a `SECTION_TRIGGER_ALWAYS_GREEN_CLASS` variant that keeps the primary/green background with white text in both open and collapsed states (chevron and count pill included). Apply it so that **every** accordion heading row is green with white text at all times on:
- **My Sessions**
- **My Tasks** (and the dashboard To-Do card)
- **Documents** (all grouping modes)

On each of these screens the **top row is expanded by default** and all other rows start collapsed. Other screens (My Practice, Personal / Medical Information) keep the existing behaviour: green only when expanded.

## 3. My Tasks frame width

Change `src/pages/TodoList.tsx` from `max-w-3xl` to the same `max-w-5xl` container used by My Sessions and Documents, so the three screens line up.

## 4. Alphabet letter buttons (Patients)

In `src/pages/Patients.tsx`, restyle the A–Z strip: transparent background with a thin grey border, normal foreground text, no fill. On hover, fill with a light muted/primary tint. The selected letter and "All" keep the solid green fill. Letters with no patients stay disabled with a lighter border and muted text.

## 5. Add Document button (doctor's Documents screen)

On `src/pages/doctor/DoctorDocumentsTab.tsx`, add an **Add Document** button top-right next to the grouping toggle, with a dropdown listing document types from `useTemplates` (Medical Certificate, Referral Letter, Prescription, General Letterhead, Invoice, Hospital Admission Form, plus custom templates). Choosing one opens the existing `DocumentEditor` with that template loaded, reusing the current save flow so the new document appears in the list.

## 6. Colour-coded document type badges

A shared helper maps a document/template name to a colour pair (background tint + matching text) — certificate, referral, prescription, invoice, admission, letter, neutral fallback — applied to the badge in `DocumentCard`. Colours come from existing semantic tokens; no new palette values, no hardcoded hex.

## 7. Group by Document type

Add a third grouping option: **Date · Type · Patient** (Date default). Type mode buckets by `template_name` (fallback "Other"), sorted alphabetically, using the same frame, count pills and green headers.

## 8. Templates tab under Documents

Make the doctor's Documents page a two-tab screen:
- **All Documents** — the grouped document list (items 5–7).
- **Templates** — the existing template manager (`src/pages/Documents.tsx` rendered with its header hidden), covering content templates and header/footer templates.

Tabs use the standard green `TabsList` with white active styling.

## Technical notes

- Files: `src/components/ui/section-accordion.tsx`, `src/pages/Patients.tsx`, `src/pages/doctor/DoctorDocumentsPage.tsx`, `src/pages/doctor/DoctorDocumentsTab.tsx`, `src/pages/MySessions.tsx`, `src/pages/TodoList.tsx`, `src/components/dashboard/CompactTodoList.tsx`, `src/pages/MyPractice.tsx`, `src/components/patients/PatientDetailsEditor.tsx`, plus a new `src/lib/documentTypeColors.ts`.
- No schema changes; document creation uses the existing `useDocuments.createDocument` path.
