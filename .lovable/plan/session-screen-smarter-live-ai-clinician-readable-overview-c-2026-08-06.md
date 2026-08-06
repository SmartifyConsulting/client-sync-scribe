# Session screen: smarter live AI Clinician, readable overview, cleaner transcript

## 1. Live AI Clinician — make it useful DURING the session

Today the live hint gets only the rolling transcript plus thin patient context, is asked for "a very short hint", and refreshes after 80 new characters every 20s. Result: thin output, no safety flags.

Changes:
- Send full safety context to `live-diagnostic-hint`: active medications (name, dose, frequency), allergies, chronic conditions, and the last 5 session summaries with dates.
- Rewrite the prompt so the model actively cross-checks and flags:
  - **Already prescribed** — the drug being discussed is one the patient already takes (duplicate therapy).
  - **Interaction / counter-intuitive** — conflicts with a current medication or chronic condition.
  - **Allergy conflict** — matches a documented allergy.
  - **Recurrence** — "this has happened before", with the prior date.
  - **Red flags** — symptoms needing urgent action.
- Extend the response with `alerts: [{ type, severity, message }]` alongside suggestion / differentials / red_flags / investigations.
- Refresh faster: poll every 12s, trigger after ~40 new characters, first hint after ~6s.
- Redesign the live panel: severity-coloured alert rows (red = critical, amber = caution) first, then working impression, differentials and suggested checks.

## 2. Live AI hints become the AI Clinician Notes

The live hint output is richer than the current post-session AI Clinician text, which repeats itself.
- Accumulate the live hints during the session into a running, de-duplicated clinical note (each new hint merges into the existing note rather than appending a repeat).
- On stop, that accumulated live-hint note **is** the AI Clinician Notes shown in the results area — the current repetitive post-session generation is dropped as the primary source and only used as a fallback if no live hints were produced (e.g. very short session).
- The AI Clinician Notes panel keeps its "Private — not shared with the patient" note and disclaimer.

## 3. Transcript: message by message, colour-coded

- Stop the live "ghost writer" character-by-character rendering. Interim/partial speech results are no longer displayed; a line only appears in Speaker Notes once the utterance is finalised, so the transcript grows message by message.
- While someone is talking, show a small "Listening…" indicator instead of streaming partial text.
- Each finalised message renders as its own row in Speaker Notes with the speaker label and the speaker's assigned colour (doctor vs patient), matching the existing session dialogue colour scheme (teal / black).

## 4. Patient Overview — key points instead of one paragraph

Replace the single paragraph in `SessionPatientOverview` with a compact structured card:
- One-line headline recap (2 sentences max).
- Labelled key-point rows: Conditions, Current medications, Allergies, Recent symptoms, Recent visits — short bullet lines, not prose.
- Allergies rendered in the destructive colour so they stand out.
- Same 6-month data source and AI call; only the output shape and rendering change.

## 5. Post-recording layout — one transcript, one set of fonts

- Transcript appears **only** in the top-left Speaker Notes frame. Remove the separate "Transcription" card from the post-recording grid, and stop writing the transcript into AI Clinician Notes.
- Post-recording row becomes **AI Summary** and **Action Points** side by side, with the AI Clinician panel full-width below.
- Remove the green **"Session Completed Successfully"** banner.

### Typography (Speaker Notes, AI Summary, Action Points, AI Clinician)
- **Font:** Manrope (`font-sans`, the app body font; Sora is the display/heading font)
- **Size:** 14px (`text-sm`), line-height 1.6 (`leading-relaxed`)
- **Weight:** 400 normal; speaker labels 700 bold
- **Colour:** `text-foreground` (black) — the muted grey currently used for AI Summary is dropped

## 6. Documents not auto-generating

Invoice, Prescription and Medical Certificate should be extracted by `summarize-session` and created by `generateAllDocuments()`, but nothing appears. Diagnose then fix:
1. Run a session end to end and read the `summarize-session` and document-creation logs to see whether extraction returns null or creation fails.
2. Fix the failing stage — likely candidates: extraction returning nothing for short transcripts, or `generateAllDocuments()` firing in a `setTimeout(...,0)` right after the `setExtracted*` calls and reading stale state.
3. Make the invoice fallback unconditional so a consultation always yields at least an invoice to review.

## Technical notes
- Files: `src/pages/Sessions.tsx`, `src/features/sessions/components/SessionPatientOverview.tsx`, `src/features/sessions/components/SessionNotepad.tsx`, `src/hooks/useLiveDiagnosticHint.ts`, the live transcription hook, `supabase/functions/live-diagnostic-hint/index.ts`, and `supabase/functions/summarize-session/index.ts` if extraction is at fault.
- Live hints stay advisory with the existing disclaimer; no auto-prescribing or blocking behaviour.
