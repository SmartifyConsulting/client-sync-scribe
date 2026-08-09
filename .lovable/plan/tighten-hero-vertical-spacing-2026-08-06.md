# Tighten hero vertical spacing

Goal: pull the capability wave graphic and everything below it upward to close the empty gaps in the hero, without changing the logo, copy or card mosaic positions.

## Changes (src/pages/Landing.tsx)

1. Measure the two gaps in the rendered hero (headless browser):
   - Gap A: bottom of the hero top row (copy column / card mosaic, whichever is lower) to the top of the capability wave image.
   - Gap B: bottom of the wave image to the top of the bottom row (CTA buttons + Holarc Help SOS card).

2. Capability wave block: raise it by two-thirds of Gap A using a negative top margin (replacing the current `-mt-2 lg:-mt-6`), so only one-third of the original whitespace remains above it.

3. Bottom row (CTA buttons, trust chips, Holarc Help SOS card) and everything after it: raise by half of Gap B with a negative top margin on the bottom-row grid. Because the whole block shifts, the app-download strip and the section below move up with it.

4. Re-measure after the edit to confirm the resulting gaps are ~1/3 and ~1/2 of the originals, and that nothing overlaps at desktop (1491px), tablet and mobile widths.

## Notes

- Shifts are applied only on `lg` and up (mobile keeps its stacked spacing) so the narrow layout does not collapse.
- No content, copy, colour or component changes — spacing only.

---

# Hospital Admissions screen rework

## Tabs (AdmissionsScreen.tsx)

- Remove the "Admissions" tab (the incoming/authorisation list) from the tab strip.
- Rename the remaining "Inpatients" tab to "Admissions" — with only one tab left, drop the tab strip entirely and render the inpatient list directly as the page body.
- Keep the `?tab=inpatients` redirect working (it just lands on the same page).

## Admissions list (InpatientsScreen.tsx)

- Header title becomes "Admissions".
- Table header row styled green: `bg-primary text-white` (semantic tokens), replacing the muted grey header.
- Rows become hyperlinkable: clicking a record opens that patient's record/chart. The name cell links to the patient route when the admission has a linked `patient_id`; otherwise the row opens the existing admission detail dialog. Action buttons keep their own click handling (stop propagation) so the link does not fire.
- Replace the flat table frame with an accordion (shared `section-accordion`) grouped by patient name:
  - One accordion group per patient, header shows the patient name plus admission count and latest ward/status.
  - Groups ordered by most recent admission first (newest `admitted_at` at the top).
  - Inside each group, that patient's admissions listed newest first, using the same columns (ward/bed, doctors, nurses, admitted date, actions) with the green header row.
- Search and status chips keep filtering before grouping.
