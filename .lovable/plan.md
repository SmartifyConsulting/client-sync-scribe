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

## 5. Clean up duplicate programme templates
One account currently holds two copies each of "Eating Plan" and "Exercise Programme" (confirmed in the templates table). Delete the duplicate of each, then rename the surviving ones to "General Eating Plan" and "General Exercise Programme", and update the seeding logic so those names are used going forward and duplicates can't be re-created.

## 6. New structured "Eating Plan" template (meal planner)
A second, richer eating plan template that is an interactive planner rather than a letter.

Doctor side — food palette:
- Four colour-coded columns of permitted foods: Proteins, Carbohydrates, Vegetables, Fats.
- Each food shows its portion in grams in brackets, e.g. "Chicken breast (120g)".
- A unit stepper adjusts the portion up or down in 25% increments (75%, 100%, 125%…), and the badge's grams update accordingly.

Weekly calendar:
- Each day has 5 slots: Breakfast, Snack, Lunch, Snack, Dinner.
- Foods are placed into slots as badges, colour-coded by food group, each showing grams in brackets.
- The calendar scrolls week by week with left/right arrows.

Patient side:
- A tick button per day (and per slot) to confirm adherence.
- Each tick awards Vulas according to the existing Vula reward matrix, reusing the current rewards service rather than a new points path.

## 7. Exercise programme week strip
Directly below the eating plan week, a second scrollable week strip showing what is required each day from the selected exercise programme template, with the same tick/compliance indicator per day and matching left/right week navigation.

## 8. Patient Biolog tab for doctors
Add a Biolog tab immediately after Session History on the patient profile. It renders the full Biolog experience for that patient — Today, History, Insights, Programmes and Customise — with the doctor able to edit and customise on the patient's behalf (the existing read-only doctor view is widened for this tab).

## Technical notes
- `src/features/patients/components/PatientDetailsEditor.tsx`: add the `programmes` trigger + content before `documents`, and a `biolog` tab after Session History; include both in the tab visibility lists.
- `src/features/documents/components/DocumentsBrowser.tsx`: accept an optional template/type filter so the Programmes tab can request only Exercise Programme and Eating Plan.
- `src/features/documents/templates/TemplateForm.tsx`: option label mapping, flex width change, and the default-selection effect (drop the "no initial value" guard, keep a user-cleared flag so "None" sticks).
- `src/hooks/useTemplates.ts`: rename the seeded programme templates, de-duplicate, and register the new structured eating plan kind.
- New schema: a meal-plan table (plan per patient, slot assignments with food, group, grams, unit multiplier) plus a daily adherence table for eating and exercise ticks, all with RLS scoped to the patient and their connected doctors, and GRANTs for authenticated/service_role.
- New components under `src/features/programmes/`: food palette, week calendar strip, exercise week strip, shared tick/adherence control wired to `src/services/supabase/rewards.ts`.
- Doctor Biolog tab reuses the existing `src/features/biolog/*` components with `ownerUserId` set to the patient's user id and `readOnly` off.

