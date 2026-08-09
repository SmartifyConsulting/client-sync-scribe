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

## 6. Detailed Eating Plan (built on Biolog)
A richer eating plan the doctor builds per patient. It is not a parallel system — it is stored as a Biolog programme, so anything created here appears in the patient's Biolog, and any diet programme created in Biolog appears in the patient's Programmes tab.

**Permitted foods panel** — four columns: Proteins, Carbohydrates, Vegetables, Fats. Each entry shows the food name with its portion in grams, e.g. "Chicken breast (120g)", drawn from the patient's Biolog food library. Each column has its own colour so badges stay readable.

**Weekly meal calendar** — five slots per day: Breakfast, Snack, Lunch, Snack, Dinner. The doctor drops food badges into each slot; badges show name plus grams and carry their column colour. The view scrolls one week at a time with left/right arrows.

**Portion stepper** — each badge has +/- controls that scale the portion in 25% increments (25%, 50%, 75%, 100%, 125%...), with grams recalculated from the base portion.

**Patient adherence tick** — each day has a tick the patient presses to confirm they followed the plan. Each tick awards Vulas per the existing Vula reward matrix, once per day, no backdating beyond the current week.

## 7. Detailed Exercise Programme week strip
Directly below the eating plan week, a second scrollable week strip shows the assigned exercise programme: what is required each day (exercise, sets/reps or duration, from the Biolog exercise library) with the same week navigation and a per-day compliance tick and indicator. Doctors see compliance read-only; patients tick.

## 8. Two-way Biolog link
- A diet or exercise programme created in Biolog (by patient or doctor) is listed in the patient's Programmes tab.
- A Detailed Eating Plan or Detailed Exercise Programme a doctor builds in the Programmes tab is assigned to the patient and shows in Biolog > Programmes, and its daily requirements pre-fill the Biolog Today meal and exercise sections.
- Ticking a day in either place records the same adherence, so nothing is double-counted for Vulas.

## Technical notes
- `src/features/patients/components/PatientDetailsEditor.tsx`: add the `programmes` trigger + content before `documents`, and include it in `ADMIN_TABS` / `SECTION_TABS.admin`.
- `src/features/documents/components/DocumentsBrowser.tsx`: accept an optional template/type filter so the Programmes tab can list the programme documents alongside the live plans.
- `src/features/documents/templates/TemplateForm.tsx`: option label mapping, flex width change, and the default-selection effect (drop the "no initial value" guard, keep a user-cleared flag so "None" sticks).
- `src/hooks/useTemplates.ts`: rename the two seeded lifestyle defaults to "General ..."; add "Detailed Eating Plan" and "Detailed Exercise Programme" as templates that open the Biolog-backed builder rather than a text editor.
- Duplicate cleanup and renames run as a one-off data operation.
- Reuse existing Biolog tables — no parallel schema. `biolog_programmes` (kind `diet` / `exercise`) holds the plan; the weekly grid lives in its `targets` jsonb as day/slot entries `{ day, slot, food_id, base_grams, multiplier }` for diet and `{ day, exercise_id, sets, reps, duration }` for exercise. `biolog_programme_assignments` links the plan to the patient. Permitted foods and exercises come from `biolog_foods` / `biolog_exercises`.
- Only new table needed: `programme_adherence` (assignment_id, patient_user_id, date, ticked_at, vulas_awarded) with GRANTs, RLS letting the patient write their own ticks and the treating doctor read them.
- `biolog_programmes` / `biolog_programme_assignments` RLS is extended so a doctor with access to the patient can create and read their programmes.
- Vula awards reuse the existing rewards service used by medication adherence so the matrix stays single-sourced.


