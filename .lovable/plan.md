# Plan — UX & workflow polish (updated)

## 1. Sign-up & profile
- Default role = **Patient** on `Auth.tsx` and `Landing.tsx` dropdown.
- Larger dial-code selector in `PhoneNumberInput.tsx` (`text-sm h-11 min-w-[120px]`) — applied everywhere.
- Mailbox email helper: *"This is your document intake address. You won't receive mail here — anything emailed to it is auto-filed under your Documents tab."*

## 2. Practice partners (`MyPractice.tsx`)
- Green-bordered **"Practice Partners"** frame.
- Three invite modes: email, dropdown of existing doctors, copy shareable signup link.
- Per-partner color swatch + **Share calendar** checkbox (new `practice_members.share_calendar`).
- Remove the standalone Shared Practice Calendar entry point.

## 3. Navigation — "My Sessions"
- New sidebar item under "My Patients", route `/sessions`.
- Accordion grouped Today (expanded) / Last week / Last month / Older — teal-bordered to match doctor profile.

## 4. Home page task list
- `CompactTodoList.tsx` — show all action icons by default with tooltips.

## 5. Currency
- Remove **NAD**, add **NGN (₦ Naira)**.

## 6. Photo upload UX
- Prominent dashed drop zone + "Upload photo" label on all profile pages **except Hospital**.

## 7. Camera errors
- `MediaCapture.tsx` + `IncidentPhotos.tsx`: map `NotReadableError`/`TrackStartError` → *"Your camera looks busy — another app (Zoom, Teams, browser tab) may be using it. Close it and try again."* Also handle `NotAllowedError` and `NotFoundError`.

## 8. Chronic medication → Emergency contact link
- When **Chronic** toggled in `AddMedicationDialog`/`DailyMedsInline`, reveal checkbox *"Notify my emergency contact if I miss this medication"*.
- Persist `prescriptions.notify_emergency_on_missed`.

## 9. Emergency contact / NOK fixes
- Relationship `<Select>` no longer locks after blur — remove disabled logic.
- Zod email validation on emergency contact + NOK email fields.

## 10. Patient document uploads + AI explanations
- Enable upload on `PatientDocuments.tsx` for patients (existing bucket + RLS).
- On image/PDF upload, call `ai-medical-image-analysis` (Gemini 2.5 Pro), persist `documents.ai_summary`, render with medical disclaimer.

## 11. Baseline pill-recording explainer (NEW)
- On `PillBaselineCapture.tsx`, prepend a friendly info card before the Record button:
  > *"One-time setup — about 10 seconds. Show your tablet and how you take it. Our AI uses this to recognise your medication and your face on future check-ins, so you won't need to record this again."*
- Use `Info` icon, teal background, dismissible only after recording completes.

## 12. SOS recording — extend timer + no hallucinations (NEW)
- `IncidentVoiceNoteRecorder.tsx` / `SosVoiceNoteDialog.tsx`: increase max recording duration **+5 seconds** (current cap → cap+5).
- Backend transcription path: if audio blob is missing, < 500 ms, or silence-only, **skip the AI call entirely** and store `transcript = null` with `status = "no_recording"`. UI renders *"No recording captured"* instead of any AI-generated text. Prevents Whisper from hallucinating filler phrases on empty audio.

## 13. Hospital admissions (NEW)
- In `ManualLogAdmissionDialog.tsx` / admission form, add a **Hospital** `<Select>` populated from `holarchelp_hospitals` + the doctor's `hospital_doctor_affiliations`. Currently the field is missing — wire it to `hospital_admissions.hospital_id`.
- Add a repeatable **Procedure / Diagnostic Codes** section: each row = `code` (text) + `description` (text). Stored as `hospital_admissions.procedure_codes jsonb default '[]'`. Render as a small table inside a green-bordered frame with "Add code" button.

## 14. Full UI translation sweep (NEW — Part 3)
- Replace every hardcoded label, button, heading, tab title, menu item, placeholder, and toast string across all screens with `t()` keys.
- **Excluded**: user-entered data, frame content (notes, transcripts, patient records, AI output) — those stay in their source language.
- Process:
  1. Add namespaces per portal (`doctor`, `patient`, `hospital`, `ambulance`, `insurer`, `pharmacy`, `admin`, `common`).
  2. Sweep components with a script that flags JSX text nodes / `<Button>` children / `<Label>` text / `aria-label` / `placeholder`.
  3. Batch-translate the master `en.json` into all 25 locales via Lovable AI (Gemini 2.5 Flash).
  4. Verify live re-render on language switch + RTL for Arabic/Hebrew.
- Roll out portal-by-portal so each is testable: Doctor → Patient → Hospital → Ambulance → Insurer → Pharmacy → Admin.

## Schema changes (single migration)
- `practice_members.share_calendar boolean default true`
- `prescriptions.notify_emergency_on_missed boolean default false`
- `hospital_admissions.hospital_id uuid references holarchelp_hospitals(id)`
- `hospital_admissions.procedure_codes jsonb default '[]'`

## Verification
- Baseline card visible only until first successful capture.
- SOS recorder runs 5s longer; empty recording yields no AI text.
- Hospital dropdown lists affiliated + public hospitals; codes save and re-load.
- Switching language updates every label/button across the swept portal without page reload.

Approve and I'll execute end-to-end.