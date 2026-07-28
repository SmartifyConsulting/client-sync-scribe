## 1. Clicking a document opens the patient profile instead of the document

Confirmed cause: document rows link to `/patients/:id?tab=documents&doc=:docId` (`src/pages/doctor/DoctorDocumentsTab.tsx`), but `src/pages/PatientProfile.tsx` renders `<Tabs defaultValue="details">` and never reads the URL — so both `tab` and `doc` are ignored and you land on Details → Personal Information.

Fix:
- Make the profile tabs controlled from `?tab=` (falling back to `details`), writing the tab back to the URL on change.
- On load, if `?doc=` is present, open that document in the existing preview dialog, then clear the param.
- Same handling on the patient-side documents entry point.

## 2. Organ Donor accordion not green

Both Organ Donor blocks in `PatientDetailsEditor.tsx` use hand-rolled `Collapsible` triggers that are only green when open. Switch them to the shared `SECTION_TRIGGER_ALWAYS_GREEN_CLASS` treatment, and sweep the file for any other trigger still not using it.

## 3. Accordion row fonts one size smaller

For Personal Information and Medical Information rows only: `text-sm` → `text-xs`, icons `h-4` → `h-3.5`, applied through the shared `SectionHeader` helper.

## 4. Search in Calendar

Add a debounced search box to `src/pages/CalendarView.tsx` (beside the existing doctor filter) filtering events by title, patient and type across month/week/day views; mirror it in `src/pages/patient/PatientCalendar.tsx`.

## 5. Sessions list spacing + count position

In `ListGroupToolbar` (Sessions, Round Tables, Admissions): add real vertical gap between rows, and move the count pill to the far right of the accordion header, matching Documents.

## 6. Remove count next to Credentials tab

In `src/pages/MyPractice.tsx` the Credentials tab label appends the CPD total (`Credentials (24)`). Render the label alone; the CPD total stays visible inside the tab body.

## 7. My Rewards full width on desktop

`DoctorRewards.tsx` clamps to `max-w-3xl` when not embedded, and the rewards page sits in a narrow container. Remove the clamp so My Rewards uses the full content width on desktop (stat cards stretch to a 4-across grid as in the patient screenshot), keeping comfortable padding.

## 8. Merge Patient and Doctor rewards into one screen

Today there are two divergent implementations: patient tabs are Overview / Chronic Meds / Wins and Streaks / Redeem, doctor tabs are Overview / Milestones / Streaks / History / Redeem, with different Redeem UIs.

Plan:
- Make the patient version (`src/pages/patient/MyRewards.tsx`) the single shared rewards screen, including its Redeem tab, which is the correct one.
- Route the doctor rewards entry point (and the embedded "Rewards" tab in My Practice) to this shared screen instead of `DoctorRewards.tsx`.
- Role differences, and only these:
  - Doctors additionally see the **Doctor Vulas** and **Combined** stat cards alongside Patient Vulas / Vula Vault; patients see the patient-only set.
  - The **Chronic Meds** tab remains patient-only (already conditional).
- Doctor-only content worth keeping (milestones/history views) is folded into the shared Overview/Wins-and-Streaks tabs rather than kept as separate tabs, so both roles see the same tab set.
- `DoctorRewards.tsx` is reduced to a thin re-export/wrapper (or deleted once no imports remain) to avoid a second drifting copy.

## Technical notes

- Files touched: `src/pages/PatientProfile.tsx`, `src/pages/patient/PatientDocuments.tsx`, `src/features/patients/components/PatientDetailsEditor.tsx`, `src/components/common/ListGroupToolbar.tsx`, `src/pages/CalendarView.tsx`, `src/pages/patient/PatientCalendar.tsx`, `src/pages/MyPractice.tsx`, `src/pages/patient/MyRewards.tsx`, `src/pages/doctor/DoctorRewards.tsx`, plus route wiring in `src/App.tsx`.
- No database changes; existing rewards hooks (`usePatientRewards`, doctor Vula queries) are reused as-is.
