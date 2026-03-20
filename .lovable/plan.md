

# Plan: Add Holarchive Tabs to Patient Profile Page

## Problem
When a patient views their Profile (`/profile`), they only see 2 tabs (Personal, Preferences). The user expects all 4 Holarchive tabs to be visible here as well.

## Solution
Expand the patient section of `Profile.tsx` from 2 tabs to 6 tabs by integrating the Holarchive content:

| Tab | Content |
|-----|---------|
| Personal | Existing personal info (name, email, phone) |
| Medical Information | Embedded from PatientDetailsEditor's medical tab |
| My Documents | Lazy-loaded PatientDocuments component |
| My Doctors | Lazy-loaded MyDoctors component |
| Preferences | Existing auto-email toggles |

## Implementation

### File: `src/pages/Profile.tsx`

1. Import `PatientDetailsEditor` and the patient-fetching logic from `MyDetails.tsx`
2. For the patient branch (line 473-514), replace the 2-tab layout with a 5-tab layout matching the Holarchive structure
3. Fetch the patient record (from `patients` table where `patient_user_id = user.id`) so it can be passed to `PatientDetailsEditor`
4. Render the full `PatientDetailsEditor` component inside a "My Holarchive" tab, which already contains the 4 Holarchive tabs (Personal Information, Medical Information, My Documents, My Doctors)
5. Keep the existing Personal and Preferences tabs as-is for account-level settings

**Simplified approach**: Rather than duplicating the Holarchive tabs, embed the entire `PatientDetailsEditor` as a single "My Holarchive" tab alongside the existing Personal and Preferences tabs. This gives patients 3 top-level tabs: **Personal** (account info), **My Holarchive** (full 4-tab clinical record), and **Preferences**.

### Files Modified
- `src/pages/Profile.tsx` — add patient record fetch, import PatientDetailsEditor, add Holarchive tab

