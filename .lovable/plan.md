

# Multi-Feature Update: Task Display, Deduplication, Patient Task Assignment, Nav Changes, and Chronic Med Notification Frequency

## Summary

Five changes: (1) Show patient name on all tasks, (2) Remove duplicate prescription/document todos when documents are auto-generated, (3) Auto-generate patient task assignments as "Review & Send" documents, (4) Move "My Patients" and "My Round Tables" from Holarprac tabs to sidebar nav items, (5) Add chronic medication notification frequency setting for doctors.

---

## 1. Show Patient Name on All Tasks

**Problem:** Many tasks don't show whom they relate to because the `action_points` AI-generated todos don't always include the patient name in the title, and the patient_name join sometimes fails.

**Fix in `src/pages/TodoList.tsx`:**
- The query already joins `patients(name)` — ensure patient_name is always displayed prominently when `patient_id` is set
- In the task rendering (line ~477), move the patient name display from the bottom metadata row to be inline with the title: e.g., `"Task title — Patient Name"` or as a prominent badge next to the title
- Ensure `patient_name` is always populated by falling back to fetching from the patients table if the join returns null

**Fix in `src/hooks/useSessions.ts`:**
- When inserting action_point todos (lines 268-301), ensure the patient name is included in the title: `"${point} — ${patientName}"`

---

## 2. Remove Duplicate Prescription/Document Todos

**Problem:** When the AI generates action points like "Write prescription for Patient X", it creates a todo. Then the system ALSO auto-generates the prescription document AND a "Review & Send: Prescription" todo. This results in duplicate tasks.

**Fix in `src/hooks/useSessions.ts`:**
- After auto-generating documents (prescriptions, medical certificates, referral letters, invoices), **remove the corresponding action_point todo** that was already created
- Specifically: after creating a prescription document + its "Review & Send" todo, delete any action_point todos whose title contains "prescription" for the same session
- Apply same logic for medical certificates, referral letters, and invoices
- This ensures only the document_review todo remains, not the raw action point

**Implementation:** After each document auto-creation block, add:
```typescript
// Remove duplicate action point todos for this document type
await supabase.from('todos')
  .delete()
  .eq('session_id', sessionId)
  .eq('user_id', user.id)
  .neq('task_type', 'document_review')
  .ilike('title', '%prescription%');
```

---

## 3. Patient Task Assignment as "Review & Send" Document

**Problem:** When AI detects a patient exercise/task assignment in the session, it should auto-generate a "Patient Task Assignment" document (like prescriptions) in "Review & Send" state. Once reviewed and sent by the doctor, it becomes a task on the patient's to-do list.

**Fix in `supabase/functions/summarize-session/index.ts`:**
- Add a new document type detection: `patient_tasks` — an array of task assignments detected in the session (exercises, homework, lifestyle changes)
- Schema: `{ tasks: [{ title, description, frequency, moolas_reward }] }`

**Fix in `src/hooks/useSessions.ts`:**
- After session completion, if `summaryData.patient_tasks` exists, auto-generate a "Patient Task Assignment" document with the task details
- Create a "Review & Send: Patient Tasks — {PatientName}" todo with `task_type: 'document_review'`
- When the doctor clicks "Send" on this document, create the actual patient todos (insert into `todos` table with `patient_id`) and notify the patient

**Fix in `src/pages/TodoList.tsx`:**
- In `handleSendDoc`, detect if the document is a "Patient Task Assignment" — if so, parse the tasks from the document content and insert them as patient todos + notifications

---

## 4. Move "My Patients" and "My Round Tables" to Sidebar Nav

**Fix in `src/components/layout/Sidebar.tsx`:**
- Add `{ icon: Users, label: "My Patients", to: "/patients" }` under "My Holarprac" in `doctorNavItems`
- Add `{ icon: Users2, label: "My Round Tables", to: "/practice?tab=roundtables" }` under "My Patients"

**Fix in `src/pages/MyPractice.tsx`:**
- Remove "My Patients" and "My Round Tables" TabsTrigger entries
- Remove their TabsContent blocks (they render `<Patients />` and `<DoctorRoundTables />`)
- Default tab changes to "practice" instead of "patients"

**Fix in `src/components/layout/BottomNav.tsx`:**
- No change needed — bottom nav stays compact

**Fix in `src/App.tsx`:**
- The `/patients` route already exists. Ensure it still works standalone.

---

## 5. Chronic Medication Notification Frequency Setting

**Problem:** Doctors need to control how often they're informed about chronic patients' medication adherence (e.g., daily, weekly, monthly).

**Database migration:**
```sql
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS chronic_med_notification_frequency text DEFAULT 'daily';
```

**Fix in `src/pages/Settings.tsx` (Notifications tab, lines 406-429):**
- Add a new setting for doctors only: "Chronic Medication Adherence Updates"
- Description: "How often to receive notifications about chronic patients taking or missing their medications"
- Select dropdown with options: "Every dose", "Daily summary", "Weekly summary", "Monthly summary", "Never"
- Save to `profiles.chronic_med_notification_frequency`

---

## Files Modified

| File | Change |
|------|--------|
| `src/pages/TodoList.tsx` | Show patient name prominently on all tasks; handle patient task assignment send |
| `src/hooks/useSessions.ts` | Include patient name in action point titles; delete duplicate todos after document auto-gen; auto-gen patient task assignment documents |
| `supabase/functions/summarize-session/index.ts` | Add `patient_tasks` detection to AI schema |
| `src/components/layout/Sidebar.tsx` | Add "My Patients" and "My Round Tables" nav items |
| `src/pages/MyPractice.tsx` | Remove Patients and Round Tables tabs |
| `src/pages/Settings.tsx` | Add chronic med notification frequency setting |
| Migration | Add `chronic_med_notification_frequency` column to profiles |

