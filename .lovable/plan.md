

# To-Do Metadata, ME Profile Buttons, Dashboard Layout, Task Icons & Moolas Logo

## 1. To-Do List — All Tasks Show Description, Date, Patient

Currently the description, date, and patient name are already rendered in the task rows (lines 429-458 of TodoList.tsx). However, the completed tasks filter only shows items from the last 14 days. No code change needed here — the metadata already displays for both active and completed tasks.

**Verification**: Confirm all three metadata fields (description, created date, patient badge) render for every task regardless of filter state. If any are conditionally hidden, remove the condition.

## 2. ME Profile — Only Show Connect + Schedule Buttons

**`src/pages/PatientProfile.tsx`** (lines 238-259):

When the doctor is viewing their own ME record (`patient.patient_user_id === currentUserId`), hide the following buttons:
- `InvitePatientDialog`
- `EmoticonSender`
- `Start Session`

Only keep:
- `RequestConnectionButton` (Connect)
- `Schedule` button

Wrap the hidden buttons in a condition: `{(patient as any).patient_user_id !== currentUserId && ( ... )}`.

## 3. Dashboard Stats Cards — Each in Own Row

**`src/pages/Dashboard.tsx`** (lines 322-363):

Change the stats grid from `grid-cols-2 lg:grid-cols-3` to a single-column layout for doctors. Each `StatsCard` will occupy its own full-width row:

```
grid gap-5 grid-cols-1
```

This gives each card (Doctor Rating, Total Moolas, Total Patients, Appointments Today, This Week) its own row.

## 4. Active Tasks — AI Diamond Icon Logic

**`src/pages/TodoList.tsx`** (lines 424-481):

Current behavior: tasks with `is_auto_executed` show a Zap/diamond "Auto" badge. Manual tasks show nothing.

New behavior:
- Remove the "M" / manual indicator entirely (there is none currently, but confirm)
- Only show the AI diamond icon (Zap/sparkles) for auto-generated tasks (`is_auto_executed === true` or `task_type === 'document_review'`)
- For AI-generated tasks, always show a Send arrow icon next to the diamond badge — these are tasks that were auto-created and need to be reviewed/sent
- Manual tasks (no `is_auto_executed`, no `document_id`) show no special icon — they are obviously manual by the absence of the AI indicator

Update the task row rendering:
- Keep the existing `is_auto_executed` badge with diamond icon
- For tasks with `document_id` (auto-generated document tasks): show the AI diamond + Send arrow together
- For tasks without `document_id` but `is_auto_executed`: show AI diamond only
- For manual tasks: no special icon

## 5. Moolas Logo Asset

Copy the uploaded Moolas logo (`user-uploads://2.jpg`) to `src/assets/moolas-logo.jpg` for use across the app wherever the Moolas branding appears (patient dashboard hero card, profile Moolas display, reward sections).

## Files Modified

| File | Change |
|------|--------|
| `src/pages/PatientProfile.tsx` | Hide Invite/Emoticon/Start Session buttons when viewing ME record |
| `src/pages/Dashboard.tsx` | Change stats grid to single-column (`grid-cols-1`) |
| `src/pages/TodoList.tsx` | Ensure AI diamond + send arrow for auto-generated tasks; no icon for manual |
| `src/assets/moolas-logo.jpg` | Copy Moolas logo asset |

