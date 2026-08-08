# Route patient-facing tasks to the patient, keep the doctor list clinical-admin only

## Problem (verified)

Doctor and patient task lists read from the same `todos` rows. The doctor list filters `user_id = doctor`, and the patient list filters on the linked patient record — so every task created during a session appears on both. There is no field saying who a task is for.

Live data confirms it: the doctor's list currently holds rows such as "Prescribe Dorminoc in the evening for sleep.", "Perform 3 knee exercises in the morning and night...", "Patient to avoid gluten, avoid nightshades, and continue taking ibuprofen." — all patient instructions sitting in the doctor's to-do list.

## What changes

1. Every task gets an owner: doctor or patient.
   - Doctor tasks: write prescription, medical certificate, referral, invoice, letter, schedule appointment, review generated document, clinical follow-up.
   - Patient tasks: exercise, diet, sleep, hydration, physio, home care, monitoring, lifestyle and any other self-care instruction.
2. Medication/prescription items are no longer created as tasks at all. The prescription document and the medication adherence module already cover them, so "take X twice a day" style entries stop cluttering either list.
3. Doctor home page and Tasks page show only doctor-owned tasks.
4. Patient Tasks page shows only patient-owned tasks (today it also shows the doctor's admin items such as "Review Invoice - Anna Schmidt").
5. Existing tasks are reclassified in place so the current mess is cleaned up, and existing medication-instruction tasks are removed.

## Technical detail

- Migration: add `assignee text not null default 'doctor'` to `public.todos` with a check constraint of `('doctor','patient')`; index on `(user_id, assignee, status)`. RLS policies stay as they are (ownership is still `user_id` / patient link); the new column only filters presentation.
- Data backfill in the same change: classify existing rows via keyword rules (exercise/diet/sleep/stretch/walk/hydrate/rest/physio/home care → `patient`; everything else stays `doctor`), and delete non-document medication-instruction rows.
- New shared helper `src/lib/taskAssignee.ts` exporting `classifyTask(title, taskType)` returning `'doctor' | 'patient' | 'skip'` (skip = medication/prescription instruction). Used by both the app and mirrored in the edge function so client and server agree.
- `supabase/functions/process-todo-actions/index.ts`: set `assignee` on inserted todos using the same rules; skip creating standalone medication-instruction tasks (prescription documents already handle them).
- `src/hooks/useSessions.ts`: apply the same classification on the fallback action-point inserts and on the patient-task assignment path (`summaryData.patient_tasks` → `assignee: 'patient'`).
- `src/components/dashboard/CompactTodoList.tsx`, `src/pages/TodoList.tsx`, `src/pages/Dashboard.tsx` pending count: add `.eq("assignee","doctor")`.
- `src/pages/patient/PatientTasks.tsx` and `src/pages/patient/PatientDashboard.tsx`: add `.eq("assignee","patient")`; tasks the patient adds themselves insert with `assignee: 'patient'`.
