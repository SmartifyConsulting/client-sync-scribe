# Round Table editing, session layout parity, profile cleanup

## 1. Edit and delete messages in the Round Table
- Each chat bubble a doctor authored gets small edit and delete controls (pencil / trash, visible on hover, own messages only).
- Edit switches the bubble into an inline textarea with Save / Cancel; saved messages show an "edited" marker with the time.
- Delete asks for confirmation, then removes the message from the thread for everyone in realtime.
- Database: message deletion is already restricted to the author; an update policy for the author is missing and will be added, plus an `edited_at` column on round table messages.

## 2. Opening message shown inside the frame, in green
- The topic's opening message (from the doctor who started the round table) currently renders as plain text at the top of the expanded panel.
- It will be rendered as a proper framed bubble in the app's green/primary tone with the starting doctor's initials avatar, name and timestamp, sitting at the top of the discussion thread so the conversation reads as one continuous thread.
- The starting doctor can edit or delete their opening message using the same controls (deleting the opening message removes the whole topic, with a clear confirmation).

## 3. Profile switcher cleanup
- Remove the `Samuel Okoli (Okili)` email-based entry from the test profile switcher list.
- Keep only the phone-registered `Samuel 0koli` entry, and relabel it simply as `Samuel 0koli`.

## 4. Past session layout to match the attached screen
Rework the session detail page so a past session reads exactly like the live recording screen in the reference:
- Row 1: narrow recorder/summary card on the left (patient name, duration, date, audio player) and the wide **Patient Overview** frame on the right.
- Patient Overview keeps the reference data layout: personality chips row, the 6-month narrative line, then a three-column band of Conditions / Current meds / Allergies (allergies in red), followed by the Recent visits list.
- Row 2: the **AI Clinician Notes** panel moves out of the left column and becomes a full-width frame directly below, in the same position and styling as "Live AI Clinician" in the reference (header with icon, coloured Working Impression block, collapsed Safety Checks / Differentials / Suggested Checks accordions with counts, and the privacy footnote).
- Personal Notes / Drawing Pad and the rest of the results panels stay below, unchanged.

## 5. Test prescription email
- Send a live test email of an existing prescription document through the branded email pipeline (inline logo, doctor's handwritten signature font, deep link button) and report the result.

## Technical notes
- Files: `src/features/patients/components/RoundTable.tsx`, `src/components/layout/testProfiles.ts`, `src/pages/SessionDetail.tsx`, `src/features/sessions/components/SessionPatientOverview.tsx`, `ClinicianNotesAccordion.tsx`.
- Migration: `alter table round_table_messages add column edited_at timestamptz` + `rt_msgs_update` policy `auth.uid() = doctor_id` (with check the same); grants already in place.
- Prescription test send uses the existing `send-document-email` edge function; no code change expected unless the send surfaces an error.
