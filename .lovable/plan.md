## Prescription Renewal Reminders & Doctor Hide/Deactivate

Two related patient features:

### 1. Repeat-prescription renewal reminders

**Detection (client-side, no schema changes):**
- A prescription needs renewing when `status='active'` AND any of:
  - `end_date` is within the next 7 days (or already passed)
  - `refills_remaining = 0` AND `end_date` is null (chronic refill exhausted)
- Use `refill_reminder_days` (already on the table) as the lead window when present, else default 7.

**Where the patient sees it:**
- New "Renewals due" card on `src/pages/patient/PatientDashboard.tsx` listing each medication with: name, dosage, frequency, days-until-expiry, original prescribing doctor's name.
- Also a "Needs renewal" badge + button on `PrescriptionHistory.tsx`.
- One `notifications` row per prescription per renewal window (dedupe via `metadata.prescription_id` + `metadata.window_start`).

**Renewal action — request via task:**
- "Request renewal" button opens a dialog with three sections:
  1. **Prescription summary (read-only)** — medication, dosage, frequency, instructions, refills remaining, end date. Visually styled as a disabled/read-only block so the patient cannot edit the original prescription.
  2. **Doctor selector** — defaults to the original prescribing `doctor_id`. Dropdown lists the patient's active+non-hidden doctors (see feature 2). An "Other doctor…" option opens the existing doctor search.
  3. **Patient comment (optional, free text)** — labelled clearly, e.g. *"Anything you'd like changed? (dose, frequency, side-effects, switch medication, etc.)"* with placeholder examples. Multi-line textarea, ~500 char limit. This is the only editable field — the patient never mutates the prescription itself; the comment is the channel for requesting adjustments.
- On submit, insert a `todos` row assigned to the chosen doctor:
  - `user_id` = chosen doctor's id
  - `patient_id` = patient id
  - `task_type = 'prescription_renewal'`
  - `title` = "Renew prescription: {medication} {dosage}" (suffix " — adjustment requested" when the patient added a comment, so the doctor sees at a glance it's not a plain renewal)
  - `description` = read-only prescription summary + a clearly delimited **"Patient comment"** block containing the free text (empty section omitted when no comment)
  - `priority` = `'high'` when already expired OR a comment was provided, else `'normal'`
  - `due_date` = prescription `end_date` (or +7 days)
- Also write a `notifications` row to the chosen doctor. When a comment is present, the notification title reads "Renewal + adjustment request" so the doctor knows to read before re-prescribing.
- Persist the request in `prescription_renewal_requests` (see Technical) including the comment, so the patient's button flips to "Renewal requested" and we can show the comment back to them.

### 2. Hide / deactivate doctors on the patient side

- On `src/pages/patient/MyDoctors.tsx`, add per-doctor actions: **Deactivate** and **Hide**, plus **Active** / **Hidden** tabs with **Restore** in the Hidden tab.
- Hiding/deactivating only affects the patient's view and the patient-side doctor lists (renewal selector, round table participants, share targets). Historic data (sessions, prescriptions, documents, notes) remains visible in their respective history views.
- Doctors are not notified when hidden/deactivated.

**Semantics:**
- *Deactivate*: ends the working relationship — sets `doctor_patient_access.is_active = false` and `revoked_at = now()`. Doctor loses live access going forward.
- *Hide*: pure visual filter for the patient. Stored in a new patient-owned mapping table so the patient can hide and restore independently of active/inactive state.

### Out of scope
- No doctor-side UI changes beyond receiving the new `todo` + notification.
- No SMS/email — in-app notification bell only.
- No new medications/dosing/AI logic.
- No automatic deactivation based on inactivity.

---

### Technical section

**Schema additions (one migration):**

1. `public.patient_hidden_doctors`
   - `id uuid pk`, `patient_user_id uuid`, `doctor_id uuid`, `hidden_at timestamptz`, unique `(patient_user_id, doctor_id)`.
   - GRANT select/insert/delete to `authenticated`; ALL to `service_role`.
   - RLS: `patient_user_id = auth.uid()`.

2. `public.prescription_renewal_requests`
   - `id uuid pk`, `prescription_id uuid` (fk), `patient_user_id uuid`, `requested_doctor_id uuid`, `original_doctor_id uuid`, `todo_id uuid null`, `status text default 'pending'`, `patient_comment text null`, `created_at`, `updated_at`.
   - GRANT to `authenticated` + `service_role`.
   - RLS: patient (owner) can select/insert/update their own; `requested_doctor_id` can select/update; admin via `has_role`.
   - `updated_at` trigger.

**Files to add/edit:**
- `supabase/migrations/<ts>_renewals_and_hide_doctors.sql` — both tables + RLS + GRANTs + trigger.
- `src/features/patients/hooks/usePrescriptionRenewals.ts` — derive `needsRenewal`, join existing renewal requests.
- `src/features/patients/components/RenewalRequestDialog.tsx` — read-only prescription summary, doctor selector (default = original prescriber), optional patient comment textarea, submit handler that composes the todo description with a "Patient comment" block when present.
- `src/features/patients/components/RenewalsDueCard.tsx` — used on `PatientDashboard.tsx`.
- Update `src/pages/patient/PrescriptionHistory.tsx` — "Needs renewal" badge + button to open the dialog.
- `src/pages/patient/MyDoctors.tsx` — Active/Hidden tabs, Deactivate/Hide/Restore actions.
- `src/features/patients/lib/visibleDoctors.ts` — returns the patient's active+non-hidden doctors; reused everywhere "my doctors" is listed.

**Notification dedupe:** insert a `notifications` row with `metadata = { prescription_id, window_start }` and skip when one already exists.

**No edits to** auto-generated Supabase types/client; no edge functions needed.
