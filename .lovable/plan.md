## 1. Dashboard To-Do List grouped by date

`CompactTodoList` currently groups by patient in plain collapsibles. Replace that with the same date grouping already used by My Tasks (`DATE_BUCKETS` / `dateBucketFor` from `src/components/ui/section-accordion.tsx`):

- Buckets: **Today** · **This week** · **This month** · **Older** (Older covers month/year-old items).
- Rendered with the shared `Accordion` + `SECTION_FRAME_CLASS` / `SECTION_ITEM_CLASS` / `SECTION_TRIGGER_CLASS` and a `SectionCountPill`, so styling matches My Tasks and My Sessions exactly.
- **Today expanded by default with green background and white text**; all other rows collapsed on white/grey. Clicking any other row gives it the same green/white treatment (already handled by the shared trigger class).
- Empty buckets are hidden; task rows inside keep the existing `TodoRow` behaviour (toggle, edit, delete, preview, send).

## 2. "Clear all" in the Done view

Add a **Clear all** button that appears only when the Done/completed filter is active and there is at least one completed task, in both:
- the dashboard to-do card (`CompactTodoList`), and
- My Tasks (`src/pages/TodoList.tsx`).

Behaviour: confirmation dialog, then permanently delete the signed-in user's completed tasks, refresh the list, toast on success. Active tasks are untouched.

## 3. Sample Data badge

Replace the current small circled "s" mark with a proper pill badge:
- Crimson red (`#DC143C`) background, white uppercase text reading **SAMPLE DATA**, small rounded pill, `text-[9px]`, tooltip "Sample data — not a real patient".
- Keep the same component (`src/components/patients/SampleBadge.tsx`) and the existing `isSamplePatient` detection, so every current usage picks it up automatically: Patients list, Patient profile header, Recent Activity, Upcoming Appointments, Documents tab.
- Placement: inline next to the patient name where space allows; on the patient profile header it sits directly under the name so it doesn't stretch the heading row.

## Technical notes

- Files: `src/components/dashboard/CompactTodoList.tsx`, `src/pages/TodoList.tsx`, `src/components/patients/SampleBadge.tsx`, `src/pages/PatientProfile.tsx` (badge moved under the name).
- No schema changes; deletion uses the existing `todos` table with the user filter already applied in the component.
- No colour-token changes — crimson stays a literal badge-only value as it is today.
