# Undo the structured meal planner and exercise week strip

Removes items 6 and 7 of the previous plan (the interactive eating-plan planner with the food palette, and the exercise week strip below it). Everything else from that plan stays: the Programmes tab itself, the Biolog tab, the template clean-up, header/footer fixes and the weigh-in Vula awards.

## What changes

- The Programmes tab on the patient profile goes back to its original behaviour from item 1: a documents view filtered to programme-type records only (Exercise Programme and Eating Plan), with the empty state "No programmes yet."
- The food palette (Proteins / Carbohydrates / Vegetables / Fats columns, gram badges, unit steppers), the weekly 5-slot meal calendar, the per-slot instructions and the exercise week strip are removed from the UI.
- The per-slot and per-day adherence ticks that awarded Vulas for meals and exercise go away with the planner.
- Weigh-ins stay: the weigh-in card and the 50 Vulas-per-kilogram-lost award remain on the Programmes tab.

## Database

The planner tables (meal plans, plan foods, slot items, slot instructions, exercise plans, exercise plan days, programme adherence) are left in place but unused, so no data is destroyed and the planner can be brought back later. Say the word if you would rather have them dropped in a migration.

## Technical notes

- Delete `src/features/programmes/components/ProgrammePlanner.tsx` and the meal/exercise/adherence hooks in `src/features/programmes/usePatientProgrammes.ts` (keep `useWeighIns` and the weigh-in types).
- `src/features/programmes/components/PatientProgrammesTab.tsx`: replace the planner column with `DocumentsBrowser` filtered to the programme template types; keep `WeighInCard` in the side column.
- Trim the planner-only types from `src/features/programmes/types.ts`, keeping `VULA_MATRIX.perKilogramLost` and `kgToStones`.
- No changes to `PatientProfile.tsx` / `PatientDetailsEditor.tsx` tab wiring.
