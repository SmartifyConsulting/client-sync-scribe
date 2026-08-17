# Session screen: Quick Actions dropdown + cleaner AI Clinician Notes

## 1. Quick Actions moves above Patient Overview

- Remove the Quick Actions control from the page header row (it currently sits next to the delete/lock note).
- Place it on its own right-aligned line directly above the Patient Overview frame, spanning the same grid width.
- Style it as a green dropdown box (semantic success/green token, white label, chevron on the right) rather than an outline button with the "..." icon.
- Drop the `MoreHorizontal` ("...") icon from the trigger; the label reads simply "Quick Actions".
- Same options as today: Prescription, Invoice, Medical Certificate, Referral Letter, General Letter, Drawing Pad, Hospital Admission.

## 2. Disclaimer moves under the heading

The privacy/decision-support sentence currently sits at the bottom of the AI Clinician Notes frame. Move it to sit directly beneath the "AI Clinician Notes" heading, above the accordions:

"Private — not shared with the patient. AI-generated clinical notes are decision support only and must be reviewed by the treating clinician."

## 3. Remove repeated content in Safety Checks, Differentials and Suggested Checks

The saved notes for `Session - August 13, 2026 3:52 PM` contain the same clinical points several times, e.g. "Check vital signs immediately (heart rate, blood pressure, temperature)" and "Check current vital signs (heart rate, blood pressure, temperature)", plus three near-identical "Rule out: severe tachycardia / arrhythmias" alerts and three Thyrotoxicosis differentials.

Cause: while recording, each new live AI hint is merged into the running note, but the duplicate check compares the exact lowercase string. Any reworded repeat is stored as a new bullet, and all of them are then saved into the session.

Fix, applied **before saving**:

- Use a fuzzy comparison key (lowercase, punctuation stripped, filler words removed, words sorted) when merging each live hint into the note, so reworded repeats collapse into the first phrasing across all three sections.
- Collapse Safety Checks into one de-duplicated list. Keep the most severe marker (CRITICAL over CAUTION) when the same point recurs, instead of one dated group per hint.
- Keep the existing render-time de-duplication as a safety net for notes already stored.

## 4. Clean up the example session

Rewrite the stored notes for the August 13, 2026 3:52 PM session through the same de-duplication so it can be used to verify the result, and check the rendered page afterwards.

## Technical notes

- `src/pages/SessionDetail.tsx` — Quick Actions relocation and styling, disclaimer placement.
- `src/pages/Sessions.tsx` (live hint merge effect) — fuzzy de-duplication and single Safety Checks list before the note is saved.
- `src/features/sessions/utils/clinicianNotesSections.ts` — export the existing fuzzy key helper so the merge and the parser share one rule.
- One data update for the example session's `ai_diagnosis`.
