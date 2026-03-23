

# Standardize Field Styling + Rename "My Doctors" + Add Patient Profile Banner

## 1. Add Profile Picture Banner for Patients

**File:** `src/components/patients/PatientDetailsEditor.tsx`

The doctor's My Practice page has a profile picture card (avatar with camera overlay for upload, name, email) above the tabs. The patient's My Holarchive page has no equivalent. Add a matching banner card above the tabs in PatientDetailsEditor when `isSelfService` is true.

- Fetch the patient's `profiles` record (using `patient_user_id`) to get `avatar_url`
- Render the same pattern as MyPractice lines 524-549: Avatar with camera hover overlay, name, email
- On click, upload to `avatars` bucket and update `profiles.avatar_url`
- Wrap in the standard `sectionFrame` with `border-primary`

**File:** `src/pages/patient/MyDetails.tsx`

- Pass `userEmail` (from auth) to PatientDetailsEditor so the banner can display it

## 2. Rename "My Doctors" to "My Healthcare Providers"

**File:** `src/components/patients/PatientDetailsEditor.tsx`

- Line 363: `"My Doctors"` → `"My Healthcare Providers"` (view mode tab)
- Line 613: `"My Doctors"` → `"My Healthcare Providers"` (edit mode tab)

## 3. Standardize ViewField to Match MyPractice Field Style

**File:** `src/components/patients/PatientDetailsEditor.tsx`

Current ViewField (line 307-312) renders plain text. Update to use `Label` + disabled `Input`:

```tsx
const ViewField = ({ label, value }) => (
  <div className="space-y-1.5">
    <Label>{label}</Label>
    <Input value={value || "Not provided"} disabled className="bg-muted/50" />
  </div>
);
```

## 4. Standardize Edit Mode Field Wrappers

**File:** `src/components/patients/PatientDetailsEditor.tsx`

- Change all `space-y-1` field wrappers to `space-y-1.5` (~30 instances across edit mode)
- Remove `className="text-xs"` from `<Label>` elements in edit mode (let default `text-[11px]` apply)

## Files Modified

| File | Change |
|------|--------|
| `src/components/patients/PatientDetailsEditor.tsx` | Add profile banner, rename tabs, update ViewField, standardize spacing |
| `src/pages/patient/MyDetails.tsx` | Minor: pass user email prop |

