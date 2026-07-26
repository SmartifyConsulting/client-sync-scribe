## 1. Add Okili and Dr Buttons to the profile switcher

`src/components/layout/testProfiles.ts` gains two entries:
- **Samuel Okoli (Okili)** — Patient. Confirmed in the database: patient record `samuel 0koli`, phone `+234 8167581572`, email `ifeanyi.okoli@greenoriagroup.com` (a duplicate row with the same phone and no email also exists). The switcher works by email through the existing admin impersonation function, so the entry uses that email. If that login account has no email on file, switching will fail and I'll report back rather than guess.
- **Dr Gianna Buttons** — Doctor, `dr.buttons@smartify.co.za` (profile `Gianna Buttons` confirmed present).

Passwords are not stored in code; switching uses the existing admin impersonation path.

## 2. Emergency Contact accordion row

`EmergencyContactsInline.tsx` currently draws `rounded-xl border border-neutral-400` when not in `flat` mode. Remove that rounded grey frame so the row matches the other flat accordion rows.

## 3. Personal Information top row layout

The top accordion row's content switches from the stacked grid to a **horizontal inline layout**: label and value on one line, labels **bold** and one font size smaller than now, values also one size smaller, wrapping responsively on narrow screens.

## 4. Consistent document editor footers

**Every document editor that opens after the session recording stops** — Prescription, Medical Certificate, Invoice, Referral Letter, General Letter, Hospital Admission — gets the same footer: **Cancel · Preview · Send · Save**.
- Send uses each document's existing delivery path (pharmacy, employer, claims/insurance, referred doctor, patient).
- Save persists without closing on Send.
- The **Review Invoice** dialog's **Skip** button is removed.

## 5. Sent-state for generated documents

- The "AI detected documents from this session" chip bar gets a per-document **SENT** state: once emailed, the chip shows a tiny red `SENT` badge.
- Sent state comes from the document record's delivery status so it survives refresh.
- **Sent invoices are removed from the To-Do list.** The to-do query and the post-session completion step treat "sent" as done, so a sent invoice never appears as an outstanding "Review Invoice" task. Same rule for any document with a recorded sent state.

## 6. Doctor check-in: one button, meaningful note, patient reply

- **Remove the duplicate check-in button** in `src/pages/PatientProfile.tsx` (the one calling `award_doctor_checkin` directly). Only the `EmoticonSender` "Check In" control remains and it takes over the Vula award.
- After the doctor picks an emoticon, the popover expands to a field labelled **"Check-In Message"** with a Send action — the emoticon alone can no longer be sent.
- The message goes through an AI genuineness check (server-side edge function) that judges whether it is a substantive, patient-specific check-in rather than points farming. Existing anti-gaming signals (profile viewed in 24h, daily frequency) feed the same decision.
  - Genuine → sent, Vulas awarded.
  - Not genuine → still sent, flagged, **no Vulas**, with the reason shown to the doctor.
- The check-in lands in the **patient's notification box** with emoticon and message, and the patient can **reply** from the notification; replies notify the doctor.
- Small migration: message body + reply linkage on `emoticon_messages`, with grants/RLS so each side can read and reply to their own threads.

## 7. Font sizing in the session panel

In `src/pages/Sessions.tsx`, the Live AI hint block and the live Transcript lines both drop to `text-[10px]` with matching leading.

## 8. AI Consult is manual only

- Add an **AI Consult** button next to Record/Stop in the session sidebar. It can be pressed at any point during a session (while there is transcript text) and opens the AI Clinician modal with the full assessment.
- **Continue** simply closes the modal; recording keeps running.
- **Remove the automatic AI Clinical Assessment that currently fires when the session stops.** After Stop, the flow goes straight transcription → document review. The assessment only ever appears when the doctor presses AI Consult.

## 9. AI Clinician modal redesign

`SessionDiagnosticsModal.tsx`:
- Remove the **Edit Findings** button.
- Render each parsed section inside its own bordered, rounded card.
- Shade cards by section type using theme tokens (history/presentation, assessment, differentials, red flags, plan), keeping current text sizes and the non-binding warning.

## Technical notes

- Files touched: `testProfiles.ts`, `EmergencyContactsInline.tsx`, `PatientDetailsEditor.tsx`, `PatientProfile.tsx`, `EmoticonSender.tsx`, `Notifications.tsx`, the six editors in `features/sessions/components/`, `TranscriptionReviewDialogs.tsx`, `pages/Sessions.tsx`, `components/sessions/SessionDiagnosticsModal.tsx`, plus the to-do query and a new check-in validation edge function.
- Migrations needed: check-in message + reply support; a sent timestamp on documents/invoices if one does not already exist.
