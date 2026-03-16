

# Fixes: ME Badge, Record Task Auto-Start, File Size Limits, Patient Tasks, Document Email

## 1. ME Badge: Terracotta Orange with White Font

**Problem**: The ME badge uses `bg-terracotta/10 text-terracotta` (light pink background, terracotta text). Should be solid terracotta with white text.

**Also**: The ME name is stored as "Surname, FirstNames" during auto-create, but then the display code re-parses it as if it's "First Last" — causing double-reversal (e.g., "Smith, John" → "John, Smith"). Need to detect the comma format and display as-is.

**File**: `src/pages/Patients.tsx`
- Change ME badge classes from `bg-terracotta/10 text-terracotta` to `bg-terracotta text-white`
- Fix name display: if name already contains a comma, display as-is instead of re-parsing

## 2. Record Task: Auto-Start Recording from Dashboard

**Problem**: Dashboard mic button links to `/todos` but doesn't trigger recording automatically.

**Fix**:
- `src/pages/Dashboard.tsx`: Change link to `/todos?autoRecord=true`
- `src/pages/TodoList.tsx`: Read `autoRecord` query param on mount. If present, call `startRecording()` automatically and clear the param.

## 3. 5MB File Size Limit for Audio/Video Uploads

**Files**: `src/pages/PatientProfile.tsx`, `src/components/documents/MediaCapture.tsx`
- In the upload handler and after recording stops, check `blob.size > 5 * 1024 * 1024` and show an error toast if exceeded
- Apply to both the PatientProfile inline upload button and the MediaCapture component

## 4. Patient Task Assignment (Doctor → Patient)

This extends the existing `todos` table which already has a `patient_id` column.

**Changes**:
- `src/pages/TodoList.tsx`: Add ability to assign a patient when creating a task (dropdown of patients). Display patient name on task cards. The AI processing edge function already returns structured actions — enhance it to auto-assign `patient_id` when the dictated task mentions a patient name.
- `supabase/functions/process-todo-actions/index.ts`: Add patient fuzzy-matching to auto-assign tasks to patients when mentioned in voice input.

## 5. Document Email: Per-Patient, Not Global Doctor Email

**Problem**: The Documents tab shows the doctor's mailbox alias for every patient. It should only show the doctor's alias on the ME record. For other patients, each patient would need their own document email — but patients don't have mailbox aliases yet.

**Fix in `src/pages/PatientProfile.tsx`**:
- Check if current patient is the ME record (patient email matches doctor email)
- If ME: show the doctor's mailbox alias as it does now
- If NOT ME: hide the mailbox email banner entirely (since patients don't have their own email aliases yet), or show a note that documents can be uploaded manually

## Files to Modify
1. `src/pages/Patients.tsx` — ME badge styling + name display fix
2. `src/pages/Dashboard.tsx` — Add `?autoRecord=true` to todo link
3. `src/pages/TodoList.tsx` — Auto-start recording from query param + patient assignment UI
4. `src/pages/PatientProfile.tsx` — 5MB upload limit + conditional email banner
5. `src/components/documents/MediaCapture.tsx` — 5MB upload limit
6. `supabase/functions/process-todo-actions/index.ts` — Patient fuzzy-match for auto-assignment

