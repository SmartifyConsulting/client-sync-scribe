# Session screen: smarter live AI Clinician, readable overview, cleaner post-recording view

## 1. Live AI Clinician — make it useful DURING the session

Today the live hint only gets the rolling transcript plus a thin patient context, is asked for "a very short hint", and only refreshes after 80 new characters every 20s. Result: thin output, no safety flags.

Changes:
- Send full safety context to `live-diagnostic-hint`: active medication list (name, dose, frequency), allergies, chronic conditions/diagnoses, and the last 5 session summaries with dates.
- Rewrite the prompt so the model must actively cross-check and flag:
  - **Already prescribed** — doctor is suggesting a drug the patient is already on (duplicate therapy).
  - **Interaction / counter-intuitive** — the suggested drug conflicts with a current medication or a chronic condition.
  - **Allergy conflict** — suggested drug matches a documented allergy.
  - **Recurrence** — "this has happened before" (same complaint in prior sessions, with the date).
  - **Red flags** — symptoms needing urgent action.
- Extend the response schema with `alerts: [{ type, severity, message }]` alongside the existing suggestion / differentials / red_flags / investigations.
- Refresh faster: poll every 12s, trigger after ~40 new characters, first hint after ~6s.
- Redesign the live panel in the recording frame: severity-coloured alert rows (red = critical, amber = caution) at the top, then working impression, differentials and suggested checks — instead of the current one-line grey text.

## 2. Patient Overview — key points instead of one paragraph

Replace the single paragraph in `SessionPatientOverview` with a compact structured card:
- A one-line headline recap (2 sentences max).
- Labelled key-point rows: Conditions, Current medications, Allergies, Recent symptoms, Recent visits — each as short bullet chips/lines rather than prose.
- Allergies rendered in the destructive colour so they stand out.
- Same 6-month data source and AI call; only the output shape and rendering change.

## 3. Post-recording layout — one transcript, one set of fonts

- Transcript appears **only** in the top-left **Speaker Notes** frame. Remove the separate "Transcription" card from the post-recording grid, and stop writing the transcript into AI Clinician Notes (`onTranscriptionComplete` currently does `setNotes(text)`).
- **AI Clinician Notes** keeps only AI-generated clinical notes and live hints.
- The post-recording row becomes: **AI Summary** and **Action Points** (wider, two columns), with the AI Clinician panel full-width below.
- Remove the green **"Session Completed Successfully"** banner entirely.

### Typography (applied to Speaker Notes, AI Summary, Action Points, AI Clinician output)
All body text becomes the same font, size, weight and colour:
- **Font:** Manrope (`font-sans`, the app body font; headings elsewhere use Sora)
- **Size:** 14px (`text-sm`), line-height 1.6 (`leading-relaxed`)
- **Weight:** 400 (normal); speaker labels stay 700 (bold)
- **Colour:** `text-foreground` (black) — the muted grey currently used for AI Summary is dropped

## 4. Documents not auto-generating

Invoice, Prescription and Medical Certificate are supposed to be extracted by `summarize-session` and then created by `generateAllDocuments()`. They are not appearing, so this step is diagnose-then-fix:
1. Run a session end-to-end and read the `summarize-session` and document-creation logs to see whether extraction returns null or the creation call fails.
2. Fix whichever stage breaks — most likely candidates are the extraction schema returning nothing for a short transcript, or `generateAllDocuments()` being called before the extracted-document state has settled (it is fired in a `setTimeout(...,0)` immediately after the `setExtracted*` calls, so it can read stale state).
3. Make the invoice fallback unconditional so a consultation always produces at least an invoice to review.

## Technical notes
- Files: `src/pages/Sessions.tsx`, `src/features/sessions/components/SessionPatientOverview.tsx`, `src/features/sessions/components/SessionNotepad.tsx`, `src/hooks/useLiveDiagnosticHint.ts`, `supabase/functions/live-diagnostic-hint/index.ts`, and `supabase/functions/summarize-session/index.ts` if extraction is the fault.
- The live hint stays advisory with its existing disclaimer; no auto-prescribing or blocking behaviour.
