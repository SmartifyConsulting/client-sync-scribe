# Plan: 6Dot50 link, Legal page spacing, Doctor SOS chooser

## 1. Wire Vula Wallet to `secure.6dot50.com/lite/default`

Single one-line change in `src/pages/VulaWallet.tsx`:
- `PARTNER_URL` → `https://secure.6dot50.com/lite/default`

The interstitial already opens it in a new tab (their own origin owns the login).

## 2. Reformat the Legal Terms page so cards aren't touching

In `src/pages/Legal.tsx`:
- Increase vertical gap between agreement cards (`space-y-3` → `space-y-4`)
- Add inner padding (`p-4` → `p-5`), rounded corners (`rounded-md` → `rounded-lg`)
- Subtle shadow on hover so cards visually separate from the page background

No changes to the legal documents themselves — only the index page that lists them.

## 3. Doctor SOS chooser: "SOS for Patient" vs "SOS for Me"

When a logged-in **doctor** opens `/doctor/holarchelp`, the SOS Home should first present a two-button modal:

```
┌─────────────────────────────────┐
│      Who needs help?            │
│                                 │
│  [ 🚨 SOS for a Patient ]       │  red
│  [ 🚨 SOS for Me ]              │  red
│                                 │
│         [ Cancel ]              │
└─────────────────────────────────┘
```

### "SOS for Me" (default today)
- Existing flow: incident is created with `user_id = auth.uid()` (the doctor)
- Logged in the **doctor's own profile** — already works because RLS `Users insert own incidents` requires `user_id = auth.uid()`

### "SOS for a Patient"
- Open a quick patient search (existing patient list filtered by the doctor's `doctor_patient_access` roster)
- On select → call new edge function `dispatch-sos-for-patient` (service role) that:
  - Verifies the doctor has active access to that patient (`doctor_patient_access.is_active = true`)
  - Inserts `holarchelp_incidents` with `user_id = patient.user_id`, plus a new column `triggered_by_user_id = doctor.id` and `triggered_by_role = 'doctor'`
  - Logs an `holarchelp_incident_events` row `sos_triggered_by_doctor` with the doctor's id
  - Fans out provider offers via the existing dispatch logic
  - Pushes notifications to: the patient, all the patient's connected doctors, and the patient's NOK
- Incident appears in the **patient's** profile/incident list (not the doctor's), with a small "Triggered by Dr X" badge

Why an edge function: the RLS check `WITH CHECK (user_id = auth.uid())` blocks a doctor from inserting on a patient's behalf from the client. Service-role bypass + explicit access verification keeps it secure.

### Schema migration
Add to `holarchelp_incidents`:
- `triggered_by_user_id uuid` (nullable; existing rows = self-triggered)
- `triggered_by_role text` (nullable; 'self' | 'doctor' | 'caregiver')

Index `(user_id, created_at desc)` already exists for patient timeline queries.

### UI
- New file: `src/modules/holarchelp/components/DoctorSosChooser.tsx` (modal with two big red buttons + patient picker step)
- `HolarcHelpHome.tsx`: detect `useUserRole() === 'doctor'`. On first SOS press, show chooser instead of going straight to `SeverityPicker`
- "SOS for Me" → continues to existing severity flow
- "SOS for a Patient" → patient picker → severity → invokes `dispatch-sos-for-patient`

### What we do NOT change
- Existing patient SOS flow (mobile bottom-nav SOS, patient app) is untouched
- Doctor's own incident audit, ETA, voice-note recording — unchanged
- 6Dot50 integration is read-only (still no login bypass)

---

## Files

**Edits**
- `src/pages/VulaWallet.tsx` — URL constant
- `src/pages/Legal.tsx` — spacing/padding
- `src/modules/holarchelp/pages/HolarcHelpHome.tsx` — doctor branch + chooser hook-in
- `src/components/holarchelp/PatientIncidentHistory.tsx` — show "Triggered by Dr X" badge

**New**
- `src/modules/holarchelp/components/DoctorSosChooser.tsx`
- `src/modules/holarchelp/components/PatientPickerForSos.tsx` (small)
- `supabase/functions/dispatch-sos-for-patient/index.ts`
- 1 migration: add `triggered_by_user_id`, `triggered_by_role` to `holarchelp_incidents`

## Out of scope
- Doctor-initiated SOS from outside `/doctor/holarchelp` (e.g. from a patient profile page) — flagged as a possible follow-up
- Removing 6Dot50 branding from their own login page (browser cross-origin policy makes this impossible)
- Caregiver/family SOS triggers (would reuse the same scaffolding)
