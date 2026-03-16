

# Three Fixes: ME Record Name, Sessions Patient Sort, Chronic Medication Badge

## 1. ME Record: Use Doctor's Profile Name (Surname, Full Name)

**Problem**: The ME auto-create uses `user.user_metadata?.full_name` which may not reflect the doctor's actual profile name. The display should use the doctor's profile `full_name` formatted as "Surname, FirstName".

**Fix in `src/pages/Patients.tsx`**:
- Import `useProfile` hook
- In the auto-create `useEffect`, use `profile?.full_name` instead of `user.user_metadata?.full_name` for the name
- Format as "LastName, FirstNames" in the auto-create (so it stores correctly)
- The ME badge `bg-secondary/10 text-secondary` is already using the secondary (terracotta) color — but need to verify it renders as terracotta orange, not a different shade. Will ensure the badge explicitly uses terracotta classes.

## 2. Sessions Page: Sort Patient Dropdown Alphabetically by Surname

**Problem**: In `src/pages/Sessions.tsx` (lines 635-654), `patients.map(...)` renders the patient combobox in whatever order `usePatients` returns (creation order), not sorted alphabetically by surname.

**Fix in `src/pages/Sessions.tsx`**:
- Create a `sortedPatients` memo that sorts `patients` by surname (last word of name) alphabetically
- Display names in "Surname, FirstName" format in the `CommandItem`
- Use `sortedPatients` instead of `patients` in the combobox rendering

## 3. Chronic Medication Badge on Patient Profile & List

**Problem**: No mechanism exists to flag patients on chronic medication or display a "Chronic" badge.

**Changes**:

### Database Migration
- Add `is_chronic` boolean column to `patients` table (default `false`, nullable)

### `src/hooks/usePatients.ts`
- Add `is_chronic` to the `Patient` interface

### `src/components/patients/PatientOverview.tsx`
- After AI summary parses medications, check if any medication has `status: "active"` — if so, auto-detect chronic status
- Alternatively, add a manual toggle for doctors to mark a patient as chronic
- Display a terracotta "Chronic" badge near the patient name/allergies badges

### `src/pages/Patients.tsx`
- In the patient table rows, show a small "Chronic" badge (terracotta) next to the patient name if `patient.is_chronic` is true

### `src/components/patients/PatientDetailsEditor.tsx`
- Add a checkbox/toggle for "Chronic Medication" in the patient details form

### Medication Adherence Moolas
- This is an extension of the existing health photo gamification system. Patients on chronic medication can log daily medication adherence (similar to health photos). This will be noted in the plan but the full adherence logging UI can be a follow-up feature. For now, the badge and flag are the foundation.

## Files to Modify
1. **Database migration**: Add `is_chronic` boolean to `patients` table
2. `src/hooks/usePatients.ts` — Add `is_chronic` to Patient interface
3. `src/pages/Patients.tsx` — Use profile name for ME, add chronic badge to rows
4. `src/pages/Sessions.tsx` — Sort patient dropdown by surname, display as "Surname, First"
5. `src/components/patients/PatientDetailsEditor.tsx` — Add chronic toggle
6. `src/components/patients/PatientOverview.tsx` — Show chronic badge

