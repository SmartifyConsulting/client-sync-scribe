

# Updated Patient Details Enhancement Plan

This adds to the previously proposed 12-point plan with one additional change:

## 13. Current Medications with Chronic Indicator

**Concept**: Add a "Current Medications" list field above the Chronic Medication section. Each medication entry has a name and a "Chronic" toggle. The `is_chronic` flag and the Chronic Medication section are automatically derived — if any medication is marked chronic, `is_chronic` becomes `true` and the chronic badge/section is revealed. No manual chronic toggle needed.

**Database Changes (add to existing migration):**
```sql
ALTER TABLE patients ADD COLUMN IF NOT EXISTS current_medications jsonb DEFAULT '[]'::jsonb;
```

Each entry structure: `{ id, name, dosage?, is_chronic: boolean }`

**File:** `src/components/patients/PatientDetailsEditor.tsx`

- Add state for `currentMedications` array, parsed from `patient.current_medications`
- **View mode**: Show a list of medications with a pill icon; chronic ones get a red "Chronic" badge
- **Edit mode**: 
  - Render an "Add Medication" form (name input + optional dosage + chronic checkbox)
  - Each listed medication shows name, dosage, a chronic toggle switch, and edit/delete icons
  - When any medication has `is_chronic: true`, automatically set `is_chronic = true` on save; if none are chronic, set `is_chronic = false`
- Remove the standalone `is_chronic` checkbox — it becomes derived from medications
- Place this section **above** the current "Chronic Medication" position (between Allergies and Surgeries)
- The "Chronic Medication" label/badge remains but is now auto-computed

**File:** `src/hooks/usePatients.ts`
- Add `current_medications` to the `Patient` interface
- Add parsing helper similar to `parseSurgeries`
- Include in `toDbPatient` conversion

**Summary of all 13 items in the full plan:**

| # | Change | Files |
|---|--------|-------|
| 1 | Google Maps address autocomplete | PatientDetailsEditor, index.html |
| 2 | ICE contacts section | PatientDetailsEditor, migration |
| 3 | Split name into first/last | PatientDetailsEditor, migration |
| 4 | Multiple next of kin | PatientDetailsEditor, migration |
| 5 | Relationship dropdown with custom "Other" | PatientDetailsEditor |
| 6 | Country code for phone numbers | PatientDetailsEditor |
| 7 | Surgery date — month/year only | PatientDetailsEditor |
| 8 | Reduce font size of surgery/family history cards | PatientDetailsEditor |
| 9 | Claims email label update | PatientDetailsEditor |
| 10 | Pharmacy branch field | PatientDetailsEditor, usePatients |
| 11 | GP search and connect | PatientDetailsEditor |
| 12 | Inline editing of records | PatientDetailsEditor |
| 13 | Current medications with chronic auto-derive | PatientDetailsEditor, usePatients, migration |

**Single migration** adds: `first_name`, `last_name`, `ice_contacts`, `next_of_kin_members`, `current_medications` columns to `patients` table.

