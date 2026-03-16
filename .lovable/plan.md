

# Plan: Consolidate Patient Documents, Filter by Type, Moolas Icon on Dashboard

## 1. Remove Prescriptions & Invoices from Patient Nav

**Sidebar.tsx**: Remove `Prescriptions` and `Invoices` entries from `patientNavItems`. Final sequence:
Dashboard → My Doctors → My Calendar → My Tasks → My Documents → Round Table → My Rewards

**BottomNav.tsx**: No changes needed (already doesn't have these).

**App.tsx**: Keep routes `/patient/prescriptions` and `/patient/invoices` working (redirect to `/patient/documents` or keep for backward compat), but they're no longer in nav.

## 2. Enhance PatientDocuments with Prescriptions, Invoices, Certificates + Filtering

**PatientDocuments.tsx** — Major enhancement:

- Fetch from 3 tables: `documents`, `prescriptions`, and `invoices` (all linked via `patient_id` where `patient_user_id = auth.uid()`).
- Normalize into a unified list with a `type` field: `prescription`, `invoice`, `medical_certificate`, `referral_letter`, `general_letter`, `audio`, `video`, `file`.
- For documents, derive type from `template_name` (e.g. "Prescription" → prescription, "Invoice" → invoice, "Medical Certificate" → medical_certificate).
- For prescriptions table records, type = `prescription`.
- For invoices table records, type = `invoice`.

**Color-coded badges** per document type:
- Prescription → emerald/green
- Invoice → amber/yellow  
- Medical Certificate → blue
- Referral Letter → purple
- General Letter → slate/gray
- Audio/Video/File → muted

**Filter bar**: Add a horizontal filter row with clickable badge buttons (All, Prescriptions, Invoices, Medical Certificates, Referral Letters, Audio/Video). Active filter highlighted.

## 3. Add Patient Media Action Buttons (No Template Creation)

Add the same icon-only action buttons that doctors have (Mic, Video, Upload) to the PatientDocuments page — but **exclude** the FilePlus (create from template) button since patients cannot create medical documents.

Patient uploads will be saved to the `documents` table with `user_id` set to the patient's auth user ID and `patient_id` set to their patient record ID.

**RLS consideration**: Patients currently can only SELECT documents. Need to add an INSERT policy so patients can upload their own documents:
```sql
CREATE POLICY "Patients can insert documents for their own record"
ON public.documents FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id AND
  patient_id IN (SELECT id FROM patients WHERE patient_user_id = auth.uid())
);
```

## 4. Moolas as Icon on Dashboard (Not a Card)

Replace the full-width `Link to="/patient/rewards"` card and the `LollipopDisplay` card with a small icon/badge in the welcome header area (next to the notification bell). Show as a clickable badge: `Ⓜ {count}` linking to `/patient/rewards`.

Remove both the `LollipopDisplay` block and the "My Moolas" `Card` block from `PatientDashboard.tsx`.

## Files to Modify

| File | Action |
|------|--------|
| `src/components/layout/Sidebar.tsx` | Remove Prescriptions + Invoices from patient nav |
| `src/pages/patient/PatientDocuments.tsx` | Major rewrite: unified docs from 3 tables, color badges, filter, media upload buttons |
| `src/pages/patient/PatientDashboard.tsx` | Replace Moolas card with small icon badge in header |
| SQL Migration | Add INSERT policy for patients on documents table |

