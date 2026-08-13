# Fix invoice step, invoice data, and live AI clinician frame

## 1. Invoice must appear before the Vula award

The post-session queue is built as: documents → schedule → invoice → Vula. The invoice step never renders because the invoice document is not produced.

Confirmed cause: `createInvoiceDocument` (and the prescription creator) bail out early with `if (!patientId || !currentSessionIdRef.current) return null;`. The session id is written with `setCurrentSessionId(result.id)` and only copied into `currentSessionIdRef` by a later effect, but `generateAllDocuments` runs in the same tick — so the ref is still null and the invoice document is never created. With no invoice document, the queue's invoice step renders nothing (`if (!doc) return null`) and the flow effectively jumps to the Vula dialog.

Fix:
- Pass the fresh session id explicitly into `generateAllDocuments` and the document creators instead of relying on the ref, and set `currentSessionIdRef.current` immediately when the session id is known.
- In the queue dialog, if a step has no matching document, auto-advance instead of rendering nothing, so the flow can never stall or silently skip.
- Only push the `invoice` step when an invoice document actually exists.
- In the session finaliser, the "no service price configured" branch currently returns out of the whole completion function, aborting everything after it. Change it to skip only the auto-invoice block.

## 2. Invoice must show real data instead of `___`

The auto-generated invoice fills its own small token map and then blanks every unmatched `[Token]` to `___`, which is what shows in the generated invoice.

Fix:
- Fill the invoice template with the shared placeholder filler (`fillDocumentPlaceholders`) using the real patient record, doctor profile, and invoice row (number, date, due date, line items, total, currency, bank details, signature), so the full alias set is honoured.
- Where a value genuinely does not exist, drop the line rather than printing `___` (same pruning already used for prescriptions).
- Make the invoice popup reuse this filled letterhead document rather than a plain text copy.

## 3. Live AI Clinician presented like the attached notes

- Render the live hints using the same pastel sectioned styling as the finalised clinician notes: Working Impression (yellow), Safety Checks (red, bulleted), Differentials (blue), Suggested Checks (green), each collapsible with the icon and left bullet rule, plus the existing bold clinical-term highlighting.
- Keep the existing critical/caution alert emphasis inside the Safety Checks frame.

## 4. Widen the frame and remove the duplicate bottom notes

- Move the Live AI Clinician frame out of the narrow right-hand column into the full-width area below the two columns (roughly 50% wider on desktop).
- Remove the "AI Clinician Notes" tab and its notepad from the bottom of the session screen; keep Personal Notes and Drawing Pad. The notes state stays in place so the post-session "Review AI Clinician notes" step and the saved session record are unaffected.

## Technical notes

Files touched: `src/pages/Sessions.tsx`, `src/features/sessions/components/PostSessionStepDialog.tsx`, `src/hooks/useSessions.ts`, a new `LiveClinicianPanel` component in `src/features/sessions/components/`, reusing `clinicianNotesSections`, `clinicianHighlights`, and `fillDocumentPlaceholders`. No database changes.

## 5. Compact the Chronic frame and the four clinical cards

On the patient Overview tab:
- Shrink the Chronic Medication / adherence frame by roughly 70% in vertical footprint: tighter padding, smaller badge and streak visuals, condensed rows.
- Apply the same compaction to the four cards below it (Allergies, Conditions, Medications, Symptoms) and keep them expanded by default so a clinician sees the contents without clicking.
- Reduce the oversized heading and value typography to the standard compact clinical scale (12px bold labels, normal body text) used elsewhere in the patient record.

Files touched: `src/features/patients/components/PatientOverview.tsx`.

## 6. Saved clinician notes, legend frame, and profile summaries

- Once a session is saved, its AI Clinician notes must render with exactly the same sectioned pastel shading, icons, bullets and clinical-term highlighting the doctor saw live (Working Impression, Safety Checks, Differentials, Suggested Checks) — in the session history/detail view, not as plain text.
- Delete the standalone "AI Clinician Notes" legend strip (Risk / Caution / Medication / Investigation with the empty-state line); the sectioned notes replace it.
- Show the DISC profile descriptors and the Enneagram-based "About Me" summary together under the patient overview panel, so both are visible at a glance alongside the clinical cards.

Files touched: `src/pages/SessionDetail.tsx`, `src/features/sessions/components/SessionResultPanels.tsx`, `src/features/sessions/components/SessionPatientOverview.tsx` (plus the relationship insight components already in use).
