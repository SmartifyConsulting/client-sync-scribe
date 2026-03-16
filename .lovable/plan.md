

# Plan: Add Hospital Admission Form Document Type

## Overview

Add "Hospital Admission Form" as a 6th document type available to doctors (as a quick action in sessions + as a template) and visible to patients in their documents view. The form has structured fields for admission details, diagnosis with multiple ICD-10 codes, procedure details with NHRPL codes, and multiple patient special instructions.

## 1. Create `HospitalAdmissionEditor.tsx` Component

New file: `src/components/sessions/HospitalAdmissionEditor.tsx`

A form-based editor (matching the pattern of PrescriptionEditor, InvoiceEditor, etc.) with these sections:

**Admission Details:**
- Admitting Doctor (auto-filled from profile)
- Practice Number (auto-filled from profile)
- Hospital (text input)
- Date of Admission (date picker)

**Diagnosis Details — ICD-10 Codes:**
- Dynamic list (add/remove rows), each row: Code (text) + Description (text)
- "Add ICD-10 Code" button

**Procedure Details:**
- Date of Procedure (date picker)
- Procedure Description (textarea)
- NHRPL Codes (text input)

**Patient Special Instructions:**
- Dynamic list (add/remove rows), each row: Instruction (text) + Description (text)
- "Add Instruction" button

On save, the form content is rendered into a text template and saved to the `documents` table with `template_name = "Hospital Admission Form"`. Also uses `useTemplateWithHeaderFooter` to apply the doctor's header/footer if configured. Includes a Preview button like other editors.

## 2. Add Quick Action to SessionDetail.tsx

Add a "Hospital Admission" button to the Quick Actions grid in `src/pages/SessionDetail.tsx` (alongside Prescription, Invoice, etc.). Add state `showHospitalAdmissionEditor` and render the `HospitalAdmissionEditor` dialog.

## 3. Add to Patient Documents View

In `src/pages/patient/PatientDocuments.tsx`:
- Add `hospital_admission` to the `DocType` union
- Add config entry with a **rose/red** color badge
- Add to `FILTER_OPTIONS`
- Update `deriveDocType` to detect "hospital admission" in template name

## 4. Add Default Template for Doctors

The template system allows doctors to customize their Hospital Admission Form template. No DB migration needed — the editor will have a built-in fallback template (like MedicalCertificateEditor does with `FALLBACK_TEMPLATE`). Doctors can also create a "Hospital Admission Form" content template in the Templates page if they want custom formatting.

## Files to Create/Modify

| File | Action |
|------|--------|
| `src/components/sessions/HospitalAdmissionEditor.tsx` | **New** — Form-based editor with dynamic ICD-10 codes and instructions lists |
| `src/pages/SessionDetail.tsx` | Add quick action button + editor dialog |
| `src/pages/patient/PatientDocuments.tsx` | Add `hospital_admission` doc type, badge color, filter option |

No database migration needed — documents are saved to the existing `documents` table with `template_name = "Hospital Admission Form"`.

