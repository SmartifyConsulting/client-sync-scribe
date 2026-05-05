## Plan

### 1. Vitamins/Supplements/OTC as its own accordion
Currently `DailyMedsInline` is rendered **inside** the "Allergies, Medication & Conditions" collapsible.

**Fix:** Move it out into its own teal-bordered `Collapsible` (icon: `Sparkles`, label: "Daily Vitamins, Supplements & OTC") placed directly **after** the Allergies/Medication/Conditions accordion in both view-mode (~line 1755) and edit-mode (~line 2774) branches of `PatientDetailsEditor.tsx`.

### 2. Emergency Contacts accordion styling parity
`EmergencyContactsInline.tsx` currently uses a custom non-clickable header (no chevron, no font parity).

**Fix:** Replace the static header with a real `CollapsibleTrigger` that mirrors the shared `SectionHeader` style used elsewhere (teal border, `text-xs font-semibold`, chevron rotation, click-to-toggle). Keep the "Same as Next of Kin" toggle inside the content.

### 3. Remove Hospital Admissions duplicates from MyDetails
- Remove `<PatientSelfAdmissionsSection>` from `src/pages/patient/MyDetails.tsx` (it duplicates what now lives in the Care → Hospital Admissions tab).
- The empty-state "Upload" duplicate in `AdmissionsView` was already removed.

### 4. Manual log buttons in Admissions / Emergency Incidents tabs (under "My Holarchy")
- **Admissions sub-tab:** `AdmissionsView` already has "Upload Admission Form". Add a sibling **"+ Log Admission"** button that opens a small dialog (hospital, admission/discharge dates, diagnosis) and inserts into `hospital_admissions` with `source: "patient"`. Reuse logic from `PatientSelfAdmissionsSection`.
- **Emergency Incidents sub-tab:** `PatientIncidentHistory` is currently read-only. Add a **"+ Log Incident"** button at top-right that opens a dialog (severity, summary/notes, date) and inserts a row into `holarchelp_incidents` with `user_id`, status `resolved`, `source: "manual"` (or similar field that exists). I'll inspect schema first; if there isn't a clean manual-source path I'll store summary in a notes/description column or use the existing `severity` + `created_at`.

### 5. First & Last name on profile shares
Update `ProfileSharesSection.tsx`: replace the single "Username or email" input with **First name**, **Last name**, **Username or email** fields. New columns `shared_with_first_name`, `shared_with_last_name` on `patient_profile_shares`. List view shows "First Last" prominently.

### 6. Cell phone medication reminder 5 minutes before time
Existing `send-medication-reminders` edge function runs every 5 min and currently fires when |scheduled − now| ≤ 5 min, which can fire after the dose time.

**Fix:** Change matching window so it fires only when scheduled time is **5 minutes in the future** (i.e. `scheduledMinutes - nowMinutes` is in [3, 7] given the every-5-minute cron drift). Update the notification title/body to "in 5 minutes". The existing cron job (`send-medication-reminders-every-5min`, `*/5 * * * *`) is already in place.

### Technical Summary

Files to edit:
- `src/features/patients/components/PatientDetailsEditor.tsx` — move `DailyMedsInline` out of the meds collapsible into its own accordion (view + edit branches).
- `src/features/patients/components/EmergencyContactsInline.tsx` — switch header to `CollapsibleTrigger` with shared font/chevron pattern.
- `src/pages/patient/MyDetails.tsx` — remove `PatientSelfAdmissionsSection` rendering (and its import).
- `src/features/sessions/admissions/AdmissionsView.tsx` — add "+ Log Admission" button + dialog (manual entry) when `canEdit`.
- `src/components/holarchelp/PatientIncidentHistory.tsx` — add "+ Log Incident" button + dialog when viewing one's own history; insert into `holarchelp_incidents`.
- `src/features/patients/components/ProfileSharesSection.tsx` — add first/last name inputs and display.
- New SQL migration: `ALTER TABLE patient_profile_shares ADD COLUMN shared_with_first_name text, ADD COLUMN shared_with_last_name text;`
- `supabase/functions/send-medication-reminders/index.ts` — change matching condition from |diff|≤5 to "scheduled is 3–7 minutes ahead of now"; reword title to "Take {med} in 5 min".
