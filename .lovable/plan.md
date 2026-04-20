# Plan: Patient Holarchive Renaming, Nav Reorganization & Hospital Admissions Tracking

## 1. Rename labels across patient navigation & holarchive

### A. Bottom Nav (mobile) — `src/components/layout/BottomNav.tsx`

Update `patientSections`:

- `My Profile` → `Holarchive` (icon: HeartPulse)
- `My Healthcare` → `Holarchy` (icon: Handshake)
- Move `My Desk` icon (FolderOpen) into the slot where `My Rewards` was
- Where `My Desk` was, add new `Admissions` item (icon: Hospital, section: `admissions`)
- **Remove** `My Rewards` from bottom nav (moved to avatar popover)

Final order: `Home | Holarchive | Holarchy | Admissions | My Desk`

### B. Sidebar (desktop) — `src/components/layout/Sidebar.tsx`

Same renames in `patientNavItems`. Remove `My Rewards`. Keep `My Holarchive` link or rename per the new vocabulary.

### C. Holarchive tabs — `src/components/patients/PatientDetailsEditor.tsx`

- `My H/Care Team` (line 1246) → `Holarchy`
- `My Sessions` (lines 1251, 1292, 1850) → `Sessions`
- `My Round Table` (lines 1271, 1304, 1914) → `Round Table`
- Add new tab **Hospital Visits** (`value="hospital_visits"`) immediately after Sessions in both mobile-flat and desktop-flat tab lists.
- Update `SECTION_TABS` mapping (line 311):
  - `care: ["doctors", "sessions", "hospital_visits", "roundtable"]`
  - Add new: `admissions: ["admissions"]` (used by the new bottom-nav `Admissions` slot)

## 2. Move "My Rewards" to avatar popover — `src/components/layout/TopBarIcons.tsx`

Insert a `My Rewards` link **above** the Settings link in the avatar popover (both doctor and patient flows). Use the `Gift` icon, navigates to `/patient/rewards` for patients and `/doctor/rewards` for doctors.

## 3. New "Hospital Visits" tab content (read-only timeline)

Inside `PatientDetailsEditor.tsx`, add a new `<TabsContent value="hospital_visits">` block. Each admission renders a card showing:

- Hospital name, admission date, admitting doctor
- Diagnosis (ICD-10) summary
- **Attached PDF**: link to the auto-saved Hospital Admission document
- Expandable sub-sections (accordion): **Vitals**, **Active Medications**, **Lab Results**, **Imaging**

Data source: query `documents` table where `patient_id = patient.id` AND `name ILIKE 'Hospital Admission Form%'`, ordered by `created_at DESC`. Each document = one admission entry. The PDF/scan attachment comes from the existing `media_url` field on `documents`.

## 4. New "Admissions" bottom-nav section (clinical detail capture)

This is the new `admissions` section accessible from the bottom nav. It renders the **same Hospital Visits view** as the holarchive tab but with **edit affordances** when the viewer is a doctor or nurse (has `doctor_patient_access`):

- **+ Add Vitals** button → modal capturing Heart Rate, Blood Pressure, SpO₂, Temperature, BMI (height/weight auto-pulled from patient record)
- **+ Add Medication** button → medication name, dosage, frequency
- **+ Add Lab Result** button → test name, result value, units, reference range, attach PDF
- **+ Add Imaging** button → modality (X-ray/MRI/CT), body region, link to PACS or upload PDF summary

## 5. Database — new tables for admission clinical data

Three new tables linked to a parent `hospital_admissions` row:

```text
hospital_admissions
  id uuid pk
  patient_id uuid (FK patients.id)
  doctor_id uuid (creating doctor)
  document_id uuid (FK documents.id — the auto-generated PDF form)
  hospital text
  admission_date date
  discharge_date date nullable
  diagnosis text
  procedure_description text
  status text default 'admitted'
  created_at, updated_at

admission_vitals
  id, admission_id (FK), recorded_by uuid, recorded_at,
  heart_rate int, bp_systolic int, bp_diastolic int,
  spo2 numeric, temperature_c numeric, bmi numeric,
  height_cm numeric, weight_kg numeric, notes text

admission_medications
  id, admission_id, name, dosage, frequency, started_at, stopped_at, notes

admission_lab_results
  id, admission_id, test_name, result_value, units,
  reference_range, result_date, attachment_url, notes

admission_imaging
  id, admission_id, modality, body_region, performed_at,
  pacs_link, attachment_url, summary
```

**RLS** (mirrors existing pattern):

- Patients: SELECT where admission's patient belongs to them (`patient_user_id = auth.uid()`)
- Doctors: ALL where they have `doctor_patient_access` to the patient OR are the `doctor_id` on the admission
- Same nested patient-access checks for the four child tables via the parent admission

## 6. Auto-create admission record from HospitalAdmissionEditor

**File:** `src/components/sessions/HospitalAdmissionEditor.tsx` (line 415, `handleSave`)

After the `documents.insert(...)` succeeds, also insert into `hospital_admissions`:

```ts
const { data: docRow } = await supabase.from("documents").insert({...}).select().single();

await supabase.from("hospital_admissions").insert({
  patient_id: patientId,
  doctor_id: user.id,
  document_id: docRow.id,
  hospital,
  admission_date: admissionDate,
  diagnosis: extractedDiagnosis,
  procedure_description: procedureDescription,
});
```

This guarantees: **every admission form created by a doctor → one new entry on the patient's Hospital Visits / Admissions screen, with the PDF auto-attached.**

## 7. PDF auto-attachment

The existing `documents` row already stores the rendered admission form content. The Hospital Visits card displays a **View PDF** button that opens the document via the existing document preview/export flow. If a scanned/uploaded PDF supersedes the generated one, doctors can attach it via the existing `media_url` field on the document — no new logic needed.

---

## Files Modified / Created


| File                                                      | Changes                                                                                   |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `src/components/layout/BottomNav.tsx`                     | Rename + reorder + add Admissions section                                                 |
| `src/components/layout/Sidebar.tsx`                       | Same renames; remove My Rewards                                                           |
| `src/components/layout/TopBarIcons.tsx`                   | Add My Rewards above Settings in avatar popover                                           |
| `src/components/patients/PatientDetailsEditor.tsx`        | Tab renames, new Hospital Visits tab, new Admissions section content, SECTION_TABS update |
| `src/components/sessions/HospitalAdmissionEditor.tsx`     | Insert into `hospital_admissions` after document save                                     |
| `src/components/admissions/AdmissionsView.tsx` (new)      | Timeline of admissions + accordion children + add-buttons                                 |
| `src/components/admissions/AddVitalsDialog.tsx` (new)     | Vitals capture modal                                                                      |
| `src/components/admissions/AddMedicationDialog.tsx` (new) | Medication capture modal                                                                  |
| `src/components/admissions/AddLabResultDialog.tsx` (new)  | Lab result capture modal                                                                  |
| `src/components/admissions/AddImagingDialog.tsx` (new)    | Imaging capture modal                                                                     |
| `src/hooks/useHospitalAdmissions.ts` (new)                | React Query hooks for admissions + children                                               |
| Database migration                                        | 4 new tables + RLS policies                                                               |
