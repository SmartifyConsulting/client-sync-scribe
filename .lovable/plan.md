

# Fix: Shannon's Holarchive Not Loading (Duplicate Patient Records)

## Root Cause
The `MyDetails.tsx` query uses `.maybeSingle()` which errors when multiple patient rows match `patient_user_id`. Shannon has two records: one auto-created at signup and one created by Dr. Allie. Both share the same `patient_user_id`.

## Fix

### 1. Make MyDetails query resilient to duplicates
**File:** `src/pages/patient/MyDetails.tsx` (line 25-29)
- Change `.maybeSingle()` to `.order('created_at', { ascending: false }).limit(1).maybeSingle()` so it picks the most recent record (the doctor-created one) without erroring.

### 2. Apply same fix in PatientDashboard and other patient-facing pages
Check all patient-facing pages that query by `patient_user_id` with `.maybeSingle()` and apply the same resilience pattern:
- `src/pages/patient/PatientDashboard.tsx`
- Any other pages using the same query pattern

### 3. (Optional) Deduplicate at signup
In the auto-creation logic, check if a patient record with the same `patient_user_id` already exists before creating a new one. This prevents future duplicates.

## Technical Details
The `.maybeSingle()` PostgREST method returns an error (406) when multiple rows match, rather than silently picking one. Adding `.limit(1)` before it ensures only one row is ever returned.

