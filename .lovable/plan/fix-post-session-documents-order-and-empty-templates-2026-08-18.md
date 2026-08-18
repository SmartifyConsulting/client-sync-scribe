# Fix post-session documents, order and empty templates

## What I found (verified against the Okoli session of 18 Aug)

- The AI summary itself was correct — it describes the itchy eye, the drops and the follow-up. The **AI Clinician notes shown during the consultation were unrelated**; that panel is a separate live feed and is a fault in its own right (see below).
- **Every document is created twice.** The session finaliser writes a full letterhead version (linked to the session), and the session screen immediately writes a second plain-text copy with **no session link**. Session History shows the letterhead one; the review dialog shows the plain one.
- **The letterhead versions are mostly blank.** The medical certificate has `Date of consultation: ___`, `Nature of illness: ___`, `Recommended sick leave from ___ until ___`; the referral letter has `To: ___`, `Presenting complaint: ___`, `Reason for referral: ___`. The AI already extracted all of this — it is simply never mapped into the template, so every unmatched token becomes `___`. That is the "empty template" in Session History.
- The review queue starts at the first document: there is no AI-summary step before the prescription.
- The completed session left behind a second, empty session row (no transcript, same start time), which puts a duplicate entry in history.

## The fix

1. **One document per type.** Prescription, medical certificate and referral follow the pattern the invoice already uses: look for the letterhead document already created for this session and reuse it, only inserting a new one if none exists. No more unlinked plain-text copies, and everything appears under Session History.
2. **Fill the templates properly.** Map the AI-extracted fields into the certificate and referral templates: diagnosis / nature of illness, consultation date and time, sick-leave from/until, recommendations; and for referrals the addressee and specialty, presenting complaint, relevant history, current medications, investigations, reason for referral, patient DOB and contact. Remaining unknown tokens render as a blank fill-in line rather than `___` scattered through clinical fields.
3. **AI Summary first.** Add a summary step at the head of the review queue, so the order is: AI Summary → Prescription → Medical Certificate → Referral → other documents → Follow-up → Invoice → Award Vulas.
4. **Invoice always appears.** The consultation-price fallback already guarantees invoice data; make the invoice step unconditional so it is always shown as the second-last step even if the document lookup hiccups.
5. **AI Clinician notes — diagnose then fix.** The notes shown during the Okoli consultation did not match what was being said, so this step starts with a check, not an assumed cause:
   - Confirm what the live hint call actually receives — whether the rolling transcript reaching it is the current session's text, whether an earlier patient's hint is still on screen, and whether hints are being appended rather than replaced.
   - Once the check names the cause, fix it. The likely candidates to rule out are: the panel not clearing when the patient or session changes, hints from a previous run being merged into the notes, and stale patient context (medications, past sessions) being sent for the wrong patient.
   - Add a guard so every hint is stamped with the session and patient it was produced for, and any hint that does not match the live session is discarded rather than rendered.
   - Verify with a fresh recording: switch patients mid-flow and confirm the panel empties and then repopulates with content that matches the spoken words.
6. **Remove the duplicate empty session row** left by the Okoli consultation and stop the shell row from being written when a session completes.

## Technical notes

- `src/hooks/useSessions.ts` — extend the replacement maps in the medical-certificate and referral blocks; change the leftover-token fallback so unfilled clinical fields blank out.
- `src/pages/Sessions.tsx` — `createMedCertDocument`, `createPrescriptionDocument`, `createReferralDocument` gain the same "reuse the session's letterhead document" lookup as `createInvoiceDocument`, and all pass `session_id`; queue construction adds `summary` first and always pushes `invoice`.
- `src/features/sessions/components/PostSessionStepDialog.tsx` — render the new summary step.
- `src/hooks/useLiveDiagnosticHint.ts`, `src/features/sessions/utils/clinicianNotesSections.ts` and the clinician panel — inspect the transcript/context actually sent, reset on patient/session change (not only on `enabled`), and drop hints whose session/patient stamp does not match.
- One data cleanup query for the orphan session row. No schema changes.
