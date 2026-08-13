# About Me: transcript evidence + two-column layout

Build on the existing About Me relationship profile so that, as sessions are recorded, the profile is backed by real evidence quoted from the session transcripts — and present the whole About Me result in two columns.

## What changes

### 1. Evidence gathered from session recordings
- After a session is finalised and its transcript exists, an AI pass reads the transcript and extracts up to three short verbatim quotes from the patient that reflect observable communication and rapport signals (how they ask for detail, how they talk about progress, reassurance, control, other people, and so on).
- Each quote is stored with: the session it came from, the session date, a plain-language signal label ("Wants to know what happens next"), and which internal pattern it supports.
- Guardrails: quotes are verbatim and short, nothing clinical or diagnostic is stored, and the AI never invents wording. If the transcript is empty or nothing clear appears, nothing is stored.
- Evidence accumulates across sessions. Confidence displayed on the profile rises as corroboration grows: one session with matching quotes = Emerging, two sessions = Moderate, three or more = Strong. The questionnaire result itself is never overwritten by the AI.

### 2. Two-column About Me presentation
The clinician-facing About Me result is laid out in two columns instead of one long list:

```text
| What may motivate them   | Be mindful of              |
| Communication            | Useful approach            |
| Builds trust             | Areas requiring confirmation|
```

Below the two columns, a full-width "Evidence from sessions" block lists each quote grouped by session date, with the signal label next to it. On mobile the columns stack.

The same two-column result is used in both places it appears: the About Me accordion on the patient profile and the "How to work with this patient" card on the Overview. The testing badge showing the internal type number stays.

### 3. Demo data for Sharon Kennedy
- Two of Sharon's existing sessions get realistic demo transcripts.
- Evidence rows are seeded from those two transcripts (three quotes each), consistent with her current profile result, so the About Me section shows a populated two-column result with dated evidence and Moderate confidence.

## Technical notes

- New table `patient_relationship_evidence`: `patient_id`, `session_id`, `quote`, `signal_label`, `supports_pattern`, `session_date`, `source`, `created_at`. RLS: patients read their own rows; clinicians with access to the patient record read via the existing `can_view_patient_record` helper; inserts only by service role (the edge function). Grants for `authenticated` and `service_role` in the same migration.
- New edge function `extract-relationship-evidence` (Lovable AI, `google/gemini-2.5-flash`), invoked non-blocking from the session finalisation sequence in `src/hooks/useSessions.ts` after the transcript is saved, so it never delays document generation or Vula awards.
- `src/features/patients/relationship/insights.ts`: add an evidence-aware confidence calculation used by `buildAssessment`.
- `src/features/patients/components/RelationshipAssessmentDetails.tsx`: two-column grid plus the evidence block; loads evidence by `patient_id`.
- Seed migration inserts the demo transcripts and evidence rows for Sharon Kennedy's two most recent sessions.
