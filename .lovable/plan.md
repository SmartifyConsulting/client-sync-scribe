

# Plan: Bug tracker on mobile + chronic meds appearing on Rewards

## Issue 1 — Bug tracker icon missing on mobile

**Root cause:** `PatientAppLayout.tsx` has a hand-rolled mobile top bar (lines 130–282) that only renders Calendar, Bell, and Avatar buttons. The `TopBarIcons` component (which contains the green Bug/Report button) is rendered only inside the **desktop-only** wrapper at line 286–288 (`hidden md:flex`). The doctor's `MobileHeader.tsx` already uses `TopBarIcons` correctly — only the patient layout is missing it.

**Fix:** Replace the hand-rolled mobile header in `PatientAppLayout.tsx` with `<TopBarIcons />` so patients see the same icon set as doctors: **Bug · Calendar · Mic · Bell · Avatar**. The existing desktop `TopBarIcons` at line 287 stays. The mobile-only Calendar/Bell/Avatar buttons currently rendered in the `<header>` are removed because `TopBarIcons` already provides all of them (and adds the Bug button + Mic).

The mobile header stays sticky and keeps the logo on the left + icons on the right. No behavior change for desktop.

## Issue 2 — Lilly Fluoxetine, Voxra, Nuvigil don't show a baseline tracker

**Root cause:** Confirmed in the database:

- Shannon's `patients.current_medications` JSON contains 6 chronic meds: Nuvigil, Metformin, Voxra, Amlodipine, Atorvastatin, Lilly Fluoxetine — all flagged `is_chronic: true`.
- Her `prescriptions` table has only **3** rows: Sertra, melatonin, Dormanoct.
- The Rewards "Chronic Meds" tab (`MedicationAdherenceTab`) queries `prescriptions` only — it has no awareness of `current_medications`.
- The chronic→prescriptions sync described in the previous approved plan was **never wired into `handleSave`** (the save handler in `PatientDetailsEditor.tsx` contains zero references to the `prescriptions` table).

So when Shannon adds a chronic med to her profile, it lands in `patients.current_medications` but never propagates to `prescriptions`, so no baseline-capture row ever appears.

**Fix — three parts:**

### A. Backfill the missing prescriptions for Shannon (one-off migration)

Insert one `prescriptions` row per chronic med in her `current_medications` that doesn't already exist (matching by lowercase trimmed `medication` name on `patient_id = bc6973cc...`):

| medication | dosage | frequency | status | doctor_id |
|---|---|---|---|---|
| Nuvigil | 150 mg | once daily | active | her connected doctor |
| Voxra | 300 mg | once daily | active | her connected doctor |
| Lilly Fluoxetine | 20 × 2 | once daily | active | her connected doctor |
| Metformin | 500mg BD | once daily | active | her connected doctor |
| Amlodipine | 5mg OD | once daily | active | her connected doctor |
| Atorvastatin | 10mg nocte | once daily | active | her connected doctor |

`doctor_id` resolves from the most recent `doctor_patient_access` row for `patient_user_id = 96740682-…`; if none, falls back to the doctor that owns the existing 3 prescriptions (`54fa34d8-…`).

After insert, all 9 chronic meds (the 3 existing + 6 new) appear under **Chronic Meds** with the **"Set up baseline"** button ready to capture.

### B. Wire the chronic→prescriptions sync into `PatientDetailsEditor.handleSave`

So this never happens again. After the patient `.update()` succeeds:

1. For every entry in `currentMedications` with `is_chronic === true`, **upsert** a `prescriptions` row keyed on `(patient_id, lower(trim(medication)))`:
   - `medication` ← `name`
   - `dosage` ← composed `"{quantity} × {strength}{units}"` (or legacy `dosage` string when structured fields absent)
   - `frequency` ← `"{times_per_day}× daily"` (default `"once daily"`)
   - `status` ← `"active"`
   - `doctor_id` ← `auth.uid()` if a doctor is editing; otherwise the patient's primary connected doctor (most recent active `doctor_patient_access`); if none, skip the upsert and toast: *"Add a doctor to your profile so chronic meds can be tracked under Rewards."*
2. For every `prescriptions` row whose medication name is no longer present (or is no longer `is_chronic`), `update status = 'cancelled'`.
3. Emit `medicationSyncBus` `"medications-updated"` (already implemented) so `MyRewards`, `MedicationAdherenceTab`, `TodaysMedicationsCard`, `Sessions`, and `PatientOverview` invalidate their query caches and refresh.

### C. Show a friendly empty-state hint when sync is blocked

If the patient has chronic meds in their profile but no connected doctor to attribute prescriptions to, the Rewards "Chronic Meds" tab shows a one-line hint above the prescription list: *"Some of your chronic meds aren't tracked yet — add your doctor under My Healthcare so we can set up baseline capture."* with a button linking to `/patient/details?section=care`.

## Files touched

| File | Change |
|---|---|
| `src/components/layout/PatientAppLayout.tsx` | Replace hand-rolled mobile Calendar/Bell/Avatar buttons with `<TopBarIcons />` so the green Bug button (and Mic) appears on mobile. Desktop layout unchanged. |
| `src/components/patients/PatientDetailsEditor.tsx` | Wire chronic→prescriptions upsert + cancellation into `handleSave`; emit `medicationSyncBus`. |
| `src/components/rewards/MedicationAdherenceTab.tsx` | Add empty-state hint when patient has chronic meds in profile but no doctor connected. |
| Migration | One-off backfill of Shannon's 6 missing chronic prescriptions into `prescriptions`. |

## Out of scope

- Changing the doctor-side mobile header (already uses `TopBarIcons`).
- Auto-creating baseline pill references — patient still taps "Set up baseline" per med.
- Backfilling prescriptions for other patients — only Shannon was reported. The `handleSave` fix prevents new occurrences for everyone going forward; if other patients are affected we can run a project-wide backfill later.

