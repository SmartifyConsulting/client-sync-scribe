## Overview

Eight related changes across patient/doctor profiles, search, medication adherence, and sessions.

---

### 1. Enhanced doctor search (patients)

**DB**: Replace `public.search_doctor_profiles(_query text)` with a version that accepts optional `_name`, `_specialty`, `_language` parameters and matches across `full_name`, `practice_number`, `doctor_number`, `specialty`, and `preferred_language`/`preferred_languages`. Returns extra columns: `about_me`, `preferred_language`, `preferred_languages`.

**UI** (`src/pages/patient/MyDoctors.tsx`):
- Add three inputs: Name, Specialty (dropdown of common specialties), Language (dropdown using existing `LANGUAGES` list). Combine into single RPC call.
- Search results table gets an ellipsis (MoreVertical) action that opens a popover/dialog showing full credentials (practice #, registration #, languages, address, mobile) and the doctor's About Me pitch. Pitch is hidden by default — only shown via the ellipsis.

### 2. Doctor "About Me" pitch

**DB**: Add `about_me text` to `profiles` (nullable, max 600 words enforced client-side and via a CHECK using `array_length(regexp_split_to_array(...))`).

**UI** (`src/pages/MyPractice.tsx`): New accordion `AboutMeSection` placed **immediately above** the existing "Personal Information" accordion. Textarea + live word count (e.g. `423 / 600`); save disabled when over limit. Saves to `profiles.about_me` via `updateProfile`.

### 3. Rename "Certificates" → "Credentials"

In `src/pages/MyPractice.tsx`:
- Tab `value="certificates"` keeps its key but display label becomes "Credentials".
- Section heading "Certificates" → "Credentials".
- Description copy updated: "Track your professional credentials and CPD points".
- Dialog/form labels "Certificate Name" → "Credential Name", "Choose File" stays.
- Storage bucket name (`cpd-certificates`) and DB table (`cpd_certificates`) stay unchanged — internal only.

### 4. Block intake when wrong medication detected

In `src/features/rewards/components/MedicationAdherenceTab.tsx`:
- After `capturePillImage()` returns a `pillCheckResult` with `isMatch === false` (or `isPillVisible === false`), the "Continue / Take medication" button is disabled. Only "Retry" is offered.
- `proceedToIngestion()` guarded: refuses when `!pillCheckResult?.isMatch`.
- Update the on-screen warning to: "This does not match your prescribed medication. You cannot record intake until the correct pill is shown."

### 5. Show stop date for stopped medications

In `src/features/patients/components/PatientOverview.tsx` medication list (around line 720-734):
- For meds with `status === "inactive"` (or `"past"`), append the `end_date` next to the name as muted text: `Stopped 12 Apr 2026`. Format with `date-fns`. Keep the existing line-through styling.
- Also reflect in `PatientDetailsEditor.tsx` summary chips (lines 1683, 2667): badge text becomes `Past · 12 Apr 2026` when end_date present.

### 6. Offline / external doctor sessions (patient side)

Patients without a connected doctor should still record consultations attributed to a named-but-not-on-platform doctor.

**DB** migration on `sessions`: add nullable `external_doctor_name text`, `external_doctor_specialty text`, `external_doctor_practice text`. (No FK — this is free text.)

**UI**: New page `src/pages/patient/PatientSessions.tsx` (or extend existing patient session view) with:
- "New session" button → dialog asking for doctor name, optional specialty, optional practice/clinic, then creates a `sessions` row with `user_id = patient.user_id`, `patient_id = own patient record`, and the three external_doctor_* fields filled in.
- Adds RLS update so a patient (whose `patients.patient_user_id = auth.uid()`) can insert/select sessions where `user_id = auth.uid()` and `patient_id` is their own record.
- Session detail view shows the external doctor name in place of the practitioner profile when `external_doctor_name IS NOT NULL`.
- Recording flow reuses existing audio capture (`useAudioRecording`) and transcription pipeline.

Add a route `/patient/sessions` and a sidebar entry under My Holarchy.

### 7. Patient language preference

In `src/features/patients/components/PatientDetailsEditor.tsx` profile section:
- Add a Language dropdown bound to `profiles.preferred_language` for the logged-in patient. Reuses `LANGUAGES` constant from `src/pages/MyPractice.tsx` (extract to `src/lib/languages.ts`).
- Save via `supabase.from('profiles').update({ preferred_language }).eq('id', userId)`.

### 8. Remove secondary languages

- Remove the "Additional Languages" block in `src/pages/MyPractice.tsx` (lines 1188-1220).
- Stop reading/writing `preferred_languages` anywhere in the app.
- Migration: `ALTER TABLE profiles DROP COLUMN preferred_languages;` (and remove the auto-set logic in `Sessions.tsx` if present).

---

## Technical notes

```text
Migration files
├─ alter profiles add about_me text
├─ alter profiles drop column preferred_languages
├─ alter sessions add external_doctor_{name,specialty,practice} text
├─ recreate function search_doctor_profiles(_name, _specialty, _language)
└─ update RLS on sessions for patient self-authored rows
```

Word-count enforcement for About Me uses `regexp_split_to_array(trim(about_me), '\s+')` length ≤ 600 in a CHECK.

Doctor RPC signature change: keep old single-arg overload as wrapper for callers that haven't been updated, or update both call sites (`MyDoctors.tsx` is the only caller).