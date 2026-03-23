

# Multi-Item UI Polish & Feature Fixes

## Summary
10 discrete changes across patient profiles, dashboard, sessions, to-do list, and access management.

---

## Changes

### 1. Remove "Physical Measurements" heading from Medical Information frame
**File:** `src/components/patients/PatientDetailsEditor.tsx`
- **View mode (line ~532):** Remove the `<Label>` heading "Physical Measurements" with its Activity icon. Keep the height/weight/BMI fields directly under the "Medical Information" section heading.
- **Edit mode (line ~781):** Same removal of the "Physical Measurements" label heading.

### 2. Make Surgeries, Family History, Organ Donor field labels instead of headings
**File:** `src/components/patients/PatientDetailsEditor.tsx`
- Lines ~557, ~575, ~411: Change the `<Label>` / `<h3>` styled as `text-xs font-semibold uppercase tracking-wide` headings to simple `<Label className="text-[11px]">` field labels (matching the ViewField pattern). Remove the icons from these labels.
- Same treatment in `OrganDonorView` component (~411): change `<h3>` to a simple `<Label>`.

### 3. Today's Schedule — use body font size
**File:** `src/components/dashboard/TodaysBriefing.tsx`
- Lines ~519-536: The patient name and time display use `font-medium text-sm` and `text-xs`. These are already small. Check the collapsible trigger content — the patient name link uses `text-sm` which is appropriate body text. If there's a larger heading font being used for appointment items, reduce to `text-sm`. Based on the code, the current sizes look correct already but I'll verify and ensure no `text-lg` or `font-semibold` is applied to individual schedule items.

### 4. Show Share App icon on Dashboard under profile area
**File:** `src/pages/Dashboard.tsx`
- Import `ShareAppDialog` from `@/components/ShareAppDialog`.
- Add `<ShareAppDialog />` in the header area, positioned after the greeting text or in the top-right area where the profile info sits.

### 5. Hide Connect and Invite Patient buttons from doctor's patient profiles
**File:** `src/pages/PatientProfile.tsx`
- Lines ~240-254: Wrap `RequestConnectionButton` and `InvitePatientDialog` in a condition that hides them. These are doctor-facing features on the patient profile header. Hide both buttons entirely since they should not be visible to doctors viewing their patients.

### 6. Multi-language selection for doctors
**File:** `src/pages/MyPractice.tsx`
- Lines ~608-613: Currently a single `<Select>` for language. Change to a multi-select approach (checkboxes in a popover or a multi-select component) that allows doctors to select multiple languages, with a default auto-selected based on country code.
- Store as a JSON array in `preferred_language` or a new `preferred_languages` field. Since the existing field is a single string, we should add a new `preferred_languages` column (text array) via migration, while keeping `preferred_language` as the primary/default language.
- **Migration:** Add `preferred_languages text[] DEFAULT '{}'` column to profiles table.

### 7. Show Language field on patient's Personal Information tab
**File:** `src/components/patients/PatientDetailsEditor.tsx`
- In the Personal Information view mode (line ~472 area), add a `ViewField` for "Language" that displays the patient's language. If a patient has a linked user with `preferred_language`, show that; otherwise show the doctor's default language.
- Add a language selector in edit mode.
- Add `preferred_language` to the patients table via migration if not already present, OR read from the patient's linked profile.

### 8. Right-align buttons under My Patients tab
**File:** `src/pages/Patients.tsx`
- Line ~381: The `<div className="flex gap-2">` containing Share App, Import, Add Patient buttons — add `ml-auto` or `justify-end` to right-align them.

### 9. Compact the To-Do List screen
**File:** `src/pages/TodoList.tsx`
- Line 316: Reduce header from `text-3xl` to `text-2xl`.
- Line 415: Reduce padding from `p-4` to `p-3`, and gap from `gap-4` to `gap-3`.
- Line 416: Reduce checkbox from `h-5 w-5` to `h-4 w-4`.
- Line 427: Reduce todo title from default `font-medium` to `text-sm font-medium`.
- Generally tighten spacing throughout the task list items.

### 10. Teal borders on My Holarchive and My Practice profile pics
**Files:**
- `src/components/patients/PatientDetailsEditor.tsx` line ~372: Add `border-2 border-primary` to the Avatar.
- `src/pages/MyPractice.tsx` line ~529: Change `border-2 border-[hsl(351,81%,49%)]` to `border-2 border-primary`.

### 11. Reveal Drawing functionality in Sessions
**File:** `src/pages/Sessions.tsx`
- Import `DrawingPad` from `@/components/drawings/DrawingPad`.
- Add a Drawing Pad button in the active session workspace (alongside the notepad area, line ~861).
- Add state for `showDrawingPad` and render the DrawingPad in a Dialog when toggled.

### 12. Access request permissions — default select Session Summaries
**File:** `src/components/doctor/DoctorAccessRequests.tsx`
- Line ~59-64: The default `selectedPermissions` already includes `"session_summaries"`. The user says "rather list Session Summaries" — ensure it's prominently listed first in the permissions dialog. Reorder `permissionLabels` so `session_summaries` appears first.

---

## Technical Details

### Database Migration
Add `preferred_languages` column to profiles:
```sql
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS preferred_languages text[] DEFAULT '{}';
```

### Files Modified

| File | Change |
|------|--------|
| `src/components/patients/PatientDetailsEditor.tsx` | Remove Physical Measurements heading, make Surgeries/Family History/Organ Donor field labels, add Language field, teal avatar border |
| `src/components/dashboard/TodaysBriefing.tsx` | Ensure body-size font on schedule items |
| `src/pages/Dashboard.tsx` | Add ShareAppDialog |
| `src/pages/PatientProfile.tsx` | Hide Connect & Invite Patient buttons |
| `src/pages/MyPractice.tsx` | Multi-language selector, teal avatar border |
| `src/pages/Patients.tsx` | Right-align action buttons |
| `src/pages/TodoList.tsx` | Compact layout (smaller fonts, tighter spacing) |
| `src/pages/Sessions.tsx` | Re-add DrawingPad functionality |
| `src/components/doctor/DoctorAccessRequests.tsx` | Reorder permissions, session_summaries first |
| Migration | Add `preferred_languages` column |

