

# UI Fixes: Button Padding, Doctor Name Persistence, Table Compaction, Edit Mode Icons

## Changes

### 1. Add padding between Cancel and Send Request buttons
**File:** `src/components/patient/InviteDoctorDialog.tsx`
- Line 329 DialogFooter: add `gap-3` class and stack buttons vertically on mobile with `flex-col-reverse sm:flex-row`

### 2. Fix doctor name not persisting after selection
**File:** `src/components/patient/InviteDoctorDialog.tsx`
- The `useEffect` on `nameSearch` (line 82) re-triggers a search when `handleSelectDoctor` sets the name, which can clear the selection
- Add a `selectedDoctorId` state. When a doctor is selected, set it. In the search `useEffect`, skip searching if `selectedDoctorId` is set. Clear `selectedDoctorId` when the user manually types (onChange)

### 3. Compact search results table on mobile
**File:** `src/pages/patient/MyDoctors.tsx`
- Make search results table fit without horizontal scroll:
  - Reduce Avatar size on mobile from `h-9 w-9` to `h-7 w-7`
  - Use `text-xs` for doctor name on mobile
  - Make the Action column narrower with `w-[40px]`
  - Add `table-fixed` and appropriate column widths so invite icon is always visible
  - Consider hiding the Specialty column on very small screens or making the badge more compact

### 4. Add Cancel and Save icons in edit mode headers
**File:** `src/components/patients/PatientDetailsEditor.tsx`
- In the edit mode section (line 1978), replace the plain heading with a flex row containing:
  - The heading text
  - A Save (Check) icon button that triggers `performSave()` manually then `setIsEditing(false)`
  - A Cancel (X) icon button that calls the existing `resetForm()` function (which resets form data and sets `isEditing` to false)
- Apply to both Personal Information (line 1978) and Medical Information edit mode headings

## Files Modified

| File | Changes |
|------|---------|
| `src/components/patient/InviteDoctorDialog.tsx` | Button padding, fix name persistence with selectedDoctorId guard |
| `src/pages/patient/MyDoctors.tsx` | Compact table layout so invite icon fits without scrolling |
| `src/components/patients/PatientDetailsEditor.tsx` | Add Save (Check) and Cancel (X) icons to edit mode headers |

