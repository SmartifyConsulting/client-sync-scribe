## Fixes

### 1. Emergency Contacts missing in view mode
`EmergencyContactsInline` is only rendered inside the edit-mode branch of `PatientDetailsEditor` (line 2394). In view mode (default state) it never appears.

**Fix:** Render `EmergencyContactsInline` inside the view-mode "Personal Information" tab, directly after the Next of Kin accordion (around line 1610), so it always shows for self-service patients.

### 2. Vitamins & Supplements (Daily Meds) missing in view mode
Same root cause: `DailyMedsInline` is only rendered inside the edit-mode branch (line 2752). In view mode the section is invisible, so patients can't see or add vitamins/supplements unless they enter edit mode.

**Fix:** Render `DailyMedsInline` inside the view-mode "Medical" tab — placed within the "Allergies, Medications & Conditions" area so it mirrors edit-mode placement and is always visible.

### 3. About Me not visible in provider details dialog
Details dialog in `MyDoctors.tsx` (lines 434–470) only renders the About Me block when `about_me` is truthy. When a doctor hasn't filled it in, the section is silently hidden.

**Fix:** Always render the "About Me" section in the details dialog with a "Not provided yet" fallback for empty values, so users always see the section is supported.

### 4. Mediclinic shown as "doctor" / Emergency ER duplicated
Root cause: `seed-test-providers` edge function creates each provider's `profiles` row with `role: 'doctor'` (line 82). The `search_providers` RPC matches them under the doctors UNION branch via `profiles.role = 'doctor'`, so they appear as doctors in addition to their proper hospital/ambulance rows.

**Fix:**
- Remove `role: "doctor"` from the upsert in `seed-test-providers/index.ts`.
- Migration to clear `role` on existing seeded provider profiles (Mediclinic Sandton `1474d918-...`, Emergency ER `3e602516-...`) so they stop showing as doctors.

### 5. Search results not grouped
`MyDoctors.tsx` renders all results in a single flat table. Group by `kind` into three labeled sub-sections — **Doctors**, **Hospitals**, **Ambulances** — each rendered as its own subheader + table, only when it has results.

### 6. Duplicate "Upload Admission Form" button
`AdmissionsView.tsx` shows the button both in the header (line 161) and again in the empty-state card (line 175). Remove the empty-state duplicate; keep only the header button.

## Technical Summary

Files to edit:
- `src/features/patients/components/PatientDetailsEditor.tsx` — Add `EmergencyContactsInline` and `DailyMedsInline` rendering inside the view-mode tabs (Personal Info / Medical), not only edit mode.
- `src/pages/patient/MyDoctors.tsx` — Group `searchResults` by `kind` into three labeled sub-tables; always render "About Me" in the details dialog with a fallback.
- `src/features/sessions/admissions/AdmissionsView.tsx` — Remove the duplicate `<Button>` inside the empty-state `<Card>`.
- `supabase/functions/seed-test-providers/index.ts` — Remove `role: "doctor"` from the profile upsert.
- New SQL migration — `UPDATE profiles SET role = NULL WHERE id IN ('1474d918-3d23-44ce-8e6d-ea6f6c7ba395', '3e602516-a69a-48be-ab5e-9ddba4ed8524');` to fix existing seeded data.
