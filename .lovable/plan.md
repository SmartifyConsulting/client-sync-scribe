# Match To-Do and Round Table styling on the Dashboard

Two alignment changes so both dashboard panels read as one design.

## 1. To-Do records styled like Round Table cards

Round Table entries render as a self-contained card row: rounded-xl bordered card, circular tinted icon badge on the left, bold title line with optional badge, muted meta line underneath, and a trailing action icon.

To-Do rows inside the patient accordion currently render as flat compact rows. They will adopt the same card treatment:
- Rounded-xl border card with `bg-card`, hover highlight, same vertical padding and gap.
- Left circular icon badge (task/document type icon) matching the round-table icon circle.
- Task title as the bold line, with priority/status badges inline.
- Muted secondary line for the meta (patient, date, task type).
- Existing row actions (complete, edit, preview, send, assign, delete) stay in place, aligned right.

Only the presentation changes — no change to task data, filters, grouping or actions.

## 2. Round Table accordion headings match the To-Do headings

The To-Do date headings use: always-green header bar, calendar icon, `text-sm font-semibold` label, count pill pushed to the right, `px-3 py-2` padding, and groups spaced apart rather than fused in one frame.

The dashboard "My Round Tables" list (rendered through the shared list toolbar) will use the same heading treatment: same icon-plus-label layout, same padding, same count pill placement, same spacing between groups.

## Technical notes

- `src/components/common/ListGroupToolbar.tsx`: add optional `headerIcon` and `triggerClassName`/`frameless` props so callers can match the To-Do heading layout without changing other consumers' current look (defaults unchanged).
- `src/components/doctor/DoctorRoundTables.tsx`: pass the calendar icon and matching trigger classes when rendering on the dashboard.
- `src/components/todos/TodoRow.tsx`: extend the `insideGroup`/`compact` variant with the card layout (rounded-xl border, icon circle, title + meta line). Reuse the classes already used by the round-table entry so the two stay in sync.
- No backend, query, or business-logic changes.
