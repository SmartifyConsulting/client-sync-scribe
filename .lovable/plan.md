

# Plan: Fix Missing Headings, Replace Filter Badges with Dropdown, Add Document Type Icons to Rows

## 1. Restore H1 Headings for My Documents, My Doctors, My Round Table

Currently these components are rendered with `hideHeader` prop, which suppresses their built-in `<h1>` headings. Remove `hideHeader` from all 6 usages in `PatientDetailsEditor.tsx` (lines 543, 552, 561, 862, 871, 880) so the components render their own headings.

**File**: `src/components/patients/PatientDetailsEditor.tsx`

## 2. Replace Filter Badge Bar with Dropdown Select

Remove the badge-based filter bar (lines 700-727 in `PatientDocuments.tsx`) and replace with a `<Select>` dropdown using the existing `FILTER_OPTIONS` array. The dropdown will show "Filter by type" as placeholder and list all document types.

**File**: `src/pages/patient/PatientDocuments.tsx`

## 3. Add Document Type Icon to Each Document Row

The document rows already show a generic icon in the left circle (line 756). Update each row to also show a small color-coded icon badge next to the document name (replacing the text Badge with an icon-only badge). The `DOC_TYPE_CONFIG` already maps each type to an icon and color.

Changes to document row (lines 771-777):
- Replace the text `Badge` showing `config.label` with an icon-only badge: just the `IconComponent` from `DOC_TYPE_CONFIG` rendered inside a small colored circle, using `config.color` as background.

## 4. Color-Code Uploaded Documents

Documents that are uploaded (source from media/file uploads, i.e. types `image`, `audio`, `video`, `file`) will get a distinct left-border accent color on the Card to visually distinguish them from system-generated documents (prescriptions, invoices, etc.). Use `border-l-4` with a color derived from `DOC_TYPE_CONFIG`.

**File**: `src/pages/patient/PatientDocuments.tsx`

## Files Modified

| File | Change |
|------|--------|
| `src/components/patients/PatientDetailsEditor.tsx` | Remove `hideHeader` from PatientDocuments, MyDoctors, PatientRoundTable (6 places) |
| `src/pages/patient/PatientDocuments.tsx` | Replace filter badges with Select dropdown; replace text Badge with icon-only badge; add color-coded left border to uploaded docs |

