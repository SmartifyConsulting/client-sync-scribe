## Why transcription "isn't working immediately" for INC-2026-001076

The transcript did land in the database:

> `Responder: We have two people that have been in an accident and they are both unconscious.`

Two real problems:

**A. It's labeled "Responder" but the SOS voice note is recorded by the Patient.**
`SosVoiceNoteDialog.tsx` invokes `transcribe-audio` with `{ patientName: "Patient", doctorName: "Responder" }`. The edge function then asks Gemini to split the clip into `Patient:` / `Responder:` turns. A single-speaker patient clip gets mis-labeled — Gemini picked "Responder" because the sentence sounds third-person ("we have two people…").

**B. It doesn't appear immediately in the Dispatcher Console.**
The whole transcription pipeline runs *after* the recording dialog closes (Whisper call + Gemini formatting + retries with 0/1/3s back-off), typically 3–8 seconds. During that window `voice_note_transcript` is `null` and the Dispatcher Console shows nothing. The console also relies on a re-fetch/realtime UPDATE that isn't guaranteed to fire on the transcript column specifically.

## Fix

**1. `src/modules/holarchelp/components/SosVoiceNoteDialog.tsx`**
- Change the invoke body to `{ audio: base64, patientName: "Patient", doctorName: "Patient", singleSpeaker: true }` so the formatter never labels the clip as "Responder".
- Immediately after uploading the audio (before invoking transcribe), write a placeholder `voice_note_transcript: "Transcribing…"` so responders see activity. Replace it with the real transcript when transcribe returns; if all retries fail, clear the placeholder back to `null`.

**2. `supabase/functions/transcribe-audio/index.ts`**
- Accept a new optional `singleSpeaker: boolean` flag in the request body.
- When `singleSpeaker` is true, skip the Gemini speaker-labeling call entirely and return `text = "${patient}: ${rawText}"` (single "Patient:" prefix). This removes the Gemini round-trip (~2–4s) and eliminates the mis-labeling class of bugs for SOS clips.
- Leave existing multi-speaker session-recording behavior unchanged (flag defaults to false).

**3. Dispatcher Console (`DispatcherConsoleScreen.tsx` and any incident row hook)**
- Ensure the realtime subscription on `holarchelp_incidents` re-reads `voice_note_transcript` and `voice_note_audio_url` on UPDATE, so the transcript pops in the moment the background task writes it (no page refresh needed). If it already uses `event: "*"`, verify it maps the payload's `new.voice_note_transcript` into local state.

## One-off data cleanup for INC-2026-001076

After the code fix ships, run a single UPDATE to correct the historical row:

```
voice_note_transcript = 'Patient: We have two people that have been in an accident and they are both unconscious.'
```

on incident `61986bdd-10fb-4fc7-805e-249c964fda8a`.

## Out of scope

No schema change. No new tables/columns. Whisper + storage flow untouched.
