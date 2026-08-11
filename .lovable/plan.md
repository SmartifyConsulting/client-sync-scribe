# Fix post-session document generation and step sequence

## What's wrong

When a session is stopped, the AI-extracted documents (prescription, medical certificate, referral) are read from the analysis result and written into React state, and the document builder is then called in the same tick via `setTimeout(..., 0)`. That builder is a memoised callback captured from the render *before* those state updates, so it still sees empty prescription/med-cert/referral values. The result: only the fallback consultation invoice gets created, and the step queue collapses to Invoice → Vulas regardless of what the consultation actually contained.

A second consequence: the fallback invoice can be created twice (once from the stale path, once from the freshly set state), because the same fallback logic exists in both places.

## The fix

1. Pass the extracted documents directly into the generation routine as an argument instead of relying on state that hasn't committed yet. State still updates for the UI, but generation uses the values just returned by the analysis.
2. Compute the consultation-price fallback invoice in one place only, so a session can never raise two invoices.
3. Build the step queue from the same explicit set of extracted documents, in the required order:
   - Prescription (if any)
   - Medical Certificate (if relevant)
   - Referral (if relevant)
   - Any other generated document type
   - Follow-up scheduling
   - Invoice (second last)
   - Award Vulas (last)
4. Create the underlying document records in that same order so saved documents and the review queue match.
5. If the analysis call fails or times out, keep the existing clear retry message and do not open a partial queue.

## Technical notes

- File: `src/pages/Sessions.tsx` — `generateAllDocuments` gains an explicit payload parameter; `handleSessionComplete` builds that payload from `result._extractedDocuments` and awaits the call rather than deferring it with `setTimeout`.
- Fallback invoice: keep the `lookupConsultationPrice()` path only inside `generateAllDocuments`; remove the duplicate synthesis in `handleSessionComplete`.
- Queue ordering lives with the generation results so `PostSessionStepDialog` receives a queue that matches the documents array.
- No schema, edge function, or styling changes.
