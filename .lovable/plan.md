# Add status workflow to Report Fix cards

## Statuses
`Logged` (default) → `In Process` → `Review` → `Closed`

New reports default to `Logged` (replacing today's `open`). The existing `done` value is migrated to `Closed`.

## Who can change status
Only admins (resolved via `has_role(auth.uid(), 'admin')`) can change status. Georgia Adams holds admin role, so this gates it to her (and any future admin). The current update RLS policy already supports admin-only edits for non-owners; we'll tighten the UI accordingly.

## UI changes — `src/components/feedback/ReportFixSheet.tsx`

On each card (Bug / Fix / Nice-to-have):
- Show a small **status pill/button** next to the type chip, color-coded:
  - Logged = neutral, In Process = amber, Review = blue, Closed = green
- Underneath the pill, show a **timestamp** ("Logged 2h ago", "Moved to In Process 5m ago", etc.) using the most recent status change time.
- Replace the current green check button with:
  - **Admin view (Georgia / any admin):** clicking the status pill opens a dropdown to pick the next status. Saves to DB.
  - **Non-admin view:** status pill is read-only (no dropdown, no hover).
- Update the outstanding-list filter: show all reports where `status != 'Closed'` (instead of `status = 'open'`). Add a small "Show closed" toggle so admins can review history.
- Use `useUserRole()` to detect admin (`hasAdminRole`).

## Database — `bug_reports` table

Migration:
1. Add column `status_changed_at timestamptz NOT NULL DEFAULT now()`.
2. Backfill: set existing `open` rows → `Logged`, existing `done` rows → `Closed`. Set `status_changed_at = updated_at`.
3. Change `status` default to `'Logged'`.
4. Add a trigger `bug_reports_touch_status_changed_at`: on UPDATE, if `NEW.status IS DISTINCT FROM OLD.status` then `NEW.status_changed_at = now()`.
5. Tighten UPDATE RLS so non-admin owners cannot change `status` (they can only edit their own title/description). Keep admin able to update all fields.

## Out of scope
- No status history table (only the latest change timestamp is shown, per request).
- No notifications / emails on status change.
- No edits to non-admin permissions for creating reports.
