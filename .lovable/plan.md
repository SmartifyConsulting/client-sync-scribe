

# Fix: Calendar Sub-Heading + Process-Todo-Actions Improvements

## 1. Fix Calendar Sub-Heading Font Size

**File:** `src/pages/CalendarView.tsx` (line 251)

Current: `<p className="mt-1 text-muted-foreground">`
Should be: `<p className="text-muted-foreground text-[12px]">`

The previous batch update missed adding `text-[12px]` to this file's sub-heading, so it defaults to the browser's inherited size instead of the standardized 12px used on every other page.

## 2. Improve AI Todo Descriptions to Include Date/Time

**File:** `supabase/functions/process-todo-actions/index.ts`

Update the AI system prompt to explicitly instruct it to always embed date, time, and patient name into the `description` field for scheduling tasks.

## 3. Fix Patient ID Validation in Todo Processing

**File:** `supabase/functions/process-todo-actions/index.ts`

Validate that any AI-returned `patient_id` actually exists in the doctor's patient list. If not, fall back to name-based fuzzy matching so patients like Lisa Anderson are correctly linked.

## Files Modified

| File | Change |
|------|--------|
| `src/pages/CalendarView.tsx` | Add `text-[12px]` to sub-heading |
| `supabase/functions/process-todo-actions/index.ts` | Improve AI prompt for date/time; fix patient_id validation |

