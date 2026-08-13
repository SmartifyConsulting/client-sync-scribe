# Testing aid: show the internal pattern number, and summarise About Me for clinicians

Temporary, testing-only visibility of the internal pattern number, plus a cleaner clinician view of About Me.

## 1. Pattern number next to "How to work with this patient"

- In the clinician Overview card, show the internal pattern number (1-9) right after the heading, as a small muted badge, e.g. "How to work with this patient  ·  #4".
- Only rendered when a pattern has been derived; nothing shown for not started / incomplete / none-of-these.
- Marked clearly in code as a testing affordance so it is easy to remove later.
- Nothing changes in the patient-facing experience — the patient still never sees a number, label or score.

## 2. About Me in the doctor's patient view — summary instead of answers

Today the doctor sees "Chose: <question answer titles>". Replace that with the same short human-readable insight lines used on the Overview card:

- What may motivate them
- Communication
- Builds trust
- Be mindful of
- Useful approach

Plus:
- Status line (completed / started but not finished / not started) and confidence in words.
- The internal pattern number shown here too, as the same small testing badge.
- If the patient chose "none of these", show the existing quiet note rather than insight lines.

## Technical notes

- `src/features/patients/components/RelationshipInsightCard.tsx`: render `row.pattern` beside the heading.
- `src/features/patients/components/RelationshipProfileExercise.tsx`: in the `!isOwner` branch, drop the "Chose:" list and render `toOverviewInsight(row.pattern)` lines, confidence, and the pattern badge.
- No database, RLS or engine changes; `insights.ts` mapping untouched.
