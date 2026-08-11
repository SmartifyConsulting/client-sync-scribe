# Session previews, clinician notes styling, admissions accordion

## 1. Invoice preview button
In the post-session invoice step, the summary card only offers a "Preview Invoice" button that switches to the detail stage. Add a proper eye-icon **Preview** action on the invoice summary itself, and keep the Preview button on the invoice detail stage so the full letterhead invoice can always be opened in one click.

## 2. Previews must sit in front of the message box
The document preview is rendered inline in the page while the step dialog is portalled to the body, so the preview lands behind it. Fix:
- Render the preview through a portal at a higher layer than dialogs and toasts.
- Add a clear X close button (top-right) plus the existing Back/Close footer action, so closing the preview returns the user to the step dialog / message box.

## 3. AI Clinician notes readability
- Body text matches the Patient Overview scale (12px, relaxed leading, foreground colour).
- Section headings bold.
- Pastel section frames:
  - Working Impression — pastel yellow
  - Safety Checks — pastel pink
  - Differentials — pastel blue
  - Suggested Checks — pastel green
- All pastel tints added as semantic tokens in the design system (light + dark), not hardcoded colours.

## 4. Remove remaining noise
The parser only strips severity markers at the very start of a line. Strengthen it so `[CAUTION]`, `[NOTE]`, `[WARNING]`, `[CRITICAL]` and bare "Caution:"/"Note:" prefixes are removed anywhere they lead a fragment (including after bullets and mid-line "Rule out" joins), plus collapse near-duplicate lines that repeat the same clinical point.

## 5. Hospital Admissions accordion
Restyle the inner admission rows in the hospital Admissions/Inpatients view to use the same shared section styling as Patient Personal Information: always-green white-text triggers, 12px bold labels, matching padding, count pills and bordered frame — so both screens read identically.

## Technical notes
- Files: `src/features/sessions/components/PostSessionStepDialog.tsx`, `DocumentPreview.tsx`, `ClinicianNotesAccordion.tsx`, `src/features/sessions/utils/clinicianNotesSections.ts`, `src/features/sessions/lib/clinicianHighlights.tsx`, `src/modules/holarchelp/pages/provider/hospital/InpatientsScreen.tsx`, `src/index.css` + `tailwind.config.ts` for the pastel tokens.
- No database or business-logic changes.
