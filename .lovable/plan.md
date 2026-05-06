# Fixes — Incidents, Pricing, Gamification, SOS Voice Note

## 1. Incidents screen 404

The incidents history page lives at `/patient/holarchelp/incidents` but there is no menu entry pointing there, so any link/button users hit is going to a wrong path (e.g. `/patient/incidents`) and falling through to the React Router catch-all `NotFound`.

Action:
- Add a redirect route in `App.tsx` from `/patient/incidents` and `/doctor/incidents` → `/patient/holarchelp/incidents` (and doctor equivalent).
- Add an explicit "Incident History" link to the SOS home page (`HolarcHelpHome.tsx`) under the "Find nearby provider" button so users can reach it.
- Verify `HolarcHelpIncidents.tsx` filters by `user_id` (currently it relies on RLS; add `.eq("user_id", user.id)` defensively).

## 2. Pricing Admin heading not following standard

Other admin pages use `PageHeader` (text-2xl font-semibold) or the in-line `text-2xl font-bold text-foreground` pattern. PricingAdmin uses `text-3xl md:text-4xl font-medium`.

Action:
- Replace the custom header in `src/features/admin/pages/PricingAdmin.tsx` with the shared `PageHeader` component (title "Subscription Pricing", subtitle as-is) and move the `Publish Changes` button into the `actions` slot.

## 3. Error creating Reward under Gamification

`createConfig` swallows the actual Postgres error and shows generic "Failed to create config". Two likely causes:
- New visit_category collides with the `visit_category_key` unique constraint.
- Caller is not an admin (RLS denies INSERT).

Action:
- In `usePatientRewards.ts → createConfig`, surface the real `error.message` in the toast description so the user sees the cause.
- In `GamificationAdmin.tsx`'s "Add Reward" dialog, trim+lowercase `visit_category`, validate it's non-empty, and pre-check for duplicates client-side before insert.
- Add a small note/help text on the dialog ("Category must be unique").

## 4. Voice recording UX — auto-start, auto-stop on 4s silence

Current `SosVoiceNoteDialog` requires tapping "Start Recording" and "Stop & Send" manually.

Action (rewrite `SosVoiceNoteDialog.tsx`):
- On dialog open, immediately request microphone and start `MediaRecorder` (skip the "prompt" phase entirely).
- Attach an `AnalyserNode` (Web Audio) to the mic stream; sample RMS volume every 100 ms.
- Track `lastVoiceAt`. When `Date.now() - lastVoiceAt > 4000` AND at least 2 s of recording has elapsed, automatically call `stopRecording()` which uploads + transcribes.
- Keep the visible 60 s hard cap.
- Replace the "Stop & Send" button with a "Send now" button (manual override) and "Cancel".
- Show a live waveform/RMS meter so the user knows it's listening.

## 5. Default severity = critical when no voice note placed

Currently SOS creates an incident before the voice note dialog opens; severity is set later via the `SeverityPicker`. If the user skips/cancels the voice note, severity may remain unset.

Action (in `HolarcHelpHome.tsx` and `SosVoiceNoteDialog.tsx`):
- When the SOS incident is created, default `severity = 'critical'` server-side payload.
- If the user cancels or skips the voice note (or no audio chunks captured), the existing `critical` default stays — no downgrade.
- Only downgrade severity if the user explicitly picks one in `SeverityPicker` after recording.

## 6. Transcription/recording not visible on incident detail

`HolarcHelpIncidentDetail.tsx` already renders `voice_note_transcript` and `<VoiceNoteAudio path={voice_note_audio_url}>`. Two real issues:

- `transcribe-audio` edge function expects `{ audio, patientName, doctorName }` and returns `text`. The dialog only updates the incident **after** transcription completes — if upload succeeds but transcribe fails, the path is never written. Fix: write the audio path **first**, then update the transcript when it returns.
- The detail page subscribes to realtime UPDATEs but the initial fetch may run before the dialog finishes writing, so the transcript appears only after refresh. The realtime UPDATE listener should already pick this up — verify the `holarchelp_incidents` table is in the `supabase_realtime` publication. If not, add a migration: `ALTER PUBLICATION supabase_realtime ADD TABLE public.holarchelp_incidents;` and `ALTER TABLE public.holarchelp_incidents REPLICA IDENTITY FULL;`.

Action:
- Split the upload + transcribe steps in `SosVoiceNoteDialog.tsx`:
  1. Upload audio → immediately UPDATE `voice_note_audio_url`.
  2. Call transcribe → UPDATE `voice_note_transcript` when done (don't block the dialog close on transcription).
- Add the realtime publication migration if not already present.
- On `HolarcHelpIncidentDetail.tsx`, also re-fetch the incident on tab focus so the transcript shows up if the realtime event was missed.

## Files Touched

- `src/App.tsx` — redirect routes for `/patient/incidents`.
- `src/features/admin/pages/PricingAdmin.tsx` — use `PageHeader`.
- `src/features/rewards/hooks/usePatientRewards.ts` — surface real error in `createConfig`.
- `src/features/admin/pages/GamificationAdmin.tsx` — input validation/help text.
- `src/modules/holarchelp/components/SosVoiceNoteDialog.tsx` — auto-start, silence-detect auto-stop, split upload+transcribe.
- `src/modules/holarchelp/pages/HolarcHelpHome.tsx` — default severity `critical`, add Incidents link.
- `src/modules/holarchelp/pages/HolarcHelpIncidents.tsx` — defensive `user_id` filter.
- `src/modules/holarchelp/pages/HolarcHelpIncidentDetail.tsx` — re-fetch on focus.
- New migration — add `holarchelp_incidents` to `supabase_realtime` publication (idempotent).
