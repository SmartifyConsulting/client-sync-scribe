# Plan

## 1. Fix "invite error" on re-accept (root cause)

`doctor_patient_access` has `UNIQUE (doctor_id, patient_user_id)`. When a patient removes a doctor we set `is_active = false` but keep the row. On re-invite + accept, `DoctorAccessRequests.handleAcceptRequest` does a plain `INSERT` → unique-violation → toast error.

Fix in `src/components/doctor/DoctorAccessRequests.tsx`:

- Replace the `.insert(...)` with `.upsert({...}, { onConflict: 'doctor_id,patient_user_id' })`, setting `is_active: true`, refreshed `permissions`, and clearing `revoked_at`.
- Same defensive upsert (`onConflict: 'user_id,patient_user_id'`) for the `patients` row creation, since a stale inactive `patients` row from the prior connection can also collide.

## 2. SOS — per-severity emergency-contact escalation

Patients choose, per emergency contact, the **minimum incident severity** that triggers notifying them.

Schema (migration):

- `ALTER TABLE public.holarchelp_emergency_contacts ADD COLUMN notify_min_severity text NOT NULL DEFAULT 'low' CHECK (notify_min_severity IN ('low','medium','high','critical'));`

UI — `src/modules/holarchelp/pages/HolarcHelpContacts.tsx`:

- Add a Select (Low / Medium / High / Critical only) to the add form and to each list item, persisted via update.
- Helper text: "Contact will only be alerted for incidents at this severity or higher."

Edge function — `supabase/functions/share-incident-with-contacts/index.ts`:

- Accept incident severity (already in payload / fetch from `holarchelp_incidents`).
- Filter contacts by `severityRank(contact.notify_min_severity) <= severityRank(incident.severity)` before sending email/SMS/WhatsApp.

## 3. SOS — public vs private routing

When a patient triggers SOS (or a provider triggers on the patient's behalf) the dispatcher must know whether to alert public-only or all hospitals/ambulances based on whether the patient has medical aid.

- Reuse existing `patients.medical_aid_name` (treat blank/null = public-only).
- Update `src/modules/holarchelp/pages/HolarcHelpHome.tsx` SOS submit: include `coverage: 'public' | 'private'` in the new `holarchelp_incidents` row (add column `coverage text` via migration, default `'public'`).
- Update `src/modules/holarchelp/components/ProviderMap.tsx` and provider dispatch lists to filter:
  - `coverage = 'public'` → only `holarchelp_hospitals.ownership = 'public'` and ambulances flagged public.
  - `coverage = 'private'` → all approved providers.
- Confirm the red SOS button on bottom nav works with zero manual input (it already does — incident is created with current geo + auto coverage).

## 4. Data-sharing transparency dialog for doctor → patient invites

Mirror the existing patient-invites-doctor flow. Reuse `PermissionTransparencyModal` with a new variant.

- Extend `src/components/permissions/PermissionTransparencyModal.tsx`:
  - Accept `mode: 'patient_invites_doctor' | 'doctor_invites_patient'` (default existing behaviour).
  - In `doctor_invites_patient` mode, swap the two columns to show what is shared **with the wider care team** vs. **kept private to this practice**:
    - Shared with other doctors on the patient's profile: AI session summary contribution, timeline visit summary, prescriptions, items relevant to ailments / medical history, this doctor's credentials and "About me".
    - Private — not shared: full session history details, audio recordings, transcriptions, invoices/billing, medical certificates, draft notes.
  - Header copy: "Shared with Patient's Care Team"
- Wire it into the doctor's invite flow in `src/components/patient/InviteDoctorDialog.tsx`'s sibling for doctor side — i.e. `src/components/patients/InvitePatientDialog.tsx` (re-export at `src/features/patients/components/InvitePatientDialog.tsx`). Show the modal as a confirmation step before the invite is actually sent (button label: "Send Invitation"). Doctor must click "I Understand" to proceed.

## Technical notes

- Migration adds `notify_min_severity` to `holarchelp_emergency_contacts` and `coverage` to `holarchelp_incidents`; backfill defaults; no destructive change.
- Upsert fix is the only behavioural change to the accept flow — notifications/patient-record creation logic preserved.
- All RLS policies remain unchanged (columns added are in already-secured tables).

## Files

- **Edit:** `src/components/doctor/DoctorAccessRequests.tsx`, `src/modules/holarchelp/pages/HolarcHelpContacts.tsx`, `src/modules/holarchelp/pages/HolarcHelpHome.tsx`, `src/modules/holarchelp/components/ProviderMap.tsx`, `src/components/permissions/PermissionTransparencyModal.tsx`, `src/features/patients/components/InvitePatientDialog.tsx`, `supabase/functions/share-incident-with-contacts/index.ts`
- **Migration:** add `notify_min_severity`, `coverage` columns
- **No new components**; reuse `PermissionTransparencyModal`.