

# Patient Experience Improvements

## Issues to Fix

1. **My Doctors page missing specialty badge** — The `DoctorAccess` interface in `MyDoctors.tsx` fetches `specialty` from profiles and displays it with `getSpecialtyColor`, so this should work. Need to verify the query is correct (it does select `specialty`). The issue is likely working — will double-check.

2. **Patient Dashboard missing specialty badge on Healthcare Providers** — The `DoctorAccess` interface (line 28-35) only fetches `full_name` and `practice_number` from profiles. It does NOT fetch `specialty`. Need to add `specialty` to the profile query and display the color-coded specialty badge.

3. **Patient Calendar appointments should show doctor name, appointment type, and cost** — Currently `PatientCalendar.tsx` only fetches `appointments.*`. Need to join with doctor profile (via `user_id`) to show doctor name, and join with `appointment_requests` + `service_prices` to show service type and cost.

4. **Moolas count should be most prominent on dashboard** — Currently the Moolas badge is small in the header. Make the Moolas stat a prominent, visually distinct card at the top of the stats grid.

5. **Assigned Tasks section on dashboard** — Add a compact "Assigned Tasks" section to the patient dashboard so patients see pending tasks from doctors immediately, with a link to the full rewards page.

6. **Dashboard buttons inconsistent styling** — The Quick Actions cards use plain Card styling. Update to use consistent button/card styling matching the brand (primary color accents, consistent rounded corners).

## Plan

### File: `src/pages/patient/PatientDashboard.tsx`

**A. Fetch specialty in doctor profiles query (line 155)**
Change `select("full_name, practice_number")` to `select("full_name, practice_number, specialty")`. Update the `DoctorAccess` interface to include `specialty: string | null`.

**B. Display specialty badge on each doctor card (lines 414-438)**
After the doctor's name, render a color-coded `Badge` with specialty text (reuse the `getSpecialtyColor` function from `MyDoctors.tsx` — extract or duplicate).

**C. Make Moolas prominent**
Replace the current small header badge with a large, visually prominent Moolas card as the first item in the stats grid (or as a separate hero-style card above the stats). Show the count large with the Ⓜ️ icon and a "View Rewards" link.

**D. Add Assigned Tasks section**
After the Moolas section, add a compact card showing pending tasks assigned by doctors (fetch from `todos` where `patient_id` matches and `status = 'pending'`). Show task title, moolas reward, and due date. Link to `/patient/rewards` for full view.

**E. Consistent button/card styling**
Update Quick Action cards to use `border-primary/20` accent, ensure hover states and rounded corners match the brand standard.

### File: `src/pages/patient/PatientCalendar.tsx`

**A. Fetch doctor name for each appointment**
After fetching appointments, look up the doctor's profile using `user_id` from each appointment. Display "with Dr. [Name]" on each appointment card.

**B. Show appointment type and cost**
Join with `appointment_requests` (matching by time/patient) to get `service_id`, then look up `service_prices` for service name and cost. Display as badges/text on the appointment card.

### File: `src/pages/patient/MyDoctors.tsx`

Verify the specialty badge is rendering — the code already has `getSpecialtyColor` and renders the badge. The issue may be that doctors don't have a specialty set in their profile, or the `role` filter in search prevents display. No code change likely needed here since the existing code already shows specialty badges on `DoctorCard`.

## Files Modified

| File | Change |
|------|--------|
| `src/pages/patient/PatientDashboard.tsx` | Add specialty to doctor query; show specialty badges; make Moolas prominent; add Assigned Tasks section; fix button styling |
| `src/pages/patient/PatientCalendar.tsx` | Show doctor name, appointment type, and cost on appointment cards |

