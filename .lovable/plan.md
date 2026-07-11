# To-Do List Row Redesign

Restyle the task rows in **`src/pages/TodoList.tsx`** (full page) and **`src/components/dashboard/CompactTodoList.tsx`** (dashboard widget) so every task lives on one line, leads with a task-type icon, and uses compact icon-prefixed metadata chips instead of long sentences. Inspired by Microsoft To Do / ClickUp / Outlook.

## 1. New shared helper: `src/lib/todoDisplay.ts`

Single source of truth so both list surfaces render identically.

Exports:
- `type TodoKind = "invoice" | "prescription" | "appointment" | "follow_up" | "recommendation" | "medical_certificate" | "referral" | "laboratory" | "email" | "phone" | "meeting" | "payment" | "claim" | "reminder" | "urgent" | "task"`
- `getTodoDisplay(todo)` → `{ kind, icon: LucideIcon, shortLabel: string, patient?: string, date?: string, time?: string, duration?: string }`

Logic:
- Detect kind by matching the stored English title (same regexes as `translateTodoTitle.ts`) plus `task_type` and `template_name` hints (e.g. `Medical Certificate`, `Referral`, `Laboratory`, `Follow-up`).
- Shorten label: `"Review Invoice — Sharon Kennedy"` → `"Invoice"`; `"Schedule appointment with Sarah Johnson on 2026-06-08 (30 min)"` → `"Appointment"`. Use `t("todo.nouns.*")` for i18n so we keep translations working.
- Extract `patient` from `todo.patient_name`, and if absent, from the tail of the title after `—` / `-` / `with` / `for`.
- Extract `date`/`time`/`duration` from `todo.due_date` first, else parse from the title (`YYYY-MM-DD`, `HH:mm`, `(30 min)`). Format date as `d MMM` and time as `HH:mm` via `date-fns`.
- Icon map (lucide-react, no emoji glyphs — keeps design-token color control):
  `Receipt` invoice, `Pill` prescription, `CalendarDays` appointment, `Phone` follow-up, `FileText` recommendation, `Stethoscope` medical_certificate, `FlaskConical` laboratory, `ArrowUpRight` referral, `Mail` email, `Users` meeting, `CreditCard` payment, `Hospital` claim, `Bell` reminder, `AlertTriangle` urgent, `CheckSquare` fallback task.

## 2. New row component: `src/components/todos/TodoRow.tsx`

One flex row, `text-sm` (14px, matching Last-Session briefing text), aligned via fixed-width columns:

```
[checkbox] [kind icon] [Short label ..............] [👤 name] [📅 4 Jun] [🕗 08:00] [⏱ 30 min]  [👁] [⋮]
```

Layout details:
- Container: `flex items-center gap-3 py-2 px-2 rounded-md hover:bg-muted/40 group text-sm`
- Kind icon: `h-4 w-4 text-primary shrink-0`
- Label: `flex-1 min-w-0 truncate font-medium` (ellipsis only when unavoidable)
- Meta chips (only rendered when present): `inline-flex items-center gap-1 text-muted-foreground shrink-0` — `User`, `CalendarDays`, `Clock`, `Timer` icons at `h-3.5 w-3.5`
- Actions cluster (`shrink-0`):
  - `Eye` preview button — only when `todo.document_id`
  - Overflow `MoreVertical` → shadcn `DropdownMenu` with: Edit, Send (only if `document_id`), Duplicate, Mark complete / Reopen, Delete (destructive). Removes today's separate Approve / Send / Edit / Delete buttons.
- Priority: keep priority as a small colored dot on the checkbox side (`h-2 w-2 rounded-full` in low/med/high tokens) so a chip isn't needed on the row; full picker moves into the overflow menu → "Priority" submenu.
- AI badge: replace the `AI` pill + `Sparkles` with a single `Sparkles` icon at row start when `is_auto_executed`, tooltip "AI-generated".
- Edit mode: existing inline `Input` + save/cancel preserved.

Responsive (Tailwind):
- `< sm`: hide `User` icon (leave name text), hide duration, then hide time. Label never hides.
- `< md`: hide duration chip only.
- `≥ md`: show everything.
- Implemented with `hidden sm:inline-flex` / `hidden md:inline-flex` on the chip wrappers.

Props: `{ todo, onToggle, onEdit, onDelete, onDuplicate, onSend, onPreview, onOpenPriority, isEditing, editText, setEditText, saveEdit, cancelEdit, sending, previewing }`.

## 3. Wire into pages

**`src/pages/TodoList.tsx`**
- Replace the entire row `<div>` (lines ~511-598 inside the grouped-date map) with `<TodoRow …/>`.
- Keep grouping, collapsibles, filter tabs, add-task form untouched.
- Add `duplicateTask(todo)` handler (insert copy of `title`/`priority`/`patient_id` with `status: 'pending'`).
- Remove now-unused per-row imports (`Flag`, priority Badge chip, `Calendar` inline formatter block). Keep priority dropdown by wiring `onOpenPriority` to existing `updatePriority`.

**`src/components/dashboard/CompactTodoList.tsx`**
- Replace the `filteredTodos.map` row body (lines ~424-518) with `<TodoRow compact …/>`.
- Add a `compact` prop to `TodoRow` that:
  - Uses `text-sm` still (design goal is bigger, not smaller) but drops `py-2` to `py-1.5`.
  - Hides date+duration chips by default on the dashboard (compact real estate), keeps patient + time.
- Ensure the widget's container isn't force-shrinking children (`min-w-0` on the row already handles truncation).

## 4. i18n additions (`src/i18n/locales/en.json` + existing locales)

Add:
- `todo.kinds.invoice` = "Invoice"
- `todo.kinds.prescription` = "Prescription"
- `todo.kinds.appointment` = "Appointment"
- `todo.kinds.followUp` = "Follow-up"
- `todo.kinds.recommendation` = "Recommendation"
- `todo.kinds.medicalCertificate` = "Medical certificate"
- `todo.kinds.referral` = "Referral"
- `todo.kinds.laboratory` = "Laboratory"
- `todo.kinds.email` = "Email"
- `todo.kinds.phone` = "Phone call"
- `todo.kinds.meeting` = "Meeting"
- `todo.kinds.payment` = "Payment"
- `todo.kinds.claim` = "Claim"
- `todo.kinds.reminder` = "Reminder"
- `todo.kinds.urgent` = "Urgent"
- `todo.kinds.task` = "Task"
- `todo.actions.edit/send/duplicate/delete/markComplete/reopen/priority`

Non-English locales get English fallback initially; translations follow the existing `translateTodoTitle` pattern.

## 5. Verification

- `bunx tsgo` for type check.
- Playwright script at `/tmp/browser/todo-redesign/` logs in with injected Supabase session, navigates `/todo-list` and `/doctor-dashboard`, screenshots at 1280×1800 and at 640×1200 to confirm:
  - Every row is single-line (`overflow: hidden` + no wrap).
  - Font renders at 14px (`text-sm`) matching the briefing.
  - Overflow menu opens with the five items.
  - At 640px width the User icon and duration chip disappear as specified.

## Out of scope
- No changes to backend, RLS, edge functions, or `todos` schema.
- No changes to add-task form, tabs, grouping, or AI processing.
- Patient portal `PatientTasks.tsx` unchanged (separate reward-focused UX).
