
Root cause: this was only partially fixed. `MyDoctors.tsx` was updated, but `PatientDocuments.tsx` and `PatientRoundTable.tsx` still render standalone-style headers (`text-2xl font-bold`), and `PatientDetailsEditor.tsx` is still embedding both components without using their existing `hideHeader` prop. So those large page headers are still showing inside the tab panels.

Plan:
1. Update `src/components/patients/PatientDetailsEditor.tsx`
   - In both the view and edit tab sets, change:
     - `<PatientDocuments />` → `<PatientDocuments hideHeader />`
     - `<PatientRoundTable />` → `<PatientRoundTable hideHeader />`
   - Add compact tab-panel headings above each embedded component so they match the rest of the patient tabs:
     - `My Documents`
     - `My Round Table`
   - Use the same pattern already used elsewhere in the patient profile tabs:
     - heading: `text-lg font-semibold text-foreground`
     - description: `text-xs text-muted-foreground`

2. Keep standalone patient routes intact
   - Leave `src/pages/patient/PatientDocuments.tsx` and `src/pages/patient/PatientRoundTable.tsx` able to show their standalone page headers when opened directly via `/patient/documents` or `/patient/round-table`.
   - This avoids changing standalone page behavior while fixing the embedded tab layout.

3. Tighten spacing for embedded panels
   - Ensure the parent tab content in `PatientDetailsEditor.tsx` owns the section title/description and the child pages only render content cards when `hideHeader` is true.
   - This removes the oversized “page inside a tab” look.

Files to modify:
- `src/components/patients/PatientDetailsEditor.tsx`
- `src/pages/patient/PatientDocuments.tsx` (only if tiny spacing adjustments are needed when `hideHeader` is true)
- `src/pages/patient/PatientRoundTable.tsx` (only if tiny spacing adjustments are needed when `hideHeader` is true)

Expected result:
- `My Documents` and `My Round Table` will visually align with the other patient-profile tabs.
- The mismatch will be fixed at the actual source: embedded tab usage, not just the standalone page components.
