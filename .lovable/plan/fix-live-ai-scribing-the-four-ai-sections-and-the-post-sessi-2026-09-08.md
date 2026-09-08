# Fix live AI scribing, the four AI sections, and the post-session order

## 1. Live AI never starts

The live clinical assistant only runs when the "AI Consult" switch is turned on
(it is off by default), so a normal recording never triggers it and nothing is
scribed while the doctor talks.

Change it so live analysis runs automatically for every recording:

- Start listening as soon as recording begins (and pause with the recording),
  with no toggle required. The existing AI Consult button stays as a manual
  "analyse now" trigger rather than an on/off gate.
- First pass after a few seconds of speech, then refreshed roughly every
  12 seconds as new speech arrives.
- Show a visible state in the panel: "Listening…", "Analysing…", the result, or
  a plain error line if the analysis call fails — never a silent blank frame.

The live analysis service also asks for a model name that is not part of the
supported list, so every call would be rejected even once it is switched on.
It moves to the current supported model.

## 2. The four sections after the recording ends

Today the four headings (Working impression, Safety checks, Differentials,
Suggested checks) are built purely from the live snippets collected during
recording. If live analysis never ran — or the last words were not analysed —
the panel is empty after stopping.

Add a final pass on stop: once the full transcript is ready, run one complete
analysis over the whole consultation and merge it into the same four sections,
so the completed session always shows all four headings (each marked "none
noted" when genuinely empty) rather than nothing.

## 3. Order of what appears after stopping

Rework the post-session queue to this exact sequence, skipping any item the
consultation did not produce:

1. AI scribed content in its four sections
2. Prescription
3. Referral
4. Hospital admission
5. Medical certificate
6. Next appointment (calendar)
7. Invoice
8. Vula reward

## Technical notes

- `useLiveDiagnosticHint`: keep polling tied to `isRecording && !isPaused`;
  expose an `error` field and a `runNow()` for the manual AI Consult button.
- `Sessions.tsx`: drop `aiConsultEnabled` as the gate for the hook, always
  render the AI Clinician panel while recording, and add a final
  `live-diagnostic-hint` call with the full transcript inside
  `handleSessionComplete` before `setSessionState("completed")`, merged through
  the existing de-duplicating `addAll` logic.
- `supabase/functions/live-diagnostic-hint`: replace the unsupported
  `google/gemini-3.5-flash` id with `openai/gpt-6-astra` via the Responses API
  (streamed, consumed server-side), keeping the same structured output shape.
- Post-session queue ordering lives in the `ORDER` array around
  `Sessions.tsx:740`; add `admission` to the queue and move `schedule` before
  `invoice`, with `vula` last.
