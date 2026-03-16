

# Fix Patient Import Table Scrolling & Field Widths

## Problem
The import preview table is inside a `max-w-2xl` dialog but has `minWidth: 1400px` on the table. The scrolling containers conflict with the `ScrollArea` wrapper in the dialog, preventing horizontal and vertical scrolling. Fields are also too wide.

## Changes

### `src/components/patients/PatientImport.tsx`

1. **Reduce column min-widths** significantly — Name: 120px, Email: 140px, Phone: 100px, DOB: 110px, Gender: 70px, ID: 100px, Medical Aid: 110px, Employer: 100px, Allergies: 100px, Address: 110px, Status: 70px
2. **Reduce table minWidth** from 1400px to ~1200px
3. **Make input fields narrower** — reduce padding, use compact styling
4. **Fix scrolling** — remove the outer `ScrollArea` from the `PatientImportDialog` (line 758) and rely on the inner `overflow-x-auto overflow-y-auto` div with a proper constrained height. Set `overflow-y-auto` on the dialog content area itself.

### `PatientImportDialog` (lines 748-761)
- Expand dialog to `max-w-4xl` so more columns are visible without scrolling
- Remove the `ScrollArea` wrapper — let the inner div handle scrolling
- Add `overflow-y-auto` to the content container

### Preview table container (lines 608-652)
- Keep `overflow-x-auto overflow-y-auto` on the inner div
- Reduce `maxHeight` to `400px` for the table container so it scrolls vertically within the dialog

### Input fields
- Use `className="h-7 text-xs px-1.5"` instead of `h-8 text-sm` for compact inputs

