## 1. Profile switcher — remove Dean Allie (Patient)

`src/components/layout/testProfiles.ts` lists Dean Allie twice (doctor + patient). Remove the patient entry only.

## 2. To-Do rows — no indent, no coloured bullets

`src/components/todos/TodoRow.tsx`: drop the `insideGroup ? "pl-6"` indent variant and remove the `PRIORITY_DOT` coloured dot span.

## 3. Accordion name frames

Give the patient/name accordion a fine green outline (1px `border-primary/40`, rounded) in `section-accordion.tsx` / `CompactTodoList.tsx`, keeping the spacing between frames.

## 4. Why the to-do accordions have odd names ("Georgia Adams. Note", "No patient")

Confirmed cause in `src/lib/todoDisplay.ts`. Todos usually have no `patient_name`, so the grouping falls back to `extractPatient(title)`, which guesses a name out of the task title with this regex:

```text
/\bfor\s+([A-Z][\p{L}'.-]+(?:\s+[A-Z][\p{L}'.-]+)+)/u
```

The character class includes a full stop, so a title like "Review letter for Georgia Adams. Note follow-up" captures **"Georgia Adams. Note"** — the sentence-ending period plus the next capitalised word get swallowed into the name. When no pattern matches at all, `CompactTodoList.tsx:502` labels the group the literal `"No patient"`.

Fix:
- Resolve the group name from the todo's `patient_id` (join to the patients record) first, then `patient_name`, and only then fall back to title parsing.
- Tighten `extractPatient`: stop at sentence punctuation, don't allow `.` inside a name token, cap at 3 words, and reject known non-name words ("Note", "Invoice", "Follow", etc.).
- Rename the fallback label from "No patient" to "General tasks".

## 5. Invoice numbers duplicated (`INV-INV-202607-88811`)

Confirmed: numbers are generated already prefixed — `INV-${year}${month}-${random}` in `Invoices.tsx`, `InvoiceEditor.tsx`, `useSessions.ts`, `Sessions.tsx` and the `process-todo-actions` function — but the default invoice template in `src/hooks/useTemplates.ts:218` hardcodes another prefix:

```text
TAX Invoice Number: INV-[InvoiceNumber]
```

Fix: drop the literal `INV-` from the template line so the placeholder supplies the whole number, and add a defensive strip of a leading `INV-` when filling `[InvoiceNumber]` so existing saved templates render correctly too.

## 6. Missing translation keys on patient details save

The toast in `src/pages/patient/MyDetails.tsx:149` uses `common.saved` and `patient.myDetails.detailsUpdated`; the `patient.myDetails` block does not exist in `src/i18n/locales/en.json`, so the raw keys render (the screenshot). Fix: add the missing keys to `en.json` (and the other locale files) and audit `MyDetails.tsx` for any other unresolved keys.

## 7. Session recording fixes (`src/pages/Sessions.tsx`, `src/hooks/useAudioRecording.ts`)

**a) No live transcription — also breaks AI Consult and the Live AI hint.** The Web Speech recognizer only scans results for "end session" phrases and never accumulates text; `transcript` is set once, after Whisper returns. So `handleAiConsult` hits its "Nothing to analyse yet" guard mid-session. Fix: accumulate final Web Speech results (plus current interim) into a `liveTranscript` the hook exposes; render it in the Transcript panel, feed it to the live hint and to AI Consult. Whisper still replaces it as the authoritative transcript on stop.

**b) Follow-up and Vula dialogs twice.** Two paths call `handleSessionComplete` for one stop: `onEndSessionDetected` schedules it on a 2s timer *and* `onTranscriptionComplete` calls it because `pendingCompletionRef` is still true. Fix: one-shot `completionStartedRef` guard and remove the redundant timer path.

**c) Wrong modal order.** `startDocumentReview()` runs via `setTimeout(..., 0)` with a stale closure where all four extracted-document states are still null, so it falls straight through to the follow-up dialog. Fix: pass the freshly extracted docs as arguments, restoring: Med Cert → Prescription → Invoice → Referral → Follow-up → Vula.

**d) Send button on every modal.** Add an explicit Send action to each review dialog, routed through the existing `DocumentDeliveryProgress` / `sendDeliveryDocument` path.

**e) Button overlap.** Record / Pause / AI Consult sit in one fixed `flex items-center gap-3` row in the narrow sidebar card. Make it `flex-wrap justify-center` and collapse the Pause / AI Consult labels to icons on narrow widths.

## 8. Document email handle

- `Sidebar.tsx` already renders `<alias>@docs.holarchealth.com` under the profile name but truncates it — switch to wrapping/`break-all` so the full handle shows.
- Show the patient's own intake address on the **patient record** (patient profile header), reusing the copyable `MailboxIntakeAddress` component, so the patient sees where to email documents.
- Make that same address visible to every provider connected to the patient. I will verify the patient `mailbox_alias` column is readable by connected providers before wiring the UI, and add a read policy only if it is not.

## Technical notes

Files: `testProfiles.ts`, `TodoRow.tsx`, `todoDisplay.ts`, `CompactTodoList.tsx`, `section-accordion.tsx`, `useTemplates.ts` (+ invoice placeholder fill), `en.json` and sibling locales, `useAudioRecording.ts`, `Sessions.tsx`, the four session review dialogs, `Sidebar.tsx`, patient profile header. A migration is only needed if the provider read of the patient mailbox alias turns out to be blocked.
