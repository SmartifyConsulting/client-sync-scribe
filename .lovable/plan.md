## Goal

Two visual/interaction changes:

1. Restyle sectioned accordions across the app so each row's individual frame is invisible, and the header bar turns **green with white text** when expanded.
2. Reformat the To-Do List so tasks are **grouped by patient** (collapsed by default) with a cleaner row layout.

---

## Part 1 — Accordion header restyle

**Applies to:** My Practice (doctor), Personal Information + Medical Information (patient Overview / ME mode), and My Sessions (doctor + patient).

### Visual target
- No per-row rounded border or card frame — rows sit flat inside their outer table frame (already added in the previous pass) separated only by a thin grey `divide-y` line.
- Collapsed header: current styling (icon + label, transparent background).
- Expanded header: `bg-primary` (teal) with white text, white icon, white chevron.

### Files
- `src/features/patients/components/PatientDetailsEditor.tsx` — update the shared `SectionHeader` (line ~180) `CollapsibleTrigger`: drop `hover:bg-primary/5` and `data-[state=open]:border-b`; add `data-[state=open]:bg-primary` + `group` on the trigger; switch inner `h3`, `Icon`, and `ChevronDown` to inherit `text-current` and use `group-data-[state=open]:text-white` so they flip white when open. Strip any remaining `rounded-xl border` from individual `Collapsible` wrappers in the Personal and Medical tabs so only the outer table frame shows.
- `src/pages/MyPractice.tsx` — apply the same `data-[state=open]:bg-primary` + white-descendant treatment to the `AboutMeAccordion` trigger and to every `AccordionTrigger` in the Practice tab (Personal, Practice Details, Shared Calendar, Service Pricing, Signature, Voice). No per-item borders (already removed).
- `src/features/patients/components/EmergencyContactsInline.tsx` — same treatment on its `CollapsibleTrigger` so it matches its neighbours in the Personal frame.
- `src/pages/MySessions.tsx` (patient) — remove per-item `border border-primary-dark/40 rounded-lg` from each `AccordionItem`; wrap the whole `Accordion` in the shared `rounded-xl border border-neutral-400 divide-y divide-neutral-300 overflow-hidden` frame; apply the green/white expanded-header treatment.
- `src/pages/Sessions.tsx` (doctor, lines ~1645-1674) — same: wrap the "Last Week" + monthly `Accordion` in the shared table frame and apply the green/white expanded-header treatment.

### Technical notes
- Radix propagates `data-state` on the trigger, so Tailwind variants `data-[state=open]:*` on the trigger and `group-data-[state=open]:*` on descendants are sufficient — no JS state needed.
- Only the expanded-header colour is touched. Closed-state look, content, spacing, ordering, and default open/closed values stay as they are.

---

## Part 2 — To-Do List regrouped by patient

**Applies to:** the full To-Do List page (`src/pages/TodoList.tsx`) and the home-page compact list (`src/components/todos/CompactTodoList.tsx`).

### Visual target
- Remove the icon legend recently added (`TodoLegend`) from both surfaces.
- Group tasks by **patient name** (fallback bucket "Unassigned" for tasks with no patient).
- Each patient becomes a **collapsed accordion row** by default. Header shows only the patient's name and the task count.
- Patient rows are separated by a **thin grey line** (`divide-y divide-neutral-300`) — no cards, no rounded borders around each patient.
- When expanded, the existing `TodoRow` renders for each task with the icon, document/task-type label, and metadata (date, time, duration) visible inline — so the previously hidden context comes back on demand.
- For **Appointment** tasks specifically, replace the current preview icon in the actions column with two controls: **"Preview Calendar"** (opens the calendar view scoped to that appointment's date) and **"Edit / Accept"** (opens the appointment editor / confirms it). These sit in the row's action cluster alongside the existing overflow menu.

### Files
- `src/components/todos/TodoLegend.tsx` — no longer imported from the two consumers; keep the file (used nowhere else) or delete it. Plan: remove imports; leave file in place for now.
- `src/pages/TodoList.tsx` — build a `groupBy(patient)` map from the current list, render one `Accordion` (`type="multiple"`, `defaultValue={[]}`) wrapped in the shared `rounded-xl border border-neutral-400 divide-y divide-neutral-300 overflow-hidden` frame; each `AccordionItem` = one patient. Reuse `TodoRow` inside the content. Drop the `<TodoLegend />` render.
- `src/components/todos/CompactTodoList.tsx` — same grouping treatment at a compact scale (smaller trigger padding, `compact` prop already exists on `TodoRow`). Drop the `<TodoLegend />` render.
- `src/components/todos/TodoRow.tsx` — extend the actions cluster: when `display.kind === "appointment"`, render two icon buttons before the overflow menu:
  - **Preview Calendar** (`CalendarDays` icon) → new optional prop `onPreviewCalendar(todo)`; wires to a navigation helper that opens `/calendar?date=<due_date>` (or the patient calendar for patient view).
  - **Edit / Accept** (`CheckCircle` icon) → new optional prop `onAcceptAppointment(todo)`; opens the existing appointment edit dialog for that todo's linked appointment or marks it accepted if already scheduled.
- `src/pages/TodoList.tsx` and `src/components/todos/CompactTodoList.tsx` — implement the two handlers, mapping the todo → appointment. For doctors, calendar route is `/calendar`; for patients, `/patient/calendar`. Determine role via the existing role hook already used on each page.

### Grouping details
- Group key: `todo.patient_name || display.patient || "Unassigned"` (same helper used by `TodoRow` today).
- Sort groups: patients alphabetically, then "Unassigned" last.
- Inside each group, keep current sort order (priority + due date) as-is.

### Out of scope
- No changes to how todos are created, edited, or persisted.
- No new icons or colour tokens; reuse existing lucide icons and semantic classes.
- No changes to non-appointment task actions.
