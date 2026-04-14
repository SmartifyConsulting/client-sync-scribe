

# Fix: Infinite Recursion in Profiles RLS Policy

## Root Cause
The RLS policy "Doctors can view requesting patient profiles" added in the last migration joins `profiles` back to itself (`JOIN profiles dp ON ...`) to look up the doctor's practice/registration number. PostgreSQL evaluates RLS policies on every access to the table, so this self-join triggers the same policies again, causing infinite recursion (`42P17`).

This breaks everything that reads from `profiles` — your profile pic, doctor search, and all profile-related features.

## Fix

### 1. Drop the recursive policy and replace with a SECURITY DEFINER function
**Migration**: Create a helper function that bypasses RLS (using `SECURITY DEFINER`) to check whether the current user is a doctor who has a pending/approved access request from the target patient. Then recreate the policy using this function instead of a self-join.

```sql
-- Drop the recursive policy
DROP POLICY IF EXISTS "Doctors can view requesting patient profiles" ON public.profiles;

-- Create a SECURITY DEFINER function to check doctor-patient request link
CREATE OR REPLACE FUNCTION public.doctor_has_access_request_from(patient_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM doctor_access_requests dar
    JOIN profiles dp ON dp.practice_number = dar.doctor_practice_number
      AND dp.doctor_number = dar.doctor_registration_number
    WHERE dar.patient_user_id = patient_id
      AND dp.id = auth.uid()
  )
$$;

-- Recreate policy using the function (no self-join in the policy itself)
CREATE POLICY "Doctors can view requesting patient profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.doctor_has_access_request_from(id));
```

The `SECURITY DEFINER` function runs with the owner's privileges, bypassing RLS on the inner query, which breaks the recursion cycle.

## Files Modified

| Change | Type |
|--------|------|
| Drop recursive policy, add helper function, recreate policy | DB migration |

