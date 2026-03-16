

# Plan: Patient Documents Page, Round Table Page, Storage Usage Indicator, Navigation Reorder

## 1. Patient Navigation Menu Reorder

Update `Sidebar.tsx` and `BottomNav.tsx` patient nav items to match the requested sequence:

```
Dashboard → My Doctors → My Calendar → My Tasks → My Documents → Round Table → My Rewards → Prescriptions → Invoices
```

Remove "Invites" as a separate nav item (it was `/patient/invites`). Add "My Documents" (`/patient/documents`) and "Round Table" (`/patient/round-table`).

## 2. Create Patient Documents Page

Create `src/pages/patient/PatientDocuments.tsx` — a read-only view of documents associated with the patient. Query the `documents` table where `patient_id` matches a patient record linked to the current user.

**Storage Usage Indicator**: At the top of the page, show a progress bar indicating storage used out of 100MB allocation. Calculate total storage by summing the `content` field lengths of all documents for the patient. Display "X MB / 100 MB used" with a visual progress bar. Show a warning when approaching the limit and a prompt to upgrade when exceeded.

**Database**: Add an RLS policy so patients can view documents associated with them:
```sql
CREATE POLICY "Patients can view documents for their patient record"
ON public.documents FOR SELECT TO authenticated
USING (patient_id IN (SELECT id FROM patients WHERE patient_user_id = auth.uid()));
```

## 3. Create Patient Round Table Page

Create `src/pages/patient/PatientRoundTable.tsx` — shows round table notes across all patient records linked to the current user. Query `round_table_notes` joined with patient records where `patient_user_id = auth.uid()`. Display notes grouped by patient (if patient has multiple doctor relationships), showing doctor name, content, and timestamp. Read-only for patients.

**Database**: Add RLS policy for patients to view their round table notes:
```sql
CREATE POLICY "Patients can view their round table notes"
ON public.round_table_notes FOR SELECT TO authenticated
USING (patient_id IN (SELECT id FROM patients WHERE patient_user_id = auth.uid()));
```

## 4. Add Routes in App.tsx

- `/patient/documents` → `PatientDocuments`
- `/patient/round-table` → `PatientRoundTable`

## Files to Create/Modify

| File | Action |
|------|--------|
| `src/pages/patient/PatientDocuments.tsx` | New — patient documents view with storage usage bar |
| `src/pages/patient/PatientRoundTable.tsx` | New — patient round table notes view |
| `src/components/layout/Sidebar.tsx` | Reorder patient nav, add My Documents + Round Table |
| `src/components/layout/BottomNav.tsx` | Update patient nav (keep 5 most important) |
| `src/App.tsx` | Add 2 new patient routes |
| SQL Migration | RLS policies for patient document + round table access |

