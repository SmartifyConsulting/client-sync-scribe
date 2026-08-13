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

## 3. Fuller assessment result (clinician side)

The two selections should produce a structured result rather than a single line. Shown in the Overview card and in the doctor's About Me summary:

- Probable pattern (primary)
- Secondary possibilities (one or two close candidates)
- Confidence level (Emerging / Moderate / Strong)
- Evidence from the first question set (the description the patient identified with)
- Evidence from the second question set
- Areas requiring confirmation — what a clinician could gently check in conversation
- Communication insights (the existing motivates / communication / trust / mindful / approach lines)

Testing-only display, exactly as requested, shown at the top of the block:

```text
Probable pattern: Type 3
Confidence: Moderate
Secondary possibilities: Type 1 / Type 7
```

This testing block is clearly flagged in code so it can be removed in one edit. The patient never sees any of it.

## 4. History timeline — newest first, collapsed months

The Overview history timeline currently groups by year and can run very long.

- Sort events newest first inside each year (years already run newest first).
- Add a month level inside each year: events grouped by month, each month collapsible.
- All months start collapsed except the most recent month of the most recent year, so the screen stays short.
- Event counts shown on each month header, same visual language as the year headers.

## Technical notes

- `src/features/patients/components/RelationshipInsightCard.tsx`: render `row.pattern`, secondary candidates and evidence beside/below the heading.
- `src/features/patients/components/RelationshipProfileExercise.tsx`: in the `!isOwner` branch, drop the "Chose:" list and render the structured result.
- `src/features/patients/relationship/insights.ts`: extend the config with secondary candidates and "areas to confirm" per pattern, and expose the chosen option titles as evidence. Bump `ENGINE_VERSION`.
- `src/features/patients/components/PatientOverview.tsx` (`renderSummaryTimeline`): descending sort within year plus a nested month `Collapsible`.
- No database, RLS or migration changes.

