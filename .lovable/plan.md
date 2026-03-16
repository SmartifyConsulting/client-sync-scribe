

# Fix: Link Faith Basson as a Patient Record

## Problem
Faith Basson's access request was accepted before the auto-create patient logic was added. The `doctor_patient_access` record exists (doctor: Dean Allie, `54fa34d8-9705-4407-a825-19c5756ca184`), but no corresponding `patients` record was created.

## Solution
Run a single SQL migration to insert the missing patient record:

```sql
INSERT INTO public.patients (user_id, patient_user_id, name, status)
VALUES (
  '54fa34d8-9705-4407-a825-19c5756ca184',  -- Dean Allie (doctor)
  '930559ae-055d-40ab-b11c-c9d809d9381e',  -- Faith Basson (patient)
  'Faith Basson',
  'active'
);
```

No code changes needed — this is a one-time data fix. The auto-create logic already exists for future requests.

