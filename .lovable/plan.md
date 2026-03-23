

# Permission Transparency Modal

## Overview
Create a reusable `PermissionTransparencyModal` component that shows what data is shared vs. private when connecting doctors to patients. Display it in three contexts: patient inviting a doctor, doctor sharing a patient record, and as a privacy badge in session mode.

## Changes

### 1. Create `src/components/permissions/PermissionTransparencyModal.tsx`
A reusable component showing two sections:
- **Shared Items** (green checkmarks): AI Session Summaries, Patient Information, Patient Medical Overview, Documents (Prescriptions, Hospital Admissions, Patient Images, Patient Videos, Test Results, Scans)
- **Private Items** (red X, greyed out): Full Transcriptions, Raw Audio Recordings, AI Diagnostics, Clinical Drawings/Sketches, Invoices & Billing Data, Doctor Referrals, Medical Certificates

For patient-facing use, includes a "Holistic Health" nudge message encouraging sharing. If a patient unchecks core items (summaries, patient info, medical overview), show an alert warning about limiting holistic care.

Can render as a full dialog or inline panel (for embedding in other dialogs).

### 2. Update `src/components/patient/InviteDoctorDialog.tsx`
- Replace the current simple checkbox permissions list (lines 321-336) with the `PermissionTransparencyModal` rendered inline
- Show the shared/private breakdown before submission
- Add the holistic health alert if patient deselects core shared items
- Keep the search and credential fields as-is

### 3. Update `src/components/patients/DoctorsOnProfile.tsx`
- When a doctor views attending doctors and wants to share/refer, add a "Share with Colleague" action that opens the `PermissionTransparencyModal` as a dialog, showing what will be shared before confirming

### 4. Add Privacy Badge to Session Mode
**File:** `src/pages/SessionDetail.tsx`
- Add a small `Shield` icon badge/tooltip in the session header area
- On hover/click, shows a compact version of the permission transparency breakdown
- Reminds the doctor what is being synced with the care team

### 5. Create `src/components/permissions/PrivacyBadge.tsx`
A compact tooltip-triggered component showing the shared vs. private list. Uses `HoverCard` or `Tooltip` for desktop, tappable on mobile.

## Component Structure

```text
PermissionTransparencyModal
├── Shared Items Section (green ✅)
│   ├── AI Session Summaries
│   ├── Patient Information
│   ├── Patient Medical Overview
│   └── Documents (Prescriptions, Admissions, Images, Videos, Tests, Scans)
├── Private Items Section (greyed + red ❌)
│   ├── Full Transcriptions
│   ├── Raw Audio Recordings
│   ├── AI Diagnostics
│   ├── Clinical Drawings/Sketches
│   ├── Invoices & Billing Data
│   ├── Doctor Referrals
│   └── Medical Certificates
└── [Patient only] Holistic Health Alert (if core items deselected)
```

## Files Modified

| File | Change |
|------|--------|
| `src/components/permissions/PermissionTransparencyModal.tsx` | New — shared/private breakdown with holistic nudge |
| `src/components/permissions/PrivacyBadge.tsx` | New — compact tooltip for session mode |
| `src/components/patient/InviteDoctorDialog.tsx` | Replace permission checkboxes with transparency modal |
| `src/components/patients/DoctorsOnProfile.tsx` | Add share action with transparency modal |
| `src/pages/SessionDetail.tsx` | Add privacy badge in session header |

