# Shift Calendar, My Shift and Nurse Profiles

Scope: staff scheduling and nurse users only. The admissions/inpatient merge and the tabbed admission detail redesign are explicitly excluded.

## 1. Shift Schedule becomes a calendar

Replace the current day-grouped list on the hospital Shift Schedule screen with a weekly calendar the administrator can work in directly.

- Week grid: 7 day columns x 3 shift rows (Day, Night, On-Call), with prev/next week and "This week" controls.
- Each cell shows the assigned staff chips for that day and shift band, colour-coded by role (doctor vs nurse) and marked when the person is clocked in.
- Click an empty cell to open the assign dialog pre-filled with that date and shift band; click a chip to view/clock/remove.
- Drag a staff member from the availability rail onto a cell to assign.

### Availability rail

A side panel listing every doctor and nurse attached to the hospital, showing for the selected week:
- total scheduled hours,
- their next shift,
- an availability state: Free / Scheduled / Off-duty (already working that band).

Staff already booked in the same band on that day are greyed out and cannot be dropped there.

## 2. Eight-hour rest warning

Before saving an assignment, check the staff member's most recent shift end. If the gap to the new start is under 8 hours, show a blocking confirmation:

> Staff member has less than 8 hours rest since their previous shift (ends 22:00, next starts 06:00 — 8h gap). Assigning this shift creates a double shift or short turnaround.

The scheduler must tick an acknowledgement and can add a note. Only then does the save proceed, and the acknowledgement is stored on the shift record and shown as a warning badge on the calendar chip.

## 3. My Shift for doctors and nurses

- Doctors: add "My Shift" to the doctor sidebar directly under Sessions, at `/my-shift`.
- Nurses: "My Shift" is the primary item in the nurse sidebar.
- The screen shows upcoming/current shifts with clock in/out, plus the patients the person is personally responsible for — reusing the existing provider My Shift screen so all three portals stay identical.

## 4. Nurse profiles

- Nurses become a first-class user type: a nurse signs in and gets a nurse sidebar (My Shift, My Patients, My Profile) instead of the doctor or patient menu.
- Role resolution learns the nurse role so nurse accounts route correctly.
- A seeding routine provisions a demo nurse login linked to an existing nurse record at Holarc General Hospital.
- The demo nurse is added to the avatar profile switcher so you can jump into the nurse view in one click.

## Technical notes

- Migration: add `rest_ack_by`, `rest_ack_at`, `rest_ack_note` and `notes` to `hospital_staff_shifts`.
- New `ShiftCalendar` component under `src/modules/holarchelp/components/`, consumed by `ShiftsScreen.tsx`; availability and rest-gap logic in a `shiftScheduling.ts` helper built on the existing `useHospitalShifts` data.
- Rest-gap check runs client-side against the loaded roster before the insert.
- New edge function `seed-nurse-user` (mirrors `seed-test-er-user`): creates the auth user, profile, `user_roles` row with `nurse`, and links it to a `hospital_nurses` record via `linked_user_id`.
- `useUserRole.ts` gains `nurse` as a resolved role and an `isNurse` flag; `Sidebar.tsx` gains a nurse nav list; `App.tsx` gains the `/my-shift` route; `testProfiles.ts` gains the nurse entry.
