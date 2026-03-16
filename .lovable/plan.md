

# Four Changes: "ME" Patient, Partner Invite Icon, To-Do Tab Order, Dashboard Record Shortcut

## 1. Add "ME" as first patient in the list

**File:** `src/pages/Patients.tsx` (lines 104-114)

After sorting patients alphabetically, check if any patient has the same `patient_user_id` as the current user (or same email). If not found among existing patients, create a synthetic "ME" entry. Either way, move the doctor's own record to the top of the list before grouping.

- Import `useAuth` to get the current user ID
- In the sorting logic, partition: extract the "self" patient (where `patient_user_id === user.id`), then prepend it before the alphabetically sorted list
- Display the name as the patient name but with a "ME" badge next to it

## 2. Change partner "Invite to App" icon from Mail to a different icon

**File:** `src/pages/Profile.tsx` (line 966)

Replace `<Mail className="h-4 w-4" />` with `<Users className="h-4 w-4" />` (or `UserPlus` from lucide-react) to differentiate the "Invite to App" action from a regular email action. `UserPlus` is the most semantically appropriate icon.

- Import `UserPlus` from lucide-react (line 2)
- Replace `<Mail>` with `<UserPlus>` on line 966

## 3. Reorder To-Do filter tabs: Active → Completed → All

**File:** `src/pages/TodoList.tsx` (line 620)

Change the array from `["all", "active", "completed"]` to `["active", "completed", "all"]` and set default `filter` state to `"active"` (line 76).

## 4. Add "Record a Task" shortcut icon on Dashboard

**File:** `src/pages/Dashboard.tsx`

Add a microphone button in the header area (near the notification bell) that links to `/todos` with a query param or simply navigates to the To-Do page. Use a `Mic` icon from lucide-react with a tooltip "Record a Task".

- Import `Mic` from lucide-react
- Add a `<Link to="/todos">` button with `<Mic>` icon next to the notification bell (before line 181)

