

# Finding Shannon's Medication Task and Daily Evidence Capture

## Current State

The system already has two separate locations for this:

1. **To-Do List** (`/patient/tasks`): Shows tasks assigned by Dr. Allie, including medication tasks with Moolas rewards. However, this page is **display-only** — there's no button to submit proof or mark completion.

2. **My Rewards → Chronic Meds tab** (`/patient/rewards`): Contains the full video capture and AI validation flow. But this tab only appears when `is_chronic = true` on the patient record AND active prescriptions exist in the `prescriptions` table.

## Problems to Fix

### 1. Patient To-Do List lacks action buttons
The `PatientTasks.tsx` `TaskCard` component shows task info but has no way for patients to act on tasks — no "Record Proof" button, no way to mark tasks complete. The `Camera` icon is imported but never used.

### 2. Tasks and Chronic Meds tab are disconnected
When Dr. Allie assigns a medication task via the To-Do list, it creates a `todos` record. But the Chronic Meds tab operates on `prescriptions` + `medication_adherence` records — completely separate data. There's no link between the two systems.

### 3. Shannon's patient record may not be flagged as chronic
If `is_chronic` is not `true`, the Chronic Meds tab won't appear in My Rewards at all.

## Plan

### Step 1: Add proof capture to Patient To-Do List
**File:** `src/pages/patient/PatientTasks.tsx`
- Add a "Record Proof" button (Camera icon) on pending task cards that have `moolas_reward > 0`
- Integrate the same video recording dialog used in `MedicationAdherenceTab` — open camera, record up to 30s, submit to `validate-medication-video` edge function
- On successful AI validation, update the todo status to `completed` and award Moolas
- This makes the To-Do List a self-contained action point for patients

### Step 2: Link medication tasks to the Chronic Meds tracker
**File:** `src/pages/patient/PatientTasks.tsx`
- For medication-type tasks, add a "Go to Chronic Meds" link/button that navigates to `/patient/rewards` with the chronic-meds tab pre-selected
- This gives patients a clear path from their task list to the daily tracker

### Step 3: Verify Shannon's data setup
- Ensure Shannon's patient record has `is_chronic = true` and active prescriptions exist — this is a data issue the doctor needs to set on her profile

## Files Modified

| File | Change |
|------|--------|
| `src/pages/patient/PatientTasks.tsx` | Add "Record Proof" camera button and video capture dialog to pending task cards |

