## Current diagnosis

- Patient **Personal / Medical Information** still use separate `Collapsible` blocks with their own rounded borders, so they don't match the single-frame My Practice table in the mockup. This is a layout choice, not a technical limit.
- The green-bar / white-font expanded state is achievable (My Practice already does it with `data-[state=open]:bg-primary` + `[&_*]:text-white`); the patient screen just isn't using that pattern consistently.
- Session document success toasts fire during auto-creation, so they stack over the AI summary modal before the doctor has reviewed anything.
- `useLiveDiagnosticHint` only sends the rolling transcript + basic vitals; no historical session context. The full AI diagnosis currently only runs off the final summary.

## Plan

### 1. Patient profile formatting (Personal + Medical)
- Wrap each tab's sections in ONE `rounded-xl border` frame with `divide-y` grey dividers (same as My Practice).
- Remove per-section rounded borders.
- Collapsed rows: white, light-grey hover shading.
- Expanded rows: green bar, white title/icon/chevron, with padding before content.
- No field/content removal — visual only.

### 2. Session completion sequence (rewritten flow)
New strict order after recording stops:

```text
Stop recording
  → transcription
  → ROLLING LIVE HINT ends
  → FULL AI DIAGNOSIS modal (with non-binding disclaimer)
       [Close / OK button, click-outside, Esc all dismiss]
  → Document review, ONE AT A TIME
       each doc: review / edit → Approve
         → progress bar: "Generating..." → "Generated"
         → optional "Send" → progress bar: "Sending..." → "Sent"
  → follow-up appointment
  → Vulas awarded LAST
```

- **All generated-document dialogs get an explicit Close/OK button**, and can be dismissed by clicking outside or pressing Esc (currently the diagnostics modal blocks `onOpenChange`).
- **Full AI diagnosis** shown after the rolling hint completes, using the complete transcript + patient history, with a visible disclaimer that the output is clinical decision support only and not binding.
- Remove all document-created success toasts (Medical Certificate, Prescription, Invoice, Referral, Admission, Patient Tasks, Session Completed). Keep error toasts.
- Progress feedback moves into the per-document review card: "Generating" → "Generated" → (if sent) "Sending" → "Sent".
- **Send from the review step**: doctor can approve-and-send in one flow.
- **To-do suppression**: when a document is generated AND sent (or explicitly marked done) in this flow, do not create the `Review <doc>` todo; if already created, mark it completed so it never appears on the To-Do List.

### 3. Live AI diagnostic guidance during recording
- Extend the live hint payload with richer context: past session summaries, allergies, current medications, chronic conditions, age/sex.
- Keep polling concurrently with live transcription; label output as provisional working guidance.
- Full diagnosis (step 2) then supersedes it once the transcript is complete.

## Technical notes
- `src/features/patients/components/PatientDetailsEditor.tsx` — accordion frame refactor for personal + medical tabs.
- `src/components/sessions/SessionDiagnosticsModal.tsx` — dismissible (Close/OK, outside click, Esc), add disclaimer, host the full diagnosis.
- `src/pages/Sessions.tsx` — reorder: diagnosis modal → sequential doc review → follow-up; add per-doc generate/send progress states.
- `src/hooks/useSessions.ts` — strip doc-created toasts; skip/complete todos for documents that were sent.
- `src/hooks/useLiveDiagnosticHint.ts` + `supabase/functions/live-diagnostic-hint/index.ts` — accept and use past-session context.

## Expected result
- Patient Personal/Medical match the My Practice table style with green expanded bars and white text.
- No toast pile-up; every generated-document dialog is dismissable via OK/Close, outside click, or Esc.
- Doctor sees full non-binding AI diagnosis first, then reviews documents one by one with generate → send progress bars, and sent documents never land on the To-Do List.