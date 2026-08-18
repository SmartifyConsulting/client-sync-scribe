# Show data in the hospital Activity Log

## What's wrong

The Activity Log page is empty because it reads from a table that does not exist (`hospital_admission_activity_log`) — the request returns a 404 "table not found" error. The real activity data already lives in `patient_activity_logs`, and Holarc General Hospital already has 83 recorded entries there (latest today).

## The fix

1. Point the Activity Log at the real table
   - Update `useHospitalActivityLog` in `src/modules/holarchelp/hooks/useAdmissionChartEntries.ts` to query `patient_activity_logs` filtered by `hospital_id`, ordered by `occurred_at` descending.
   - Map the columns to what the screen expects: `staff_name` -> actor, `action_type` -> action, `details` -> detail, `occurred_at` -> timestamp, plus the patient name resolved from `patient_id`.
   - Fix the realtime subscription to listen on `patient_activity_logs`.

2. Show patient names
   - Join/lookup patient names for the logged `patient_id` values so rows read "Nomvula Dlamini recorded vitals for Sipho Nkosi".

3. Top up demo data
   - Add ~20 fresh entries for Holarc General spread across today and the last 3 days, covering the full workflow: admissions, nurse clock-ins, vitals rounds, medication administration, progress notes, ward transfers (ER to ICU to High Care), doctor reviews, lab results and discharges — attributed to the existing demo staff (Nomvula Dlamini, attending doctors) and the existing ward patients.

## Technical notes

- Data-only insert via the insert tool; no schema change needed (`patient_activity_logs` already has RLS and grants).
- Screen file `ActivityLogScreen.tsx` keeps its layout, grouping toolbar and read-only wording; only the hook's row shape changes.
