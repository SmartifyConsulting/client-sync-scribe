

# Plan: Employer Reporting Email, Patient Auto-Email Settings, Dashboard Enhancements

## 1. Add "Reporting To" Email to Patient Details

**Database**: Add `reporting_to_email` column to `patients` table.

**Files**:
- `src/hooks/usePatients.ts` — Add `reporting_to_email` to the `Patient` interface and `formData`.
- `src/components/patients/PatientDetailsEditor.tsx` — Add "Reporting To Email" field in the Employer section (both view and edit modes), alongside Employer and Occupation.

## 2. Patient Auto-Email Preferences (Profile Settings)

**Database**: Add 3 boolean columns to `profiles` table:
- `auto_email_invoice_to_insurance` (default false)
- `auto_email_prescription_to_pharmacy` (default false)
- `auto_email_certificate_to_employer` (default false)

**Files**:
- `src/hooks/useProfile.ts` — Add the 3 new fields to the `Profile` interface.
- `src/pages/Profile.tsx` — For patient role, add an "Auto-Email Preferences" settings section with 3 toggle switches:
  - "Allow doctor to auto-email invoice to medical aid when marked as paid"
  - "Allow doctor to auto-email prescription to main pharmacy"
  - "Allow doctor to auto-email medical certificate to employer"

## 3. Action Auto-Emails Based on Patient Settings

When a doctor performs an action, the system checks if the patient (via `patient_user_id` → `profiles`) has the relevant setting enabled, and if the required email address exists on the patient record.

**Invoice → Insurance** (`src/pages/doctor/Invoices.tsx`, `markAsPaid`):
- Currently already auto-forwards to `claims_email`. Modify to first check patient's `auto_email_invoice_to_insurance` profile setting. Only send if the setting is `true` AND `claims_email` exists.

**Prescription → Pharmacy** (`src/components/sessions/PrescriptionEditor.tsx`):
- After saving a prescription, check patient's `auto_email_prescription_to_pharmacy` setting. If `true` and a primary pharmacy email exists in `pharmacies` array, auto-send the prescription via `send-document-email`.

**Medical Certificate → Employer** (`src/components/sessions/MedicalCertificateEditor.tsx`):
- After saving a medical certificate, check patient's `auto_email_certificate_to_employer` setting. If `true` and `reporting_to_email` exists on the patient record, auto-send the certificate via `send-document-email`.

## 4. Patient Dashboard: Chronic Badge & Rewards Count

**File**: `src/pages/patient/PatientDashboard.tsx`

- Fetch the patient record linked to the current user (`patient_user_id = auth.uid()`) to get `is_chronic` status.
- Show a "Chronic Medication" badge (terracotta-styled, with Pill icon) prominently near the welcome header if `is_chronic` is true.
- Add a rewards stat card showing `lollipopCount` (Moolas count) that links to `/patient/rewards` for drill-down. The data is already fetched via `useMyRewards`.

## Database Migration

```sql
-- Add reporting_to_email to patients
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS reporting_to_email text;

-- Add auto-email preference columns to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS auto_email_invoice_to_insurance boolean DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS auto_email_prescription_to_pharmacy boolean DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS auto_email_certificate_to_employer boolean DEFAULT false;
```

## Files to Create/Modify

| File | Action |
|------|--------|
| SQL Migration | Add columns to `patients` and `profiles` |
| `src/hooks/usePatients.ts` | Add `reporting_to_email` to Patient interface |
| `src/hooks/useProfile.ts` | Add 3 auto-email booleans to Profile interface |
| `src/components/patients/PatientDetailsEditor.tsx` | Add Reporting To Email field in Employer section |
| `src/pages/Profile.tsx` | Add auto-email preferences section for patients |
| `src/pages/doctor/Invoices.tsx` | Gate auto-forward on patient's preference setting |
| `src/components/sessions/PrescriptionEditor.tsx` | Add auto-email to pharmacy logic |
| `src/components/sessions/MedicalCertificateEditor.tsx` | Add auto-email to employer logic |
| `src/pages/patient/PatientDashboard.tsx` | Add chronic badge and rewards count card |

