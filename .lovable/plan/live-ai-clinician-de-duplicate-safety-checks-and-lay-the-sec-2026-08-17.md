# Live AI Clinician: de-duplicate Safety Checks and lay the sections out in four columns

## 1. Stop the repetition in Safety Checks

The current de-duplication only collapses lines that are exact matches after stripping filler words, so the model's re-phrasings survive as separate bullets. In the screenshot the IBS/Iberogast point appears three times and "severe abdominal pain or vomiting" twice.

Changes to the parser:
- **Similarity-based merge** instead of exact key match: compare each new bullet against bullets already kept in the same section using word-overlap (Jaccard on meaningful words). Above ~0.6 overlap, treat it as the same point and keep the longer, more informative wording.
- **Subset suppression**: if a new bullet's meaningful words are fully contained in an existing bullet (or vice versa), keep only the richer one — this removes "documented history of irritable bowel syndrome managed with Iberogast" once the fuller dated version exists.
- **"Rule out:" normalisation**: strip the `Rule out:` prefix when comparing, so `Rule out: Severe, acute abdominal pain or vomiting` and `Rule out: New-onset severe abdominal pain or vomiting` collapse into one.
- **Date-agnostic comparison**: ignore date fragments ("on April 8, 2026", "since April 8, 2026") when matching, keeping the earliest-dated phrasing.
- De-duplication stays across the whole Safety Checks section (all dated groups), as it is today.

Net effect on the example: the 10 rows collapse to roughly 5-6 distinct checks.

## 2. Four-column layout

Render the AI Clinician output as four fixed columns instead of stacked accordions:

```text
| Working Impression | Safety Checks | Differentials | Suggested Checks |
```

- Each column keeps its existing pastel frame and colour (yellow / pink / blue / green) and its icon + count header.
- Columns are equal width on desktop, two columns on tablet, single column stacked on mobile.
- Column order is fixed even if the model emits sections in another order; a section with no content renders as an empty framed column with a short "None yet" line so the grid stays stable during recording.
- Any unrecognised section (e.g. "Clinical Notes") renders full width beneath the four columns.
- The Live AI Clinician frame in the session workspace becomes full width so the four columns have room; the disclaimer text stays below.

## Technical notes
- `src/features/sessions/utils/clinicianNotesSections.ts` — similarity/subset de-duplication helpers, `Rule out:` and date normalisation.
- `src/features/sessions/components/ClinicianNotesAccordion.tsx` — add a four-column grid rendering mode (accordion behaviour kept for the mobile/stacked case and for existing callers that want it).
- `src/pages/Sessions.tsx` — Live AI Clinician panel spans the full workspace row.
- No changes to the edge function or prompt; this is presentation and parsing only.
