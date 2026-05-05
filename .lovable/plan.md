# Reminders, Vula awards, and provider public/private flag

## 1. Medication reminder time + reminder toggle in add-medication form

The Add Medication form in `PatientDetailsEditor.tsx` is missing a time-of-day field and a "Remind me" toggle. The `prescriptions` table already has `reminder_times` and `reminders_enabled` from last turn, but the editor never populates them.

- Extend `newMed` state with `reminder_time: "08:00"` and `remind_me: true`.
- Add a `<Input type="time">` ("Take at") and a `<Switch>` ("Remind me 5 min before") to the add-med form.
- Extend `CurrentMedication` type in `usePatients.ts` with `reminder_time?: string` and `reminders_enabled?: boolean`.
- In each med list row, render a Bell + Switch matching `DailyMedsInline`.
- In `syncChronicMedsToPrescriptions`, set `reminder_times: m.reminder_time ? [m.reminder_time] : null` and `reminders_enabled: m.reminders_enabled ?? true`.
- Existing `send-medication-reminders` edge function already filters on `reminders_enabled = true` in the 3–7 min window.

## 2. Daily Vitamins/Supplements — "Remind me" toggle on add

`DailyMedsInline.tsx` row toggle already exists (added last turn). Add a "Remind me" `<Switch>` next to the reminder-time input in the add-form (defaults to true). On insert, pass `reminders_enabled` explicitly.

## 3. Doctor check-in rewards — 30 Vulas per check-in, 60/month per patient cap

A "check-in" = doctor opens a connected patient's record and posts a brief check-in (new explicit action button on doctor's view of patient profile).

- **New table `doctor_patient_checkins`**: `doctor_id`, `patient_user_id`, `note`, `created_at`. RLS: doctor inserts/reads own; patient reads own.
- **New SECURITY DEFINER function `award_doctor_checkin(_patient_user_id uuid, _note text)`**:
  - Verifies caller is a doctor with active access to the patient.
  - Inserts the checkin row.
  - Sums `doctor_rewards.moolas_count` this calendar month for this `doctor_id` + reward_type `'patient_checkin'` + `reference_id = _patient_user_id`.
  - If `monthly_total + 30 <= 60` → insert `doctor_rewards (reward_type='patient_checkin', moolas_count=30, reference_id=_patient_user_id)` and return `{ awarded: true, total: monthly_total+30 }`.
  - Otherwise return `{ awarded: false, reason: 'monthly_cap', total: monthly_total }`.
- **UI**: On doctor's view of `PatientProfile.tsx`, add a "Check in" button (heart icon) opening a small dialog (note textarea) → calls RPC → toasts "+30 Vulas" or "Logged (cap reached)".

## 4. Onboarding rewards — 30 Vulas each side

When a new doctor↔patient connection becomes active in `doctor_patient_access` (the canonical roster table), award:
- 30 Vulas to the patient (`patient_rewards`, `reward_type='doctor_onboarded'`, `reference_id=doctor_id`)
- 30 Vulas to the doctor (`doctor_rewards`, `reward_type='patient_onboarded'`, `reference_id=patient_user_id`)

Deduplicate by `(reward_type, reference_id, recipient)` so reactivation never double-pays.

- **New trigger `trg_award_onboarding`** on `doctor_patient_access` AFTER INSERT or AFTER UPDATE OF is_active when `is_active=true`:
  - If no existing `patient_rewards` row matches → insert 30 Vulas for the patient.
  - If no existing `doctor_rewards` row matches → insert 30 Vulas for the doctor.
- Function runs SECURITY DEFINER so triggers bypass RLS for the reward inserts.

## 5. Blood donation rewards — 100 Vulas, approved only by a Blood Bank

- **New role**: extend `app_role` enum with `'blood_bank'`.
- **New table `blood_bank_providers`**: `id`, `owner_id`, `name`, `registration_number`, `address`, `city`, `country`, `latitude`, `longitude`, `status` ('pending'|'approved'|'rejected'), `approved_at`. Mirror `holarchelp_hospitals` patterns. RLS: anyone authenticated can read approved; owners can read/update own; admins can read all.
- **New SECURITY DEFINER function `holarchelp_approve_blood_bank(_id uuid)`** (admin only) — approves and grants `'blood_bank'` role to the owner (mirrors `holarchelp_approve_hospital`).
- **New table `blood_donations`**: `id`, `patient_user_id`, `blood_bank_id`, `donated_at` (date), `status` ('pending'|'approved'|'rejected'), `approved_by`, `approved_at`, `notes`, `created_at`.
  - RLS: patient can insert/select own; blood_bank members (owner_id of `blood_bank_providers`) can select+update donations linked to their bank.
- **New SECURITY DEFINER function `approve_blood_donation(_donation_id uuid)`**:
  - Caller must own the `blood_bank_id` referenced (or have `'blood_bank'` role + match owner).
  - Sets status='approved', approved_by=auth.uid(), approved_at=now().
  - Inserts `patient_rewards (reward_type='blood_donation', moolas_count=100, reference_id=_donation_id)` if not already awarded.
- **UI (patient)**: In My Holarchive → Care, add a small "Blood Donations" card with "+ Log donation" → pick approved blood bank from dropdown, pick date → row created `pending`. Awarded badge once approved.
- **UI (blood bank dashboard)**: New simple page at `/blood-bank` listing pending donations with Approve/Reject buttons, gated by `useUserRole() === 'blood_bank'`. (Lightweight first cut — table view with action buttons.)

## 6. Public vs Private provider flag + map filtering

- Migration: add `ownership text NOT NULL DEFAULT 'private' CHECK (ownership IN ('public','private'))` to `holarchelp_hospitals` and `holarchelp_ambulance_providers`.
- Extend `search_providers()` RPC to include `ownership` (NULL for doctor rows).
- `MyDoctors.tsx` results: render a small "Public"/"Private" badge.
- HolarcHelp map: detect whether the active patient has a medical aid (`patients.medical_aid` or `medical_aid_number` non-empty). If neither is set → filter markers to `ownership='public'` for hospitals & ambulances; show banner "Showing public providers only — add medical aid details to see private providers." Otherwise show all approved.

## Technical Summary (files & migrations)

**Migrations**
- `CREATE TABLE doctor_patient_checkins` + RLS.
- `CREATE FUNCTION award_doctor_checkin(_patient_user_id uuid, _note text)` (returns json).
- `CREATE FUNCTION award_onboarding()` + `CREATE TRIGGER trg_award_onboarding` on `doctor_patient_access`.
- `ALTER TYPE app_role ADD VALUE 'blood_bank'`.
- `CREATE TABLE blood_bank_providers` + RLS.
- `CREATE FUNCTION holarchelp_approve_blood_bank(_id uuid)`.
- `CREATE TABLE blood_donations` + RLS.
- `CREATE FUNCTION approve_blood_donation(_donation_id uuid)`.
- `ALTER TABLE holarchelp_hospitals ADD COLUMN ownership ...`; same on `holarchelp_ambulance_providers`.
- `CREATE OR REPLACE FUNCTION search_providers(...)` with new `ownership` column in returns.

**Frontend**
- `src/hooks/usePatients.ts` — extend `CurrentMedication` with reminder fields.
- `src/features/patients/components/PatientDetailsEditor.tsx` — add reminder time + switch to add-med form, persist into prescriptions sync.
- `src/features/patients/components/DailyMedsInline.tsx` — add "Remind me" switch in add form.
- `src/pages/PatientProfile.tsx` (doctor view) — add Check-in button + dialog calling `award_doctor_checkin`.
- `src/pages/patient/MyDoctors.tsx` — Public/Private badge.
- New `src/features/care/BloodDonationsCard.tsx` — patient-side log + status list.
- New `src/pages/BloodBankDashboard.tsx` + route `/blood-bank` — pending donations approval.
- HolarcHelp map page — filter markers + banner based on patient medical aid.

No new secrets required. Vula tallies surface in the existing rewards summaries automatically (both `patient_rewards` and `doctor_rewards` tables already drive the rewards UI).
