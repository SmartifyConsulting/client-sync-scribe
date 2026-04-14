

# Fix: Patient Name Not Showing on Doctor's Invitation Cards

## Root Cause

Two issues combine to always show "Unknown Patient":

1. **`patient_name` column is null for all existing rows** — the column was added to `doctor_access_requests` after existing invitations were created, so older rows have no name stored.

2. **RLS blocks the profile fallback lookup** — when the doctor tries to fetch the patient's profile (lines 92-97 in `DoctorAccessRequests.tsx`), RLS only allows users to view their own profile or doctor-role profiles. There is no policy letting a doctor read a patient's profile via a pending access request. So the fallback also returns nothing.

## Fix

### 1. Add RLS policy so doctors can read patient profiles for pending requests
**Migration**: Add a SELECT policy on `profiles` allowing a doctor to read a patient's profile if there is a matching `doctor_access_requests` row linking them.

```sql
CREATE POLICY "Doctors can view requesting patient profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.doctor_access_requests dar
    JOIN public.profiles dp ON dp.practice_number = dar.doctor_practice_number
      AND dp.doctor_number = dar.doctor_registration_number
    WHERE dar.patient_user_id = profiles.id
      AND dp.id = auth.uid()
  )
);
```

### 2. Backfill existing null `patient_name` values
**Migration**: Update existing rows where `patient_name` is null by joining to `profiles`.

```sql
UPDATE public.doctor_access_requests dar
SET patient_name = p.full_name
FROM public.profiles p
WHERE dar.patient_user_id = p.id
  AND dar.patient_name IS NULL;
```

### 3. No code changes needed
The existing code in `DoctorAccessRequests.tsx` already handles both paths correctly — it checks `patient_name` from the row first, then falls back to the profile lookup. Once the RLS policy is in place and existing data is backfilled, both paths will work.

## Files Modified

| Change | Type |
|--------|------|
| RLS policy on `profiles` for requesting patients | DB migration |
| Backfill `patient_name` in `doctor_access_requests` | DB migration |

