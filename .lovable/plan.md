

# Plan: Auto-Record Sessions, Private Calendar Slots, Assigned Tasks in Rewards, and Activity Verification Camera

## 1. Auto-Start Recording When Session Begins

**File:** `src/pages/Sessions.tsx`

In the `startSession` function (line ~465), call `startRecording()` immediately after setting state to "active". This removes the need for doctors to manually click the record button.

```typescript
const startSession = async () => {
  setSessionState("active");
  // ... existing reset logic ...
  sessionStartTimeRef.current = new Date();
  savedAudioUrlRef.current = null;
  // Auto-start recording
  startRecording();
};
```

The recording button remains visible for pause/resume, but recording begins automatically.

---

## 2. Private Calendar Slots for Appointment Booking

**File:** `src/components/appointments/BookAppointmentDialog.tsx`

The `fetchBusySlots` function (line ~172) already fetches only `start_time, end_time` — no patient details are exposed. The slot rendering (line ~395) shows busy slots as disabled with `opacity-50`. No patient info is leaked. However, the label currently just disables the button. We should ensure the tooltip/text says "Booked" without any identifying info.

**File:** `src/pages/CalendarView.tsx`

The doctor's calendar currently uses `mockEvents` with patient names visible. When a patient views a doctor's calendar for booking, we need to ensure only "Booked" is shown for occupied slots rather than patient names. Update the appointment query to strip patient details when the viewer is not the calendar owner.

This is primarily a data-layer concern — the `BookAppointmentDialog` already only fetches `start_time, end_time` so it's already private. The doctor's own calendar view (`CalendarView.tsx`) showing patient names is fine since it's the doctor's own view.

**Change:** Add a "Booked" label on busy slots in `BookAppointmentDialog` instead of just graying them out. Minor UI tweak.

---

## 3. Move Patient Tasks into My Rewards as "Assigned Tasks" Tab

**File:** `src/pages/patient/MyRewards.tsx`

- Add a new tab "Assigned Tasks" after "Overview" in the `TabsList`
- Import and embed the task-fetching logic from `PatientTasks.tsx` (query patient todos)
- Each task card shows title, description, priority, due date, and completion status
- Completed tasks show Moola rewards earned
- Add a `Video` icon button on activity-type tasks for proof submission

**File:** `src/pages/patient/PatientTasks.tsx`

- Keep the page but redirect/link to My Rewards, or remove from nav since tasks are now in Rewards

**File:** `src/components/layout/Sidebar.tsx` / `BottomNav.tsx`

- Remove standalone "My Tasks" nav item for patients (tasks are now under Rewards)

---

## 4. Notify Patients When Tasks Are Assigned

**File:** `src/hooks/useSessions.ts` or wherever doctor-assigned tasks are created

- When a todo is inserted with a `patient_id`, look up the patient's `patient_user_id` and insert a notification:
  ```typescript
  await supabase.from('notifications').insert({
    user_id: patientUserId,
    title: '📋 New task assigned by your doctor',
    message: taskTitle,
    type: 'task_assigned',
  });
  ```

**File:** `supabase/functions/process-todo-actions/index.ts`

- When AI auto-creates patient tasks, also insert a notification for the patient

---

## 5. AI-Prescribed Activities as Assigned Tasks with Moola Rewards

**File:** `supabase/functions/summarize-session/index.ts` (or `process-todo-actions`)

- Enhance the AI prompt to identify prescribed activities (e.g., "drink 8 glasses of water", "do stretches morning and night") and tag them as `activity` type tasks
- When creating these todos, set a field to indicate they're reward-eligible

**Database Migration:**
- Add `task_type` column to `todos` table: `text DEFAULT 'standard'` (values: `standard`, `activity`)
- Add `moolas_reward` column to `todos` table: `integer DEFAULT 0`
- Add `proof_url` column to `todos` table: `text` (nullable, for video proof)

```sql
ALTER TABLE public.todos 
  ADD COLUMN task_type text NOT NULL DEFAULT 'standard',
  ADD COLUMN moolas_reward integer NOT NULL DEFAULT 0,
  ADD COLUMN proof_url text;
```

---

## 6. "Big Brother" Camera Icon for Activity Verification

**File:** `src/pages/patient/MyRewards.tsx`

- Add a prominent camera icon (using `Video` from lucide-react) in the Assigned Tasks tab
- Clicking it opens a video recording dialog (reuse camera capture pattern from `HealthPhotoCapture.tsx`)
- Patient selects which task they're completing, records a short video (up to 30s)
- Video is uploaded to `patient-media` storage bucket
- On upload, the task's `proof_url` is updated and `status` set to `completed`
- Moolas are awarded automatically via a notification + `patient_rewards` insert

**New Component:** `src/components/rewards/ActivityProofCapture.tsx`

- Video recording dialog with task selector
- Camera-only (no file upload) to prevent gaming
- Auto-stops after 30 seconds
- Saves to `patient-media` bucket
- Awards Moolas on completion

---

## Files Modified

| File | Change |
|------|--------|
| `src/pages/Sessions.tsx` | Auto-start recording on session begin |
| `src/components/appointments/BookAppointmentDialog.tsx` | Label busy slots as "Booked" |
| `src/pages/patient/MyRewards.tsx` | Add "Assigned Tasks" tab with task list + Big Brother camera |
| `src/components/rewards/ActivityProofCapture.tsx` | New video capture component for task proof |
| `src/pages/patient/PatientTasks.tsx` | Keep but simplify (redirect to Rewards) |
| `supabase/functions/process-todo-actions/index.ts` | Add patient notification on task creation |
| Database migration | Add `task_type`, `moolas_reward`, `proof_url` to `todos` |

