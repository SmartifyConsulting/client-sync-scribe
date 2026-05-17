## Goals

1. Let admins jump back into the provider portals (Hospital / ER) from the admin area.
2. Hospitals can import their nursing staff (CSV or XLS) — matched nurses become active, unmatched are listed as "Inactive" stubs.
3. In a patient's Admissions tab, nurses can log interactions (vitals, observations, meds given, etc.); each record line is attributed to a nurse selectable from a dropdown of that hospital's roster (active + inactive).
4. Patients can rate the nurse on each admission record line.
5. Vulas accrue to nurses for good service; only claimable once the nurse signs up as a provider on the app, at which point their pending stub is linked and rewards become claimable.

---

## 1. Admin → Provider Portal navigation

- In `src/components/layout/Sidebar.tsx` (admin/main sidebar), add an "Enter Provider Portal" entry visible when `useIsAdmin()` is true, with a submenu: Hospital Ops (`/provider/hospital`) and Ambulance Ops (`/provider/ambulance`).
- In `ProviderSidebar.tsx` add a small "← Back to Admin" link at the top (visible only to admins) returning to `/admin`.
- `ProviderGate` already permits admins; no policy changes needed.

## 2. Hospital nurse roster

New table `hospital_nurses`:

- `id`, `hospital_id` (fk holarchelp_hospitals), `full_name`, `nurse_registration_number` (nullable), `email` (nullable), `mobile_number` (nullable), `role_title` (e.g. "RN, ICU"), `linked_user_id` (nullable fk profiles), `status` ('active' | 'inactive'), `pending_payload` jsonb, timestamps.
- Unique: (`hospital_id`, lower(email)) when email present; (`hospital_id`, nurse_registration_number) when present.
- RLS: hospital staff (via `is_hospital_staff`) can read/insert/update for their hospital; the linked nurse can read their own row; admins full access.

Edge function `hospital-import-nurses` (mirrors `hospital-import-affiliations`):

- Accepts `{ hospital_id, rows: [{ full_name, email, nurse_registration_number, mobile_number, role_title }] }`.
- Verifies caller is hospital staff. For each row: tries to match a `profiles` row by email or registration number → set `linked_user_id` + `status='active'`; otherwise insert with `status='inactive'` and `pending_payload`.
- Returns summary `{ matched, pending, skipped, errors }`.

UI: in Hospital portal, replace/extend "Our Doctors" with an additional **"Our Nurses"** screen (`/provider/hospital/nurses`) with:

- List of nurses (active/inactive chips).
- "Import Nurses" CSV dialog (clone `ImportDoctorsDialog` → `ImportNursesDialog`). Template at `public/templates/hospital-nurses-template.csv`.
- Manual "Add Nurse" form.

Trigger `link_pending_nurses_on_signup`: when a new profile row is created with role `nurse` (or any user signs up), match by email / registration number and set `hospital_nurses.linked_user_id` + `status='active'`. Extend `user_role` enum with `'nurse'` if not already present.

## 3. Admission interactions log

Patient Admissions today lives under `src/features/sessions/admissions/`. We add a per-line interactions feed.

New table `admission_interactions`:

- `id`, `admission_id` (fk hospital_admissions), `nurse_id` (fk hospital_nurses, nullable), `nurse_name_snapshot` (string, always populated), `recorded_by_user_id` (auth user), `interaction_type` ('vitals'|'observation'|'medication_given'|'procedure'|'note'|'other'), `payload` jsonb (e.g. HR/BP/SpO2/etc.), `notes` text, `recorded_at` timestamptz default now(), timestamps.
- RLS: reuse `can_access_admission` / `can_edit_admission`; nurses can insert when they are hospital staff for that admission's hospital; patient can read.

Existing `admission_vitals` continues to work; new vitals entries also create a corresponding `admission_interactions` row (or we surface vitals in the same feed via a view). Plan: keep `admission_vitals` for structured vitals, and **add `nurse_id` + `nurse_name_snapshot` columns to `admission_vitals**` plus the other admission_* tables (`admission_medications`, `admission_lab_results`, `admission_imaging`) so the nurse attribution is uniform across record types. The feed in the UI then unions them.

UI changes (frontend only, inside `AdmissionsView` and the Add* dialogs in `src/features/sessions/admissions/`):

- New `NursePicker` component: fetches nurses for the admission's `hospital_provider_id` (or the doctor's affiliated hospital fallback), shows active first and "(inactive)" suffix for stubs. Required field on each Add dialog (AddVitalsDialog, AddMedicationDialog, AddLabResultDialog, AddImagingDialog).
- New "Interactions" tab/section inside an admission detail view showing a chronological merged feed (vitals + meds given + observations + notes), each row showing `nurse_name_snapshot`, type, payload summary, timestamp.
- "Log Interaction" button → simple dialog with type + payload + nurse picker + notes.

## 4. Patient nurse rating

New table `nurse_record_ratings`:

- `id`, `admission_id`, `record_table` ('admission_vitals'|'admission_medications'|'admission_interactions'|...), `record_id`, `nurse_id` (fk hospital_nurses), `patient_user_id`, `rating` (1–5), `comment` text, `created_at`.
- Validation trigger: 1≤rating≤5; one rating per (record_table, record_id, patient_user_id).
- RLS: patient (admission owner) can insert/update own ratings; hospital staff + the rated nurse can read; admins read all.

UI:

- In `MyAdmissions` / patient-facing admissions view, each record line gets a small "Rate nurse" star control. Default hidden if `nurse_id` is null.
- Aggregate average shown on the nurse's profile card in the hospital Nurses screen.

## 5. Vulas for nurses (earn now, claim on signup)

New table `nurse_pending_vulas`:

- `id`, `hospital_nurse_id` (fk hospital_nurses), `vulas_count` integer, `reason` text ('patient_rating', 'manual_award', 'shift_completion', etc.), `reference_id` uuid (e.g. rating id), `awarded_by` uuid, `awarded_at`, `claimed_at` (nullable), `claimed_user_id` (nullable fk profiles).
- RLS: hospital staff for that nurse's hospital can insert / view; the linked nurse (once linked) can view their own; admins full.

Award logic (DB trigger or edge function):

- On `nurse_record_ratings` insert: if `rating >= 4`, add `vulas_count = rating * 10` to `nurse_pending_vulas` (e.g. 40–50 Vulas).
- Optional: hospital admin can manually award via a small "Award Vulas" button on the nurses screen.

Claim-on-signup:

- When `hospital_nurses.linked_user_id` becomes set (via signup match trigger from step 2), call a function `nurse_claim_pending_vulas(_nurse_id)` that copies unclaimed pending Vulas into the existing `doctor_rewards`-equivalent table for nurse providers (or a new `nurse_rewards` table that mirrors `doctor_rewards`: doctor_rewards already supports vulas_count — we'll add `nurse_rewards` with the same shape for clarity).
- Mark `nurse_pending_vulas.claimed_at = now()` and `claimed_user_id = linked_user_id`.

UI:

- Hospital Nurses screen shows: name, status chip, total pending Vulas, total claimed Vulas, average patient rating.
- Inactive nurse row gets a "Send signup invite" button (reuses existing invite flow with `role=nurse` metadata) so they can sign up and claim.
- After signup, the new nurse sees a "My Vulas" widget in their provider dashboard with claimable balance auto-credited.

---

## Technical notes (for the developer)

- Extend `public.user_role` enum with `'nurse'` if missing; update `handle_new_user()` to accept `'nurse'`.
- All new tables: RLS enabled, `updated_at` trigger, security-definer helpers `is_nurse_of_hospital(_hospital_id, _user_id)` for reuse.
- Frontend touch points: `src/components/layout/Sidebar.tsx`, `src/components/layout/ProviderSidebar.tsx`, new `src/modules/holarchelp/pages/provider/hospital/NursesScreen.tsx` + `ImportNursesDialog.tsx`, `routes-provider.tsx`, `src/features/sessions/admissions/*` (NursePicker + dialog updates + interactions feed + patient rating control), new `src/components/admissions/RateNurseControl.tsx`.
- Edge function: `supabase/functions/hospital-import-nurses/index.ts` (clone of affiliations importer).
- Reuse `safeInvoke`, `useProfile`, existing toast and React Query patterns.

## Out of scope

- No changes to ambulance roster (only hospitals get nurse rosters).
- No changes to existing doctor rewards math.
- No nurse scheduling/rostering features (shifts, payroll).
- No bulk Vula payout / fiat conversion logic — just accrual + claim linkage.