## Doctor → Hospital affiliations

### 1. Data model
New table `doctor_hospital_affiliations`:
- `doctor_id` (uuid → profiles.id)
- `hospital_id` (uuid → holarchelp_hospitals.id, nullable — null when hospital not yet on platform)
- `hospital_name_snapshot` (text — typed name when no match)
- `role_at_hospital` (text — e.g. Visiting, Resident, Consultant)
- `status` ('active' | 'inactive')
- standard timestamps

RLS:
- Doctor can CRUD their own affiliations.
- Hospital staff (`is_hospital_staff`) can SELECT affiliations where `hospital_id` matches their hospital.
- Admins full access.

When a doctor types a hospital name with no match, we also insert a stub row into `holarchelp_hospitals` with `status='inactive'`, `created_by=doctor`, so it surfaces in the admin Hospitals list for approval/activation.

### 2. Doctor UI — `src/pages/MyPractice.tsx`
New "Hospital Affiliations" section under Practice Management:
- Autocomplete search against approved `holarchelp_hospitals` (name + city).
- If no match → "Add new hospital" inline → creates inactive hospital + affiliation.
- List of current affiliations with role + remove button.

### 3. Hospital UI — new screen `src/modules/holarchelp/pages/provider/hospital/AffiliatedDoctorsScreen.tsx`
Added to `HospitalOpsLayout` sidebar as "Our Doctors":
- Lists all doctors with an active affiliation to this hospital.
- Shows name, specialty, practice number, contact, avatar.
- Filter by specialty / search.
- Link to doctor profile.

### 4. Admin UI — `src/pages/admin/HolarcHelpProviders.tsx`
Hospitals tab already shows status. Add visual badge for `inactive` (user-submitted) hospitals plus an "Activate" action that flips status to `pending` for normal approval flow, and a "Linked Doctors" count column.

### 5. Test credentials
Create two new auth users via migration + insert seed data:

| Role | Email | Password |
|------|-------|----------|
| Hospital Admin | `hospital.test@holarchealth.com` | `Hospital@2026` |
| ER Staff | `er.test@holarchealth.com` | `ER@2026` |

Both are linked to a seeded hospital "Holarc General Hospital" (approved). Hospital Admin = `owner_id`; ER Staff = `holarchelp_hospital_members` row with role `er_staff`. Roles assigned in `user_roles` as `hospital_staff`.

Credentials are also added to the admin Profile-avatar tester switcher (alongside Christina etc.) for one-click login.

### Technical notes
- Migration: new table + RLS + indexes; seed two `auth.users` via `auth.admin` is not available in migrations, so the seed will use the existing `admin-create-user` edge function pattern (or be inserted via Supabase tools) and then linked.
- Hospital sidebar gets one new nav item; no changes to the ambulance interface.
- No design tokens added; reuses existing tab + card patterns.

### Files
- New: `supabase/migrations/<ts>_doctor_hospital_affiliations.sql`
- New: `src/components/doctor/HospitalAffiliations.tsx`
- New: `src/modules/holarchelp/pages/provider/hospital/AffiliatedDoctorsScreen.tsx`
- Edit: `src/pages/MyPractice.tsx`, `src/modules/holarchelp/pages/provider/hospital/HospitalOpsLayout.tsx`, `src/pages/admin/HolarcHelpProviders.tsx`, `src/components/layout/TopBarIcons.tsx` (tester switcher entries)