# Programmes Tab + Template Header/Footer Fixes

## 1. New "Programmes" tab on the patient profile
Add a Programmes tab immediately before Documents in the patient tab bar (both the doctor-viewed profile and the patient's own self-service view).

Content: a documents view filtered to programme-type records only — Exercise Programme and Eating Plan — reusing the shared documents browser so search, grouping and inline launch behave exactly like the Documents tab. Empty state: "No programmes yet."

Rationale: exercise/eating programmes are long-running care plans, so they get their own place instead of being buried among invoices and certificates. They remain visible in Documents as well.

## 2. Header dropdown no longer shows "Header and Footer"
Every account has one seeded letterhead literally named "Header and Footer", so both dropdowns show that confusing label. Fix the display only (no data change):
- In the Header dropdown, a letterhead named "Header and Footer" is listed as "Default Header".
- In the Footer dropdown, the same record is listed as "Default Footer".
- Custom letterheads keep their own names.

## 3. Roomier Header / Footer fields
In Edit Content Template, shrink the Name field and give the two dropdowns more room: Name goes from flex-[2] to flex-1 while Header and Footer each grow, so their names are no longer truncated.

## 4. Always pre-select the default letterhead
Header and Footer both default to the letterhead flagged as default (falling back to the first letterhead that actually has content in that section) whenever nothing is selected — on new templates and on existing templates saved without a header/footer link. "None" stays available if the doctor clears it manually.

## Technical notes
- `src/features/patients/components/PatientDetailsEditor.tsx`: add the `programmes` trigger + content before `documents`, and include it in `ADMIN_TABS` / `SECTION_TABS.admin`.
- `src/features/documents/components/DocumentsBrowser.tsx`: accept an optional template/type filter so the Programmes tab can request only Exercise Programme and Eating Plan.
- `src/features/documents/templates/TemplateForm.tsx`: option label mapping, flex width change, and the default-selection effect (drop the "no initial value" guard, keep a user-cleared flag so "None" sticks).
