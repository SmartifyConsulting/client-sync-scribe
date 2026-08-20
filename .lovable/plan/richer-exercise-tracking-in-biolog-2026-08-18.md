# Richer exercise tracking in Biolog

Today the Exercise section is a flat checkbox list of every exercise with a single duration box and a performance number. It should work like the imported Biolog app: pick a category first (Cardio, Strength/Weight Training, Flexibility, Sports), then the activity, then log detail on sliding scales.

## What you'll see

1. **Category chips** at the top of the Exercise accordion: Cardio, Strength, Flexibility, Sports (from the category already stored on each exercise). Tapping one reveals only that category's activities, so choosing "Cardio" then "Swimming" is two taps instead of scrolling the whole list.
2. **Per-activity log card** once an activity is ticked, with fields that match the activity type:
   - Duration (minutes) — number input, all types
   - Intensity — 1-10 slider with plain labels (Easy to Max effort)
   - Effort/RPE feel — 1-10 slider ("How hard did it feel?")
   - Cardio only: Distance (km) and optional average heart rate
   - Strength only: Sets, Reps, Weight (kg)
   - Optional short note per activity
3. **Session summary line** per activity (e.g. "Swimming - 40 min, 1.5 km, intensity 7") and a day total for minutes across all logged activities.
4. **Custom activities** still come from the Customise tab and slot into their category automatically; anything without a recognised category falls under "Other".

## Technical notes

- Extend `EntryExercise` in `src/features/biolog/types.ts` with optional `intensity`, `effort`, `distance`, `heartRate`, `sets`, `reps`, `weight`, `note`. All optional, so existing entries keep working (`performance` stays supported and is shown as Effort).
- Rework only the Exercise `AccordionItem` in `src/features/biolog/BiologToday.tsx`: group `exercises` by `category`, render category chips with local state for the selected category, and a per-activity detail card using the existing shadcn `Slider` and `Input` components. Continue writing through the existing `setExerciseField`-style updater (generalised to accept any field).
- Update `src/features/biolog/BiologHistory.tsx` so the Exercise summary line includes intensity/distance when present.
- No database migration needed: entries are stored in the JSON `payload` on `biolog_entries`.
- No colour changes; styling stays with the existing green section accordions and current font sizes.
