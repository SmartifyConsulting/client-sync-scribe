

# Plan: Rename "Prescription History" to "Documentation"

## Overview

Rename the existing "Prescription History" page and all references to "Documentation" throughout the codebase. The page content and functionality remain unchanged — this is purely a labeling/naming update.

## Changes

### 1. Rename page component file
- Rename `src/pages/patient/PrescriptionHistory.tsx` → keep file but update exported function name and all visible text:
  - Page title: "Prescription History" → "Documentation"
  - Subtitle: "View and manage your prescriptions" → "View and manage your documents"
  - Card titles/descriptions updated accordingly

### 2. Update `src/App.tsx`
- Update import name and keep route at `/patient/prescriptions` (or change to `/patient/documentation` — route rename included)

### 3. Update references across files
- **`src/components/patient/InviteDoctorDialog.tsx`** — label "Prescription History" → "Documentation"
- **`src/pages/patient/PatientDashboard.tsx`** — card title/description referencing prescriptions
- **`src/pages/patient/PatientAccessManagement.tsx`** — access permission label
- **`src/components/doctor/DoctorAccessRequests.tsx`** — permission label map
- **`src/pages/Landing.tsx`** — feature list text

## Files to Modify

| File | Change |
|------|--------|
| `src/pages/patient/PrescriptionHistory.tsx` | Rename headings and descriptions |
| `src/App.tsx` | Update import/route |
| `src/components/patient/InviteDoctorDialog.tsx` | Update label |
| `src/pages/patient/PatientDashboard.tsx` | Update card text |
| `src/pages/patient/PatientAccessManagement.tsx` | Update permission label |
| `src/components/doctor/DoctorAccessRequests.tsx` | Update label map |
| `src/pages/Landing.tsx` | Update feature text |

No database changes needed.

