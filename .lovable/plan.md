

# Plan: Autofind, Moola Styling, and Patient List Color Updates

## 1. Autofind for Patient/Doctor Name Input

**Where**: `InviteDoctorDialog.tsx` (patient adding doctor) and `InvitePatientDialog.tsx` / Add Patient dialog in `Patients.tsx` (doctor adding patient)

**How**:
- In `InviteDoctorDialog.tsx`: As the user types a doctor's name (new field), query `profiles` table filtering by `full_name` (ilike) where role = 'doctor'. Show dropdown suggestions with name, specialty, practice number. On select, auto-fill practice_number and doctor_number fields.
- In `Patients.tsx` Add Patient dialog: As user types the patient name, query `profiles` table filtering by `full_name` (ilike) where role = 'patient'. Show dropdown suggestions. On select, auto-fill name, email, phone from the profile and set `patient_user_id`.

**RLS note**: Need a new SELECT policy on `profiles` so authenticated users can search other profiles by name. Will add a limited policy for this.

**Database migration**:
```sql
CREATE POLICY "Authenticated users can search profiles by name"
ON public.profiles FOR SELECT
TO authenticated
USING (true);
```

## 2. Moola Gamification Icon & Notification - More Prolific, Terracotta Style

**Doctor Dashboard** (`Dashboard.tsx`):
- Add a Moola rewards summary card/badge in the header area showing total Moolas across all patients (or a link to rewards). Style with terracotta background (`bg-secondary`) and white text.
- Style the notification bell with terracotta fill (already partially done with `fill-secondary text-secondary`, but make the badge count terracotta too).

**Patient Dashboard** (`PatientDashboard.tsx`):
- Restyle the Moola badge from `bg-secondary/10 text-secondary` to a solid terracotta background with white text: `bg-secondary text-white`.
- Make the notification bell icon terracotta-filled.
- Add a larger Moola reward card in the stats grid area.

**LollipopDisplay** (`LollipopDisplay.tsx`):
- Update badge variant colors from emerald to terracotta (`bg-secondary text-white`).
- Update card gradient from emerald to terracotta tones.

## 3. Patient List Color & Alphabet Bar Updates

**Patients.tsx**:
- **Alphabet bar**: Change from `flex-wrap gap-1` to `flex gap-0.5 overflow-x-auto` with smaller button sizes to fit all 26 letters in one line. Reduce `w-8 h-8` to `w-7 h-7 text-[11px]`.
- **Remove pastel pinks**: Replace any pink/rose-tinted backgrounds in the alphabetical group headers and patient avatars.
- **New palette**: Use pastel teal (`bg-teal-50`), pastel yellow (`bg-amber-50`), and pastel orange (`bg-orange-50`) cycling through letter groups. Avatar circles get a rotating teal/yellow/orange background based on letter index.
- Group header rows: cycle between `bg-teal-50/60`, `bg-amber-50/60`, `bg-orange-50/60` (dark mode variants too).

## Files to Modify

| File | Change |
|------|--------|
| SQL Migration | Add profiles SELECT policy for authenticated users |
| `src/components/patient/InviteDoctorDialog.tsx` | Add name search field with autofind dropdown |
| `src/pages/Patients.tsx` | Add autofind to Add Patient dialog; fix alphabet bar to single line; replace pink with teal/yellow/orange palette |
| `src/pages/Dashboard.tsx` | Add prominent terracotta Moola badge; style notification bell terracotta |
| `src/pages/patient/PatientDashboard.tsx` | Restyle Moola badge solid terracotta white; bigger reward display |
| `src/components/gamification/LollipopDisplay.tsx` | Replace emerald with terracotta/secondary colors throughout |

