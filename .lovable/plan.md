# Practice Management Assistant (PMA)

Add a new practice role: a Practice Management Assistant who supports the doctors of a practice with scheduling, tasks and admissions paperwork — without seeing clinical records.

## What gets built

### 1. Adding a PMA in My Practice
- New accordion section on My Practice, separate from Partners: **Practice Management Assistant**.
- Owner can add an assistant by searching existing Holarc users (same search UX as partners) or by sending an email invite for someone who does not have an account yet.
- Assistants never appear in the Partners accordion; partners never appear in the assistant accordion.
- Owner can remove an assistant. Assistants can be listed with name, email, mobile and status (active / invited).

### 2. What a PMA can see
Signed in as an assistant, the person keeps their own patient profile and can switch to an "Assistant" profile from the avatar switcher. In assistant mode they get:
- **Patients** — the combined patient list of all doctors in the practice, limited to an admin-only view: name, contact details, appointments, invoices and tasks. No session notes, prescriptions, clinical documents, lab results or admissions history.
- **Calendar** — the practice calendar with all practice doctors' appointments; can create, move and cancel appointments.
- **Tasks** — full task workspace (see below).
- **Hospital Admission Form** — the only document type the assistant may create for a patient.
- No access to Sessions, Documents, Prescriptions, Biolog, Round Tables or Rewards.

### 3. Tasks in both directions
- Assistant can create a task and assign it to any doctor in the practice.
- Assistant can create a task and assign it to a patient of the practice.
- Doctors can create a task and assign it to the practice assistant.
- Assigned tasks show who created them and who they are for; the recipient sees them in their own task list and gets a notification.

## Technical notes

**Database**
- `practice_members.role` gains a `'assistant'` value (currently `'owner'`/`'member'`), so assistants join the same practice through the existing membership table and invitation flow. `practice_invitations` gains an `invited_role` column defaulting to `'member'`.
- `todos` gains `assigned_to_user_id` (nullable) and `created_by` so a task can be owned by one user but raised by another. Existing behaviour is unchanged when the column is null; the `assignee` column ('doctor' | 'patient') stays as the doctor/patient routing flag added earlier.
- New security-definer helpers: `is_practice_assistant(user_id)` and `shares_practice(user_a, user_b)`, used by RLS so an assistant can read the practice doctors' `patients` rows, `appointments` and `todos`, and insert `todos` and admission-form `documents` — while `sessions`, `prescriptions`, `documents` (other types) and clinical tables stay blocked.
- Grants and RLS policies written per table; assistant read access is scoped through `shares_practice`, never a blanket authenticated read.

**Frontend**
- `useUserRole` gains an `assistant` role resolved from `practice_members.role = 'assistant'`; sidebar renders an assistant nav set (Patients, Calendar, Tasks) and the profile switcher offers Patient / Assistant.
- Patient list and patient detail render an assistant variant that only mounts the admin tabs (Details, Appointments, Invoices, Tasks) plus a "New hospital admission form" action.
- Task creation dialog gains an "Assign to" picker: practice doctors, the practice assistant, or a patient. Reuses the existing notification insert.

## Out of scope
- Assistants do not get session recording, AI features, clinical document templates, or Vula rewards.
- No billing/subscription changes for assistant seats.
