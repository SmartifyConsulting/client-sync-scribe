

# Plan: My Holarchive Restructure

## Changes

### 1. Rename "My Holarc" → "My Holarchive"
- **Sidebar.tsx** (line 54): Change label from `"My Holarc"` to `"My Holarchive"`
- **BottomNav.tsx** (line 29): Change label from `"My Holarc"` to `"My Holarchive"`
- **MyDetails.tsx**: Update page heading from "My Holarc" to "My Holarchive"

### 2. Move General Notes from tab to section under Employer (Personal Info tab)
- **PatientDetailsEditor.tsx**: Remove the "General Notes" tab trigger and `TabsContent` from both VIEW and EDIT modes
- In VIEW mode: Add a "General Notes" section after the Employer section (line ~386) inside the Personal Information tab
- In EDIT mode: Add a Notes textarea after the Employer section (line ~598) inside the Personal tab
- Tab order becomes: Personal Information | Medical Information | My Documents | My Doctors

### 3. Move "My Doctors" from sidebar nav to a tab
- **Sidebar.tsx**: Remove `{ icon: Users, label: "My Doctors", to: "/patient/doctors" }` from `patientNavItems`
- **PatientDetailsEditor.tsx**: Add a new "My Doctors" tab after "My Documents"
- Lazy-import `MyDoctors` component and render it inside a new `TabsContent value="doctors"`
- Pass the patient's user ID if needed for context

### 4. Add bordered section frames (consistent with Doctor Profile)
Each section group within each tab will be wrapped in `rounded-xl border border-border bg-card p-4 shadow-sm` — matching the Doctor Profile screen pattern. This applies to:
- VIEW mode: Personal Details, Addresses, Next of Kin, Employer, General Notes sections
- VIEW mode: Medical Insurance, Pharmacies, Physical Measurements, etc.
- EDIT mode: Same sections wrapped in bordered cards

### 5. Enlarge Moola icon in the circle badge
- **LollipopDisplay.tsx**: Increase `MoolaLogoBadge` sizes:
  - `sm`: circle `h-9 w-9`, img `h-7 w-7`
  - `md`: circle `h-12 w-12`, img `h-9 w-9`
  - `lg`: circle `h-18 w-18`, img `h-14 w-14`

## Files Modified

| File | Change |
|------|--------|
| `src/components/layout/Sidebar.tsx` | Rename to "My Holarchive", remove My Doctors nav item |
| `src/components/layout/BottomNav.tsx` | Rename to "My Holarchive" |
| `src/pages/patient/MyDetails.tsx` | Update heading |
| `src/components/patients/PatientDetailsEditor.tsx` | Move notes to Personal tab section, add My Doctors tab, add bordered frames |
| `src/components/gamification/LollipopDisplay.tsx` | Enlarge Moola icon sizes |

