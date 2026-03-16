

# Fix: RLS Policy for `doctor_patient_access` + Runtime Error

## Two Issues

### 1. RLS Policy Missing (Screenshot Error)
The `doctor_patient_access` table has no INSERT policy allowing doctors (`auth.uid() = doctor_id`). When a doctor accepts a patient's access request in `DoctorAccessRequests.tsx`, the insert fails.

**Fix:** Add an RLS INSERT policy via migration:
```sql
CREATE POLICY "Doctors can insert access grants"
ON public.doctor_patient_access FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = doctor_id);
```

### 2. Runtime Error: `PrescriptionHistory is not defined`
The error at App.tsx line 424 suggests a stale build or hot-reload issue. The current code correctly imports `Documentation from "./pages/patient/PrescriptionHistory"`. This should resolve on next full reload, but as a safety measure, I'll also rename the exported function in `PrescriptionHistory.tsx` from `PrescriptionHistory` to `Documentation` for consistency.

## Files to Modify

| File | Change |
|------|--------|
| SQL Migration | Add INSERT policy for doctors on `doctor_patient_access` |
| `src/pages/patient/PrescriptionHistory.tsx` | Rename exported function to `Documentation` |

