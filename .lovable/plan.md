

# AI-Powered Task Auto-Execution

## Overview
When a doctor dictates or types tasks (via the Todo list or session flow), the system uses AI to parse the input into structured actions, auto-execute what it can, and leave the rest as manual todos. Auto-executed tasks are marked done with a visual badge.

## Database Migration
```sql
ALTER TABLE todos ADD COLUMN IF NOT EXISTS is_auto_executed boolean DEFAULT false;
```

## New Edge Function: `process-todo-actions/index.ts`

Accepts `{ text: string, user_id: string }`. Uses Lovable AI (Gemini) to parse transcribed/typed text into structured actions. Matches patient names against the doctor's patient list (fuzzy match).

**Auto-executable action types:**
1. **Schedule appointment** -- insert into `appointments` table
2. **Write medical certificate** -- insert into `documents` table using the Medical Certificate template, auto-filling patient and practice data
3. **Write prescription** -- insert into `prescriptions` table with parsed medication, dosage, frequency
4. **Write referral letter** -- insert into `documents` table using the Referral Letter template
5. **Create invoice** -- insert into `invoices` table with parsed service/amount
6. **Write general letter** -- insert into `documents` table using the General Letter template

For each auto-executed action:
- Create the record in the appropriate table (appointments, documents, prescriptions, invoices)
- Create a todo marked `is_auto_executed = true`, `status = 'completed'`

For non-automatable tasks:
- Create a todo with `status = 'pending'`, `is_auto_executed = false`

**AI prompt** instructs the model to extract: action type, patient name, date/time, description, and type-specific fields (medication/dosage for prescriptions, service/amount for invoices, referring doctor for referrals, leave period for certificates). Uses tool-calling for structured output.

**Logic flow:**
1. Fetch doctor's patient list and profile (practice number, address, etc.)
2. Call Gemini with tool-calling to parse input into structured actions
3. For each action, match patient name to a patient record
4. Execute the appropriate database insert
5. Create completed todo with `is_auto_executed = true`
6. Return summary of what was done vs what needs manual attention

## Frontend Changes: `src/pages/TodoList.tsx`

1. After voice transcription or text entry, add an "AI Process" button that sends text to `process-todo-actions`
2. Show processing state with spinner and results summary (e.g., "Scheduled appointment for Faith Akeno. Created prescription for Georgia Adams. 1 task needs manual action.")
3. Auto-executed todos display with strikethrough + green "Auto-executed" badge with Zap icon
4. Add `is_auto_executed` to `TodoItem` interface
5. Refresh todo list after processing

## Config
Add to `supabase/config.toml`:
```toml
[functions.process-todo-actions]
verify_jwt = true
```

## Files Modified

| File | Change |
|------|--------|
| Migration | Add `is_auto_executed` to `todos` |
| `supabase/functions/process-todo-actions/index.ts` | New edge function with AI parsing and auto-execution |
| `supabase/config.toml` | Register new function |
| `src/pages/TodoList.tsx` | AI processing flow, auto-executed badges |

