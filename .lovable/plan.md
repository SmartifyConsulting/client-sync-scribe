

# Why Admission Forms and Appointments Weren't Auto-Created from Session

## Root Cause

The session completion flow has two gaps:

1. **Action points are only saved as pending todos** -- `completeSession()` in `useSessions.ts` (lines 230-243) inserts action points into the `todos` table with `status: 'pending'`. It never attempts to auto-execute them.

2. **Hospital Admission is not a detected document type** -- The `summarize-session` edge function detects prescriptions, invoices, medical certificates, and referrals, but has no schema for hospital admission forms.

3. **No auto-execution pipeline after session** -- The `process-todo-actions` edge function CAN auto-execute tasks (create appointments, prescriptions, documents, etc.) and mark them as completed, but it's only invoked from the voice todo recorder, never from the session completion flow.

## Solution

### 1. Add `hospital_admission` detection to `summarize-session` edge function
- Add a `hospital_admission` object to the AI tool schema (diagnosis, procedure, admission_date, special_instructions)
- Return it alongside prescription/referral/etc.

### 2. Auto-execute action points after session completion
In `useSessions.ts` `completeSession()`, after getting the AI summary and action points, call `process-todo-actions` with the action points text so they get auto-executed (appointments created, documents generated, todos marked as done).

Alternatively, invoke the edge function with the full list of action points concatenated, so the AI can parse and auto-execute each one.

### 3. Auto-create hospital admission document from extracted data
When `summarize-session` returns `hospital_admission` data, auto-create a document in the `documents` table (similar to how `process-todo-actions` creates medical certificates and referral letters).

## Files Modified

| File | Change |
|------|--------|
| `supabase/functions/summarize-session/index.ts` | Add `hospital_admission` to AI tool schema |
| `src/hooks/useSessions.ts` | After getting action points, call `process-todo-actions` to auto-execute them; also auto-create admission document if detected |

## Flow After Fix

```text
Session completes
  → summarize-session AI extracts summary, action_points, prescription, hospital_admission, etc.
  → completeSession() calls process-todo-actions with action_points text
    → AI parses each action point → auto-creates appointments, documents
    → Todos inserted as "completed" + is_auto_executed=true
  → If hospital_admission detected, auto-create admission document
  → Remaining unmatched items stay as pending todos
```

