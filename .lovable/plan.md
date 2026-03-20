

# Multi-Issue Fix Plan

## Issues to Address

1. **Build error**: `read-excel-file` package has incorrect exports, preventing build
2. **Build error**: CSS `@import` statements must precede `@tailwind` directives
3. **Dual currency symbol**: Invoice service selector shows DollarSign icon + currency symbol (e.g., "$ R 1500")
4. **Moola logo**: Make it fit nicely in a white circle badge, consistent app-wide
5. **Rewards cards**: Use fun bright cartoon colours
6. **My Details (patient)**: Replace collapsible frames with tabs (Personal Info, Medical Info, General Notes)
7. **My Doctors**: Replace cards with table rows; show lock icon with tooltip for access permissions

---

## 1. Fix `read-excel-file` Build Error

**File: `src/components/patients/PatientImport.tsx`**
- Replace `read-excel-file` with a direct browser-compatible import: `import readXlsxFile from 'read-excel-file/browser'` (or switch to using the `web` subpath)
- If that also fails, fall back to reading the file as ArrayBuffer and using a dynamic import

**File: `package.json`**
- Verify `read-excel-file` is listed; may need version pin

## 2. Fix CSS @import Order

**File: `src/index.css`**
- Move `@import "@fontsource/inter/..."` statements above `@tailwind base` directives

## 3. Fix Dual Currency Display

**File: `src/pages/doctor/Invoices.tsx`**
- Line ~926: Remove `<DollarSign>` icon from the service selector display when a currency symbol already exists
- Replace with just the currency symbol text, no icon

## 4. Moola Logo — Consistent White Circle Badge

**File: `src/components/gamification/LollipopDisplay.tsx`**
- Wrap the Moola logo `<img>` in a white circle container (`bg-white rounded-full p-1 shadow-sm`) across all variants (badge, compact, card)
- Ensure consistent sizing: small (h-6 w-6 with p-0.5), medium (h-8 w-8 with p-1), large (h-12 w-12 with p-1.5)

**Files using moolasLogo directly**: `MyRewards.tsx`, `PatientDashboard.tsx`, `PatientProfile.tsx`, `StatsCard.tsx`
- Apply the same white-circle wrapper pattern everywhere the logo appears

## 5. Rewards Cards — Bright Cartoon Colours

**File: `src/pages/patient/MyRewards.tsx`**
- Update the 4 hero stat cards to use vivid, playful gradients:
  - Total Moolas: bright yellow/lime gradient
  - Current Level: vibrant purple/pink gradient
  - Active Streaks: hot orange/red gradient
  - Transferred: sky blue/cyan gradient
- Use bolder border colours and slightly rounded card styling for a fun feel

## 6. My Details — Tabs Instead of Frames

**File: `src/components/patients/PatientDetailsEditor.tsx`**
- Replace the 10 `CollapsibleFrame` sections in VIEW mode with 3 tabs:
  - **Personal Information**: Name, ID, Gender, DOB, Email, Phone, Marital Status, Referred By, Addresses, Next of Kin, Employer
  - **Medical Information**: Physical Measurements, Blood Type (new field), Allergies, Chronic Medication, Surgeries & Dates, Family History (new section — Relation + Condition), Medical Insurance, Pharmacies
  - **General Notes**: Notes textarea
- Add `blood_type` field to formData state and save logic
- Add `family_history` as a JSON array field (relation, condition) with add/remove UI
- EDIT mode: similarly reorganise into the same 3 tab groupings

**Database migration needed**: Add `blood_type` (text, nullable) and `family_history` (jsonb, nullable, default `[]`) columns to the `patients` table.

**File: `src/hooks/usePatients.ts`**
- Add `blood_type` and `family_history` to the `Patient` interface

## 7. My Doctors — Table Rows with Lock Tooltip

**File: `src/pages/patient/MyDoctors.tsx`**
- Replace `DoctorCard` component with table rows in a `<Table>`:
  - Columns: Avatar+Name, Specialty (badge), Phone, Practice #, Lock icon
  - Lock icon: `<Lock>` with `<Tooltip>` showing granted permissions on hover
- Search results also display as rows
- Remove the Card-based layout entirely

---

## Files Modified

| File | Change |
|------|--------|
| `src/index.css` | Move @import above @tailwind |
| `src/components/patients/PatientImport.tsx` | Fix read-excel-file import path |
| `src/pages/doctor/Invoices.tsx` | Remove DollarSign icon duplication |
| `src/components/gamification/LollipopDisplay.tsx` | White circle logo wrapper |
| `src/pages/patient/MyRewards.tsx` | Cartoon colours for hero cards, consistent logo |
| `src/pages/patient/PatientDashboard.tsx` | Consistent logo styling |
| `src/pages/PatientProfile.tsx` | Consistent logo styling |
| `src/components/dashboard/StatsCard.tsx` | Consistent logo styling |
| `src/components/patients/PatientDetailsEditor.tsx` | Tabs layout + blood type + family history |
| `src/hooks/usePatients.ts` | Add blood_type, family_history to Patient interface |
| `src/pages/patient/MyDoctors.tsx` | Table rows + lock tooltip |
| **Database migration** | Add blood_type, family_history columns |

