

# Updated Multi-Change Plan

All items from the previous approved plan, plus these additions:

## Additional Changes

### A. Rename "My Details" to "My Holarc" in Sidebar

**File: `src/components/layout/Sidebar.tsx`** (line 53)
- Change `label: "My Details"` to `label: "My Holarc"`

**File: `src/pages/patient/MyDetails.tsx`**
- Update the page heading from "My Details" to "My Holarc"

### B. Remove "My Documents" from Sidebar Nav

**File: `src/components/layout/Sidebar.tsx`** (line 56)
- Remove `{ icon: FileText, label: "My Documents", to: "/patient/documents" }` from `patientNavItems` since documents will now live as a tab inside My Holarc

### C. Add "My Documents" as a Tab in PatientDetailsEditor

**File: `src/components/patients/PatientDetailsEditor.tsx`**
- Add a 4th tab: **My Documents** — positioned between Medical Information and General Notes
- Tab order: Personal Information | Medical Information | My Documents | General Notes
- The Documents tab will embed the patient documents list (reuse content from `src/pages/patient/PatientDocuments.tsx`)

**File: `src/pages/patient/MyDetails.tsx`**
- Pass any needed props for the documents tab

### D. Update Bottom Nav (Mobile)

**File: `src/components/layout/BottomNav.tsx`** (line 29)
- Remove or update the "Docs" entry since documents now live under My Holarc

---

## Full Plan Summary (Previous + New)

| # | Change | Files |
|---|--------|-------|
| 1 | Replace Moola logo with transparent PNG | 6 files + new asset |
| 2 | Medical Info tab — two-column layout | `PatientDetailsEditor.tsx` |
| 3 | Organ Donor field + DB migration | `PatientDetailsEditor.tsx`, `usePatients.ts`, migration |
| 4 | Font size normalization | `PatientDetailsEditor.tsx` |
| 5 | Dashboard revamp with new brand style | `Dashboard.tsx` |
| 6 | Rename "My Details" → "My Holarc" | `Sidebar.tsx`, `MyDetails.tsx` |
| 7 | Remove "My Documents" from sidebar | `Sidebar.tsx`, `BottomNav.tsx` |
| 8 | Add "My Documents" tab before General Notes | `PatientDetailsEditor.tsx`, `MyDetails.tsx` |

