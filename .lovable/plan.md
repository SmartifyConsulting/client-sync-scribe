

# Plan: Add Patient Self-Service Profile with All Captured Fields

## Problem
When a patient logs in and visits `/profile`, they see the doctor-oriented Profile page (practice number, specialty, partners, pricing). Patients have no way to view or edit their own medical details — the fields captured by doctors (addresses, next of kin, employer, medical insurance, pharmacies, allergies, surgeries, physical measurements, etc.) are invisible to patients.

## Solution
Create a patient-specific "My Details" page that reuses the existing `PatientDetailsEditor` component, allowing patients to view and edit all 10 clinical frames of their own patient record.

## Changes

### 1. New Page: `src/pages/patient/MyDetails.tsx`
- Fetch the patient's own record from `patients` table using `patient_user_id = auth.uid()`
- Render `PatientDetailsEditor` with the patient's data
- Include an update function that writes back to the `patients` table
- Show a loading state while fetching

### 2. Add RLS Policy for Patient Self-Update
Patients can currently only SELECT their own patient record. They need UPDATE permission to edit their own details.

```sql
CREATE POLICY "Patients can update their own patient record"
ON public.patients FOR UPDATE TO authenticated
USING (patient_user_id = auth.uid())
WITH CHECK (patient_user_id = auth.uid());
```

### 3. Add Navigation: `src/components/layout/Sidebar.tsx`
Add a "My Details" nav item to `patientNavItems` array (using `User` icon, route `/patient/details`).

### 4. Add Route: `src/App.tsx`
Add route `/patient/details` pointing to the new `MyDetails` page.

### 5. Conditionally Render Profile Page
On `src/pages/Profile.tsx`, the patient already sees the generic profile page. The new "My Details" page is separate and specific to patient medical data. No changes needed to Profile.tsx.

## Files

| File | Change |
|------|--------|
| `src/pages/patient/MyDetails.tsx` | New page — fetches patient record, renders `PatientDetailsEditor` |
| `src/components/layout/Sidebar.tsx` | Add "My Details" to patient nav |
| `src/App.tsx` | Add `/patient/details` route |
| Database migration | Add patient self-update RLS policy |

