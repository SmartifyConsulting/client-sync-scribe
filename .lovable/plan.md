# Hospital affiliations: discovery, ambulance parity, bulk import

## 1. Affiliation search shows ALL hospitals (active + pending)

- `HospitalAffiliations.tsx` (doctor) autocomplete: query `holarchelp_hospitals` **without** the `status='approved'` filter. Show a small `Pending` / `Inactive` badge next to any non-approved result.
- "Add new hospital" still inserts a row with `status='pending'`; once a second doctor (or ambulance) picks the same hospital, it stays as one shared row (already enforced by name+city de-dup lookup before insert).
- **No change to SOS surfaces** — `HospitalsDirectoryScreen`, `HospitalPicker`, `HolarcHelpNearby` keep `.eq('status','approved')`, so pending/inactive hospitals stay invisible to dispatch.

## 2. Ambulance → Hospital affiliations (mirror of doctor flow)

New table `ambulance_hospital_affiliations`:
- `ambulance_provider_id`, `hospital_id` (nullable for pending), `hospital_name_snapshot`, `role` (e.g. "Primary receiving ER"), `status` ('active'|'inactive')
- RLS: ambulance staff CRUD their own rows; hospital staff SELECT rows where `hospital_id` matches their hospital; admins full access.

New UI:
- **Ambulance Ops Layout** → new sidebar item **"Affiliated Hospitals"** → `AffiliatedHospitalsScreen.tsx` reusing the same autocomplete component (parameterised by owner type).
- **Hospital Ops Layout** → new sidebar item **"Our Ambulances"** → `AffiliatedAmbulancesScreen.tsx` listing ambulance providers with active affiliations.
- **Incoming Ambulances screen** (existing): join against this table; render a teal `Partner` badge next to ambulance unit names that are affiliated with this hospital.

## 3. CSV / XLS bulk import of doctors (hospital admin)

On the **Our Doctors** screen, add an **"Import doctors"** button (visible to hospital owner / `er_staff` members).

- Dialog with:
  - Drop-zone + "Download template" link (CSV).
  - Parser uses **`read-excel-file`** for `.xlsx` and a small CSV parser for `.csv` (no `xlsx` package — per project memory).
  - Columns: `practice_number, email, full_name, role_at_hospital, specialty, mobile_number`.
- Edge function `hospital-import-affiliations`:
  - For each row, look up a doctor profile by `practice_number` OR `email` (OR match).
  - Matched → upsert `doctor_hospital_affiliations` row (`status='active'`, links to that hospital).
  - Unmatched → upsert a **pending affiliation** with `doctor_id=NULL`, `hospital_name_snapshot` reused for `full_name`, plus `specialty` / `mobile_number` / `email` / `practice_number` stored in a new `pending_doctor_payload jsonb` column. These rows render in "Our Doctors" with a `Not yet on platform` badge.
  - When a doctor later signs up with the matching practice number or email, a trigger / signup hook links the pending row to their `doctor_id` and flips `status='active'`.
- Returns a per-row report (`matched`, `pending`, `error`) shown in the dialog.

## 4. Migration summary

```text
ambulance_hospital_affiliations          -- new table + RLS
doctor_hospital_affiliations             -- add column pending_doctor_payload jsonb
trigger on auth.users insert / profiles  -- link pending affiliations by practice_number/email
```

## 5. Files

**New**
- `supabase/migrations/<ts>_affiliations_v2.sql`
- `supabase/functions/hospital-import-affiliations/index.ts`
- `src/components/doctor/HospitalAffiliations.tsx` — extend to show pending badge
- `src/modules/holarchelp/components/AmbulanceHospitalAffiliations.tsx`
- `src/modules/holarchelp/pages/provider/ambulance/AffiliatedHospitalsScreen.tsx`
- `src/modules/holarchelp/pages/provider/hospital/AffiliatedAmbulancesScreen.tsx`
- `src/modules/holarchelp/pages/provider/hospital/ImportDoctorsDialog.tsx`
- `public/templates/doctor-affiliations-template.csv`

**Edited**
- `src/modules/holarchelp/pages/provider/hospital/AffiliatedDoctorsScreen.tsx` (Import button, pending badge)
- `src/modules/holarchelp/pages/provider/hospital/HospitalOpsLayout.tsx` (Our Ambulances)
- `src/modules/holarchelp/pages/provider/ambulance/AmbulanceOpsLayout.tsx` (Affiliated Hospitals)
- `src/modules/holarchelp/pages/provider/hospital/IncomingAmbulancesScreen.tsx` (Partner badge)
- `src/modules/holarchelp/routes-provider.tsx` (two new routes)

## Out of scope
- Email invites for unmatched doctors (kept as pending only).
- Admin-side global CSV import (this is hospital-admin scoped per request).
