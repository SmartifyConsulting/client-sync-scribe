# Fix: Nomvula's nurse Dashboard and Shifts are empty

The seeded ward data exists, but Nomvula cannot see it. Two separate causes, both verified against the database.

## Cause 1 — she is not recognised as hospital staff

Access to wards and admissions is gated by a `is_hospital_staff` check that only counts the hospital owner and rows in the hospital members table. Nomvula's user is on the nursing roster (linked, ward = General A) but has no hospital member row, so:

- the ward record is unreadable → header shows "no ward assigned yet"
- all 8 General A admissions are filtered out → "Patients in ward 0", empty Recent admissions and Ward patients lists
- ward colleagues' shifts are hidden → "Nobody clocked in"

Fix: make a linked nurse count as hospital staff. Update the staff check so a user linked on the hospital's nursing roster is treated as staff (ward-level scoping already limits nurses to their own ward, so this does not widen a nurse's reach beyond General A). This fixes every nurse on the roster, not just Nomvula.

## Cause 2 — her shifts are in the past and in the wrong ward

Her only shifts start Aug 4, 6 and 7, and the two "active" ones are attached to ICU, not General A. The dashboard and My Shifts only look at the current window, so the Aug 17–23 calendar is blank.

Fix: reschedule her demo shifts onto the current week in General A — one completed yesterday, one in progress right now (clocked in), plus upcoming day/night shifts across the rest of the week. Also move a colleague nurse's overlapping General A shift into the same window so "On shift now" is populated.

## Result after the fix

- Dashboard header: Holarc General Hospital · General A
- Patients in ward: 8, Assigned to me: 4, Shift: current time range with "on duty"
- On shift now and Recent admissions panels populated
- My Shifts calendar shows this week's morning/night/standby entries

## Technical notes

- One migration: redefine `public.is_hospital_staff` to also match `hospital_nurses.linked_user_id`; ward scoping stays with `can_see_ward`.
- One data update: shift the demo `hospital_staff_shifts` rows for Nomvula (`bd493577…`) and Pieter van Wyk to the current week and to ward `a0000000-…-0002`, with correct `status` / `clocked_in_at` values.
- No frontend changes required.
