# Make the AI Clinician actually scribe while you talk

## What I found

Nothing reached the AI service during your consultation: the live analysis
function was never called once (no calls in the service logs, none in the AI
usage log for today apart from my own test earlier). So the panel had nothing
to show — the fault is upstream of the AI, in what feeds it.

The live panel is fed only by the browser's own built-in speech recognition.
That path is fragile: it is Chrome-only, it drops out silently when the mic
stream is shared with the recorder, it restarts on every pause, and it is
locked to US English regardless of the consultation language. When it produces
nothing, the analysis never has 60 characters of text to work with and simply
never fires — silently, with "Listening…" left on screen forever.

## The fix: transcribe the recording as it happens

Stop depending on the browser's speech recogniser for the clinical text.

- While recording, send the audio to the same transcription service the app
  already uses at the end of a session, in rolling chunks of about 20 seconds.
- Each chunk's text is appended to a running live transcript, which is what the
  AI Clinician analyses. The browser recogniser stays only for the spoken
  "end session" cue and the speaking indicator.
- The consultation language is used for these chunks, not fixed English.
- Pausing pauses the chunking; resuming continues the same running text.

Result: the four sections start filling within roughly half a minute of the
consultation starting, and keep updating as the conversation goes on, in any
supported browser.

## Make failure visible instead of silent

The panel currently shows "Listening…" whether it is working or completely
stuck. It will instead show what is really happening:

- "Listening — no speech captured yet" until the first words arrive
- "Analysing…" while a pass is running
- the notes once they exist
- a plain one-line message when a transcription or analysis call fails

A small line under the panel shows when the last analysis ran, so it is obvious
at a glance whether it is alive.

## Final pass on stop

Keep the whole-transcript pass that runs when recording stops, and log its
outcome so a failure there is no longer invisible. If it fails, the completed
session shows the four headings with a short note that the final analysis could
not be completed, rather than an empty panel.

## Technical notes

- `src/hooks/useAudioRecording.ts`: add a rolling-chunk transcription loop
  driven off the existing `MediaRecorder` timeslice data (accumulate ~20s of
  chunks, POST to the existing `voice-to-text`/transcription edge function,
  append the returned text to `liveTranscriptRef`/`liveTranscript`). Respect
  pause/resume and cancel in-flight requests on stop. Pass
  `optionsRef.current.language` to the recogniser and to the chunk calls.
- `src/hooks/useLiveDiagnosticHint.ts`: lower the first-pass threshold so the
  first chunk triggers an analysis; expose `lastRunAt` for the status line.
- `src/pages/Sessions.tsx`: use the richer panel states described above and
  surface the final-pass failure state.
- No change to the `live-diagnostic-hint` edge function — it is already on the
  supported model and verified working.
