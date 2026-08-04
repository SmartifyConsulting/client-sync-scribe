# Hero polish, session notes framing, and start-session flow

## 1. Hero page — align closer to the reference

In `src/pages/Landing.tsx`:
- Reduce the intro paragraph ("Holarc is one connected platform…") by 1.5 font steps: `text-base sm:text-lg` becomes `text-sm sm:text-base`, and keep it muted.
- Match the reference stacking order in the hero: badge line → mono headline → short paragraph → capability pills (with the waveform motif) → action buttons (`Join the Ecosystem`, `Doctors`, `Patients`) last, left-aligned on desktop.
- Keep the pills left-aligned under the headline instead of centre-aligned, matching the reference.
- No colour, logo or token changes.

## 2. Sessions — Personal Notes frame

In `src/pages/Sessions.tsx`:
- Give the Personal Notes card the same green frame used elsewhere (`border-primary` instead of `border-border`), and tint the header strip the same way as other primary-framed cards, so it visually matches Session Notes.

## 3. Sessions — AI Clinician privacy note

In `src/pages/Sessions.tsx`, the AI Clinician block:
- Add a privacy note to the left of the "AI Clinician" heading row: "Private — not shared with the patient. Available only for the duration of the session."
- Keep and slightly expand the existing amber disclaimer beneath it so both the privacy scope and the clinical-decision-support caveat are visible.

## 4. Start Session should never ask to pick a patient again

Today only the patient profile passes `autoStart=true`; the other entry points land on the session screen in "Select a Patient" state even though the patient is known.

- Add `&autoStart=true` to the Start Session navigation in:
  - `src/pages/Patients.tsx`
  - `src/pages/Profile.tsx`
  - `src/pages/CalendarView.tsx`
  - `src/components/dashboard/UpcomingAppointments.tsx`
- In `src/pages/Sessions.tsx`, suppress the patient-selector idle screen whenever a `patient` query param is present (not just `autoStart`), showing the "Starting session…" state until the patient record resolves.
- The search-and-select widget stays for the case where a doctor opens the Sessions screen directly with no patient in the URL.

## Technical notes
- Presentation-only changes plus route query params; no schema or business-logic changes.
- The existing 6-second auto-start safety timeout remains, so a stale link still falls back to manual selection.
