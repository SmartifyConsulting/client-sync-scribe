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

## 5. Clean up and rename the lifestyle templates
Confirmed in the database: the seeding pass created two "Eating Plan" and two "Exercise Programme" rows for the same account. Delete the duplicates (keep the oldest of each), then rename:
- "Eating Plan" becomes "General Eating Plan"
- "Exercise Programme" becomes "General Exercise Programme"

The seeded defaults are renamed to match so the duplicates don't come back on the next load.

## 6. New structured "Eating Plan" template
A second, richer eating plan the doctor builds per patient:

**Permitted foods panel** — four columns: Proteins, Carbohydrates, Vegetables, Fats. Each entry shows the food name with its portion in grams, e.g. "Chicken breast (120g)". The doctor picks foods per column; each column has its own colour so badges stay readable.

**Weekly meal calendar** — five slots per day: Breakfast, Snack, Lunch, Snack, Dinner. The doctor drops food badges into each slot; badges show name plus grams and carry their column colour. The view scrolls one week at a time with left/right arrows.

**Portion stepper** — each badge in a slot has +/- controls that scale that portion in 25% increments (25%, 50%, 75%, 100%, 125%...). The displayed grams recalculate from the base portion.

**Patient adherence tick** — each day has a tick the patient presses to confirm they followed the plan. Each tick awards Vulas per the existing Vula reward matrix, once per day, no backdating beyond the current week.

## 7. Exercise programme week strip
Directly below the eating plan week, a second scrollable week strip shows the exercise programme the doctor assigned: what is required each day (exercise, sets/reps or duration) with the same left/right week navigation and a per-day compliance tick and indicator. Doctors see a read-only compliance view; patients see the ticks.

## Technical notes
- `src/features/patients/components/PatientDetailsEditor.tsx`: add the `programmes` trigger + content before `documents`, and include it in `ADMIN_TABS` / `SECTION_TABS.admin`.
- `src/features/documents/components/DocumentsBrowser.tsx`: accept an optional template/type filter so the Programmes tab can request only the programme templates.
- `src/features/documents/templates/TemplateForm.tsx`: option label mapping, flex width change, and the default-selection effect (drop the "no initial value" guard, keep a user-cleared flag so "None" sticks).
- `src/hooks/useTemplates.ts`: rename the two seeded lifestyle defaults; add the structured "Eating Plan" as a new default with a `structured_eating_plan` category so the builder UI is used instead of plain text.
- Data cleanup runs as a one-off data operation (delete duplicates, rename survivors).
- New tables: `patient_meal_plans` (plan header per patient) with `patient_meal_plan_items` (day, slot, food, base grams, portion multiplier), `patient_meal_plan_foods` (permitted foods per column), and `programme_adherence` (patient, date, plan type, ticked_at, vulas_awarded). RLS: doctor with access to the patient can read/write the plan; the patient can read their plan and write only their own adherence ticks.
- Vula awards reuse the existing rewards service used by medication adherence so the matrix stays single-sourced.

