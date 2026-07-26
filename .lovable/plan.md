## 1. Conflicting "Session started" toast vs. "Start New Session" button

Verified: `src/pages/PatientProfile.tsx` (~line 191) toasts "Starting Session — Session started for {patient}" then navigates to `/sessions?patient=<id>`, while `src/pages/Sessions.tsx` opens `idle` with the "Ready to Start" card — nothing actually started.

Fix:
- PatientProfile navigates to `/sessions?patient=<id>&autoStart=true`; toast reworded to "Opening session — Preparing consultation for {patient}".
- `Sessions.tsx` reads `autoStart`, calls `startSession()` once (ref-guarded) after the patient loads, then strips the param.
- The existing "Recording Started" toast becomes the single accurate confirmation. Without `autoStart`, today's behaviour is unchanged.

## 2. Microphone stays live after Stop (red tab indicator)

Root cause (verified in `src/hooks/useAudioRecording.ts`): `stopRecording()` stops the `MediaRecorder`, but `MediaStream` tracks are only stopped at the **end** of the `onstop` handler — after upload and the full transcription round-trip (or never, if that throws). No unmount cleanup either.

Answer: the session does end on Stop; the microphone hardware just isn't released promptly, which is what the browser's red indicator shows.

Fix:
- Add `releaseStream()` and call it **immediately** in `stopRecording()` after `mediaRecorder.stop()`.
- Wrap the `onstop` upload/transcribe body in try/finally, calling `releaseStream()` in `finally`.
- Add an unmount effect that stops the recorder, speech recognition, and stream.

## 3. AI Clinical Assessment modal (`SessionDiagnosticsModal.tsx`)

- Remove the "Session Summary" and "Action Points" blocks (already in the session fields); drop those props and their call-site use.
- Show only the **Full AI Clinical Assessment**, formatted as a professional report: header line (patient + session date), then parsed sections — heading-like lines (`Impression:`, `Assessment`, `Plan`, numbered/ALL-CAPS) as small bold uppercase labels with a hairline rule; bullet lines as a list; the rest as justified paragraphs.
- Widen `max-w-2xl` → `max-w-4xl`, `max-h-[85vh] overflow-y-auto`; report body at 12px with headings scaled to match.
- Bottom non-binding warning up one step (`text-sm` → `text-base`).
- No Close button and no outside-click/Esc dismissal — the footer holds **Edit Findings** (secondary) and **Continue — Generate Documents** (primary, disabled with spinner while the assessment completes).

## 4. Assessment is lost on Continue — persist it

Verified: `aiDiagnosis` lives only in `Sessions.tsx` component state and the `sessions` table has no column for it (columns confirmed: notes, transcript, summary, action_points, …). So closing the modal discards the assessment permanently.

Fix:
- Migration adding `ai_diagnosis text` and `ai_findings_note text` to `public.sessions` (existing RLS/grants already cover the table; no new policies needed).
- Save both fields to the session row when the doctor presses Continue (and also when the full assessment finishes, so an interrupted flow doesn't lose it).
- Surface the stored assessment plus the doctor's findings note in the session detail / My Sessions view so it is auditable afterwards.

## 5. New "Edit Findings" step

- Clicking **Edit Findings** opens a second modal: the read-only AI assessment at the top, and a textarea for the doctor's own findings — what they are reconsidering and how they are changing the course of therapy — with voice dictation available like other note fields.
- That modal's own **Continue** button saves the note to `sessions.ai_findings_note` and then proceeds into the same document review sequence, so the doctor can amend the prescription or therapy strategy in each document review step before anything is generated.
- Cancel returns to the assessment modal without losing the typed note.
- The findings note is prepended as context to the prescription/plan review steps so edits start from the doctor's revised intent, not just the AI output.

## 6. Invoices not generated from sessions

Verified: `supabase/functions/summarize-session/index.ts` only returns an `invoice` object when "billing, fees, or invoice amounts are discussed", and `Sessions.tsx` (~line 380) only sets `extractedInvoice` when that object exists. Fees are rarely spoken aloud, so no invoice appears.

Fix:
- Update the summarize-session prompt so a consultation invoice is **always** produced for a completed clinical session — when no amount is discussed, return one line item describing the consultation with a null amount flagged `needs_pricing`.
- In `Sessions.tsx`, if no `docs.invoice` returns but the session has content, synthesise a default "Consultation — {date}" line item so the invoice review step always appears.
- Pre-fill the amount from the doctor's Service Offerings & Pricing consultation tariff where available; otherwise leave it blank for the doctor to complete in the review step, which saves through the existing invoice insert path (~line 621).
- The invoice stays editable/cancellable — nothing bills without doctor confirmation.

## Technical notes

- Files touched: `src/hooks/useAudioRecording.ts`, `src/pages/Sessions.tsx`, `src/pages/PatientProfile.tsx`, `src/components/sessions/SessionDiagnosticsModal.tsx`, a new `src/components/sessions/EditFindingsModal.tsx`, `supabase/functions/summarize-session/index.ts`, plus one migration on `public.sessions`.
- No colour changes; no new RLS policies.
