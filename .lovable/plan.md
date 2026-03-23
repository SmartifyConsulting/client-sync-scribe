

# Plan: Add Icons to All Headings & Restructure Medical Columns

## 1. Add Icons to Missing Headings (View Mode)

In the **view mode** medical tab (lines 400-520), these headings are missing icons:

| Heading | Icon to Add |
|---------|-------------|
| Medical Insurance (line 407) | `ShieldCheck` |
| Pharmacies (line 419) | `Store` |
| Physical Measurements (line 443) | `Activity` |
| Blood Type (line 462) | `Droplets` |
| Surgeries and Dates (line 483) | `Scissors` |
| Family History (line 500) | `GitBranch` |

Each `<h3>` will get `flex items-center gap-1.5` with the corresponding icon at `h-3.5 w-3.5`, matching the existing pattern used by Allergies, Chronic Medication, and Organ Donor.

## 2. Restructure View Mode Columns (lines 401-520)

**Current**: Column 1 = Insurance + Pharmacies, Column 2 = Physical/Blood/Allergies/etc (separate frames)

**New layout**:
- **Column 1**: Single "Medical Information" frame containing Physical Measurements, Blood Type, Allergies, Chronic Medication, Surgeries, Family History, and Organ Donor (all sub-sections inside one bordered card)
- **Column 2**: Insurance frame + Pharmacies frame (separate cards)

## 3. Edit Mode Already Correct

The edit mode (lines 640-830) already has the correct structure — Column 1 is a single "Medical Information" frame, Column 2 is Insurance + Pharmacies. No changes needed there.

## File Modified

| File | Change |
|------|--------|
| `src/components/patients/PatientDetailsEditor.tsx` | Add icons to all view-mode headings; swap columns so Medical Information (single frame) is Column 1, Insurance + Pharmacies is Column 2 |

