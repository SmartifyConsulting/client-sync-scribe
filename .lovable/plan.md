

# Plan: Add Hospital Admission Everywhere Medical Certificate & Prescription Appear

## Overview
Add "Hospital Admission" as a 6th default template, include it in all document action menus (session history, documents tab), and add it to the SessionHistoryTable dropdown.

## Changes

### 1. Add Default Template (`src/hooks/useTemplates.ts`)
Add a 6th entry to the `defaultTemplates` array after Invoice, using the existing `FALLBACK_TEMPLATE` content from `HospitalAdmissionEditor.tsx` but reformatted with standard placeholder style (`[PatientName]`, `[DoctorName]`, etc.):
- Name: "Hospital Admission Form"
- Category: "Admission"
- `is_default: true`
- Content mirrors the structured admission form (practice details, diagnosis ICD-10 codes, procedure details, special instructions)

### 2. Add to Session History Dropdown (`src/components/patients/SessionHistoryTable.tsx`)
- Import `Hospital` icon and `HospitalAdmissionEditor`
- Add `hospitalAdmissionOpen` state + handler
- Add "Hospital Admission" menu item after Medical Certificate in the dropdown
- Render `HospitalAdmissionEditor` modal alongside existing Prescription/Invoice editors

### 3. Add to Documents Tab Template Selection
- Ensure the Documents page (`src/pages/Documents.tsx` or equivalent) picks up the new template when users click "Add New Document" — this happens automatically since the template list is fetched from the database/defaults via `useTemplates`

### 4. Patient Documents Classification (`src/pages/patient/PatientDocuments.tsx`)
- Already has `hospital_admission` category mapping — no changes needed

## Files Modified

| File | Change |
|------|--------|
| `src/hooks/useTemplates.ts` | Add Hospital Admission Form to `defaultTemplates` array |
| `src/components/patients/SessionHistoryTable.tsx` | Add Hospital Admission to dropdown + editor modal |

