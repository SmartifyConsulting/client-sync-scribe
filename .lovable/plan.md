

# Plan: Fix Consistency Issues Across App

## 1. Add Icons to All Section Headings in PatientDetailsEditor

Currently some headings have icons (General Notes → StickyNote, Allergies → AlertCircle, Chronic Medication → Pill, Organ Donor → Heart) but others don't. Add icons to all:

| Heading | Icon |
|---------|------|
| Personal Details | `User` |
| Addresses | `MapPin` |
| Next of Kin | `Users` |
| Employer | `Briefcase` |
| Medical Insurance | `ShieldCheck` |
| Pharmacies | `Store` |
| Physical Measurements | `Activity` |
| Blood Type | `Droplets` |
| Surgeries and Dates | `Scissors` |
| Family History | `GitBranch` |

**File**: `src/components/patients/PatientDetailsEditor.tsx` — update all `<h3>` headings to include an icon via `flex items-center gap-1.5` pattern (matching existing ones).

## 2. Fix Settings Preferences Sub-Headings Size

Sub-headings in Preferences tab use `text-[9px]` (Patient Management, Language, Calendar Integration). Other tabs use `text-lg` for section headings (Notifications, Security, Data Management, Subscription, Payment History). Standardize Preferences sub-headings to `text-sm font-semibold` to match the section heading pattern, and ensure the Preferences top heading also uses `text-lg` like the other tabs. Also update the Preferences frame border to `border-primary` (teal) to match the rest of the app.

**File**: `src/pages/Settings.tsx`
- Change `h3` sub-headings from `text-[9px]` to `text-sm`
- Change `h2` heading from `text-sm` to `text-lg` for Preferences
- Update all frame borders from `border-border` to `border-primary`

## 3. Standardize Description Labels Under Headings

Settings tab descriptions are inconsistent — some use `text-sm`, others `text-[8px]`. Standardize all to `text-sm text-muted-foreground`.

**File**: `src/pages/Settings.tsx` — update description `<p>` tags under headings.

## 4. Add Headings to All Tab Content

Ensure tabs like "My Documents", "My Doctors", "My Round Table" always show a heading when rendered inside tabs (currently hidden via `hideHeader`). Change approach: always show heading inside tab content. Remove `hideHeader` usage and instead always render a consistent heading block at the top of each tab content area.

**Files**: 
- `src/components/patients/PatientDetailsEditor.tsx` — add heading blocks inside each tab content (Personal Information, Medical Information, My Documents, My Doctors, My Round Table)
- Remove `hideHeader` props from `PatientDocuments`, `MyDoctors`, `PatientRoundTable` calls inside tabs — let them show their headings

## 5. Reduce Document Type Badge Sizes

The filter badges in PatientDocuments use `px-3 py-1.5 text-xs`. Reduce to `px-2 py-0.5 text-[8px]` so they fit on one row.

**File**: `src/pages/patient/PatientDocuments.tsx` — update badge classes in the filter bar (lines 700-727).

## 6. Swap Medical Information Columns

Currently Column 1 = Insurance + Pharmacies, Column 2 = Physical/Blood/Allergies/etc. Swap them:
- **Column 1**: All medical items (Physical Measurements, Blood Type, Allergies, Chronic Medication, Surgeries, Family History, Organ Donor) inside a single "Medical Information" frame
- **Column 2**: Insurance + Pharmacies (separate frames)

**File**: `src/components/patients/PatientDetailsEditor.tsx` — restructure the medical tab grid.

## 7. Make Alphabet Letter Badges Match ME Icon Color

The alphabet separators in Patients.tsx use `bg-destructive` (red). The ME badge uses `bg-[#E01837]`. Change alphabet badges to also use `bg-[#E01837]` for consistency.

**File**: `src/pages/Patients.tsx` — line 889, change `bg-destructive` to `bg-[#E01837]`.

## Files Modified

| File | Change |
|------|--------|
| `src/components/patients/PatientDetailsEditor.tsx` | Add icons to all headings; swap medical columns into single frame; show headings in all tabs |
| `src/pages/Settings.tsx` | Fix Preferences sub-heading sizes to `text-sm`; standardize descriptions; use `border-primary` on frames |
| `src/pages/patient/PatientDocuments.tsx` | Reduce filter badge sizes |
| `src/pages/Patients.tsx` | Change alphabet badge color to `bg-[#E01837]` |

