## Calendar/appointments + documents pagination + mobile pass

### Part A — Appointment modal (file: `src/pages/CalendarView.tsx`)

The create/edit/delete flow already exists end-to-end; the actual bugs are scoped to the picker, the time dropdown's z-index inside the Dialog, conflict detection, and consistency in the edit modal.

**Date picker**
- Control the `Popover` with `useState` so it stays open until a valid pick.
- Pass `disabled={{ before: startOfToday }}` to `<Calendar>` so past dates are visually disabled and unselectable.
- In `onSelect`, reject any date before today with toast "Cannot schedule appointments in the past"; on a valid pick, set state and close the popover.
- Change the trigger label format to `MM/dd/yyyy` (e.g. `06/18/2026`).

**Time dropdown**
- Add `className="z-[100] bg-popover max-h-[260px]"` to `<SelectContent>` so it renders above the Dialog. This is the root cause of "no options appear".
- `disabled={!newAppointment.date}` on the Time `<SelectTrigger>` until a date is chosen.
- Keep existing 15-min 7 AM–6 PM slots (superset of the requested 30-min 8 AM–5 PM range).
- In the edit modal, replace the free-text time `<Input>` with the same `<Select>` of slots so editing is consistent and conflict-aware.

**Conflict detection (new)**
- Helper `fetchConflicts(date, patientId, ignoreId?)`: query `appointments` for that patient on that date.
- `useEffect` recomputes a `Set<string>` of blocked `HH:MM` values whenever date or patient changes (each existing booking blocks its own slot + the next, for the 30-min default duration). Same effect inside the edit modal, passing the current event id as `ignoreId`.
- Render conflicting `<SelectItem>`s as `disabled` with " — booked" appended to the label.
- In `handleCreateAppointment` / `handleSaveEvent`, re-check server-side before insert/update; on conflict toast "<Patient> already has an appointment at <time>. Please select a different time." and bail.

**Create / Edit / Delete (already wired — verify only)**
- Insert + optimistic event list + dialog close + toast: keep as-is, add conflict check.
- Edit modal pre-fills from `editedEvent`, "Edit Event" toggle, `handleSaveEvent` updates row + list.
- `handleDeleteEvent` has confirmation `AlertDialog`. Update its copy to include patient + date + time: "Are you sure you want to delete this appointment with {title} on {date} at {time}?"

### Part B — Documents list pagination

Three pages render long document lists and need the same treatment:
`src/pages/Documents.tsx`, `src/pages/patient/PatientDocuments.tsx`, `src/pages/doctor/DoctorDocumentsTab.tsx`.

For each:
- Add `const PAGE_SIZE = 10` and a `visibleCount` state initialised to 10.
- Slice the filtered list to `visibleCount` before mapping.
- Render a "Load More" button under the list when `visibleCount < total`, showing `(visibleCount of total)` and a small spinner while the next page mounts.
- "Load More" simply increments `visibleCount` by 10 — no extra fetch needed because the queries already return the full set. (If a list later moves to range-based fetching, swap to `.range(from, to)` without changing the UI.)
- Reset `visibleCount` to 10 whenever search/filter inputs change.

### Part C — Mobile responsiveness pass (390 / 768 / 1024)

Scope: appointment modal + calendar grid + dropdowns referenced above. Keep changes presentational.

**Appointment Dialog**
- `DialogContent` classes: `max-w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto p-4 sm:p-6`.
- Replace `grid grid-cols-2` for Date/Time and any other 2-col rows with `grid grid-cols-1 sm:grid-cols-2 gap-3`.
- Force min tap target on triggers/buttons: add `min-h-11` (44px) to date/time triggers and footer buttons.
- Calendar inside popover: add `[--cell-size:2.75rem]` (or equivalent class) so day cells are ≥44px on touch.

**CalendarView grid**
- Wrap month/week grid in `overflow-x-auto` with `min-w-[640px]` so it scrolls horizontally on narrow screens rather than collapsing.
- Prev/Next month buttons → `size="icon"` with `h-11 w-11`.
- Day cells → `min-h-[64px]` on mobile, `sm:min-h-[96px]` on desktop, so dots/badges remain visible.

**Dropdown menus / Select**
- Apply the same `z-[100] bg-popover` and `max-h-[60vh]` to any `SelectContent`/`PopoverContent` used inside Dialogs in `CalendarView.tsx` so they don't open off-screen.
- Default `SelectItem` is already 36px; bump to `py-3` (≈44px) when rendered on mobile via responsive class.

**QA checklist (manual via the device toolbar in the preview)**
- 390px: Book → modal fits with 5% side padding, fields stack, date picker opens on tap, time list scrolls, calendar grid scrolls horizontally.
- 768px: Modal centred at `max-w-lg`, two-column Date/Time row reappears, calendar grid fits without scroll.
- 1024px: Layout matches current desktop, no regressions.

### Out of scope
- No schema migrations.
- No business-logic changes outside the calendar page and the three documents pages.
- Server-side range pagination for documents is deferred — the UI hook is in place so we can swap the data source later without UI changes.