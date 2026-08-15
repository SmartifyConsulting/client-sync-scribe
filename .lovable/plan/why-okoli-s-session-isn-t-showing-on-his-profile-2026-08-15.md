# Why Okoli's session isn't showing on his profile

## What the data shows

The session did save. It was recorded today (15 Aug, 08:24 UTC, 13 min, transcript + AI summary present) by Dr Dean Allie.

The problem is that Samuel Okoli has **two patient records** pointing at the same login account (`25cd5e3c-…`):

| Patient record | Name | Sessions attached |
|---|---|---|
| `c0f7f3b4-…` (created 11 Jul 14:09) | `samuel 0koli` (typo, zero instead of "O") | 5, including today's |
| `b50768b3-…` (created 11 Jul 14:42) | `Samuel Okoli` | 0 |

Sessions are stored in the `sessions` table keyed by `patient_id`, and the profile's Sessions tab lists sessions filtered by the patient record you opened. Today's session is attached to the `samuel 0koli` record, so opening the correctly spelled `Samuel Okoli` record shows an empty list.

## Fix

1. **Merge the duplicates.** Re-point every child row that references `c0f7f3b4-…` (sessions, documents, prescriptions, invoices, todos, admissions, appointments, activity logs, rewards, streaks, etc.) to the surviving record `b50768b3-…` (`Samuel Okoli`), then delete the `samuel 0koli` duplicate. Done as one migration inside a transaction so nothing is orphaned.
2. **Verify** the Sessions tab on Samuel Okoli then lists all 5 sessions including today's, and the patient's own login shows the same history.
3. **Prevent recurrence:** add a partial unique index so one auth account can only have one active patient record (`unique (patient_user_id) where status <> 'archived'`), and have patient-record creation reuse an existing record for that account instead of inserting a second one.

## Technical notes

- Survivor choice: keep `b50768b3-…` because the name is spelled correctly. If you'd rather keep the record that already holds the history, we keep `c0f7f3b4-…` and just correct its name to `Samuel Okoli` — fewer rows moved, lower risk. Say which you prefer; otherwise I'll take the lower-risk option (rename the record holding the data, delete the empty one).
- No UI changes needed — the Sessions tab query is correct.
