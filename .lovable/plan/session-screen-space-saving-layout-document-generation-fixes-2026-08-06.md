# Session Screen: Space-Saving Layout + Document Generation Fixes

## Goal
Tighten the Session screen so everything fits without scrolling, and fix the document/action-point generation that silently failed.

## 1. Past Sessions
- Make the date itself a link that opens that session (`/sessions/:id`); keep the summary beneath it.

## 2. Recording column (left)
Order becomes: patient header → Record / Pause / Resume controls → Session Transcript accordion → Playback → Personal Notes.
- While recording: no live text at all. Show only an animating radio-wave bar so the doctor sees transcription is running.
- When the transcript is ready: store it in a collapsed accordion titled "Session Transcript" (speaker-coloured lines inside, expanded on demand).
- Audio playback sits directly under the transcript accordion.
- Remove the "Speaker Notes" frame entirely.
- Move "Personal Notes" here, under the recording controls, using the same body font/size as the other frames (no oversized textarea styling).

## 3. Patient Overview (right, top)
- DISC descriptors move to the top of this frame (single chip row) instead of a separate strip below it.
- Conditions, Current meds, Allergies and Symptoms render as four side-by-side columns inside the frame.
- Recent visits stay below, with the main problem in bold (e.g. **acute foot pain** — 12 Mar 2026).

## 4. AI Clinician
- "Live AI Clinician" panel moves above the AI Clinician Notes frame.
- The disclaimer moves to the top of the AI Clinician frame as a single banner; the side disclaimer panel is deleted.
- AI Clinician Notes content lays out in four columns using the same font as the rest of the screen.

## 5. Processing feedback
- Remove the "Transcription Complete" toast and the top-of-screen status strip.
- Replace both with one centred modal progress box: "Analysing session — generating summary, action points and documents", closing itself when results land.

## 6. Follow-up dialog
- "Ignore (no follow-up)" becomes **Skip**, placed next to **Schedule** (renamed from "Set follow-up").

## 7. Fixes to generation
- **Root cause of missing prescription / referral / action points:** the summarise call ran past the 150-second platform limit and the browser received a 504, so nothing came back even though the AI had produced the data. The function was changed to stream its response; this plan adds a client-side guard so a slow or failed call shows a clear retry instead of an empty result.
- **Invoice price:** the consultation line currently grabs the oldest saved service whose name contains "consult" (for this account that is "General Consultation with examination", R1500) and the fallback path bills R0. Change it to prefer an exact/closest GP-consultation match from the doctor's own price list, and never fall back to a hard-coded R0.
- **Action points:** persist and display whatever the summary returns, including when documents are generated afterwards.

## 8. Preview buttons
- Every generated-document card (Medical Certificate, Prescription, Invoice, Referral, Letter) gets a Preview button that opens the filled template showing the exact values that will be inserted.

## Technical notes
- Files: `src/pages/Sessions.tsx`, `src/features/sessions/components/SessionPatientOverview.tsx`, `SessionDiscStrip.tsx`, `SessionGeneratedDocuments.tsx`, `FollowUpAppointmentDialog.tsx`, `AudioWaveform.tsx`, `src/hooks/useAudioRecording.ts`.
- New small components: `SessionTranscriptAccordion.tsx`, `SessionProcessingDialog.tsx`.
- Pricing lookup helper scores `service_prices` rows by name similarity to "GP consultation"/"General Consultation" before falling back.
- No schema changes.
