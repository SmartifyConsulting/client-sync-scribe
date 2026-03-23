

# Multi-Feature Plan

## 1. Add To-Do for Patient in Nav Bar (under My Calendar)

**Files:** `src/components/layout/Sidebar.tsx`, `src/components/layout/BottomNav.tsx`

- Add `{ icon: CheckSquare, label: "To-Do List", to: "/patient/tasks" }` to `patientNavItems` array, positioned after "My Calendar"
- Update `PatientTasks` page (`src/pages/patient/PatientTasks.tsx`) to render an actual To-Do list instead of redirecting to rewards (or create a new patient-specific todo page)
- Add to `BottomNav` patient items as well

## 2. Make Profile Pic Border Teal (not red)

**Files:** `src/components/layout/Sidebar.tsx`, `src/components/layout/TopBarIcons.tsx`

- **Sidebar line 144:** Change `border-[hsl(351,81%,49%)]` to `border-primary`
- **TopBarIcons:** Avatar already uses `border-primary` — no change needed

## 3. Patient "Share App" with Moola Reward on Subscription

The Share App dialog and `send-user-invitation` edge function already exist. The missing piece is awarding Moolas when the referred user becomes a paying subscriber.

**Files:** `supabase/functions/paypal-subscription/index.ts` (or wherever subscription activation is handled)

- When a new subscription is activated, check if the subscribing user was referred (look up `user_invitations` where `recipient_email` matches and `status = 'accepted'`)
- If a referrer is found, award Moolas to both the referrer and the new subscriber via inserting into `doctor_rewards` or `patient_rewards` depending on their role
- Also add Share App button to patient sidebar/nav or ensure it's accessible from patient views (it's already on the Holarchive page)

## 4. Standardize Medical Information Fields to Label + Input Format

**File:** `src/components/patients/PatientDetailsEditor.tsx` (view mode, lines 530-612)

Currently "Physical Measurements", "Blood Type", "Allergies", etc. use custom layouts (colored boxes, plain text). Change all to use the standard `ViewField` pattern (Label above disabled Input):

- **Physical Measurements:** Replace the icon boxes with `ViewField` for Height, Weight, BMI
- **Blood Type:** Replace plain `<p>` with `ViewField`
- **Allergies:** Replace custom box with `ViewField`
- **Chronic Medication:** Replace badge with `ViewField` (value: "Yes - Chronic" or "No")
- **Surgeries:** Keep as list but ensure sub-heading is a Label
- **Family History:** Same treatment
- **Organ Donor:** Replace with `ViewField` (value: "Yes" or "No") plus organ list below

## 5. Add "My Round Tables" Tab for Doctors (in My Practice)

**Files:** `src/pages/MyPractice.tsx`, new component `src/components/doctor/DoctorRoundTables.tsx`

- Add a new tab `"My Round Tables"` in MyPractice, positioned before "Templates"
- Create `DoctorRoundTables` component that:
  - Queries `round_table_notes` for all `patient_id`s where the doctor has contributed (doctor_id = current user)
  - Groups by patient, shows patient name, latest note date, descending order
  - Shows an alert icon (bell/dot) on round tables that have new unread notes (notes by other doctors that aren't in `round_table_reads`)
  - Clicking a round table navigates to the patient's profile round table tab
- **Notifications:** When a new round table note is added (in `RoundTable.tsx` handleSubmit), insert a notification for all other doctors who have contributed to that patient's round table

## 6. Fix: Accepted Request Not Creating Patient Record

**File:** `src/components/doctor/DoctorAccessRequests.tsx`

The `handleAcceptRequest` function (line 118-175) already creates a patient record. The issue may be:
- The `email` field is not populated on the patient record (the query only fetches `full_name, mobile_number` from profiles)
- Or the patient record is created with `user_id: user.id` (doctor) and `patient_user_id: patientUserId` but the patient's email from their profile is not being pulled

Need to verify the actual data. The code looks correct — it checks for existing patient and creates one if missing. Possible issues:
1. The `profiles` query at line 154 might fail silently (`.single()` on no result)
2. The patient's `full_name` in profiles might be null

**Fix:** Change `.single()` to `.maybeSingle()` and add email fetch. Also add error handling for the patient insert to surface any issues.

---

## Files Modified Summary

| File | Change |
|------|--------|
| `src/components/layout/Sidebar.tsx` | Add To-Do nav item for patients, fix avatar border to teal |
| `src/components/layout/BottomNav.tsx` | Add To-Do nav item for patients |
| `src/components/layout/TopBarIcons.tsx` | Verify avatar border is teal (already correct) |
| `src/pages/patient/PatientTasks.tsx` | Replace redirect with actual todo list page |
| `src/components/patients/PatientDetailsEditor.tsx` | Standardize medical info fields to ViewField format |
| `src/pages/MyPractice.tsx` | Add "My Round Tables" tab before Templates |
| `src/components/doctor/DoctorRoundTables.tsx` | New component: list all round tables doctor contributed to |
| `src/components/patients/RoundTable.tsx` | Add notification creation when posting a note |
| `src/components/doctor/DoctorAccessRequests.tsx` | Fix patient creation on accept, add email, improve error handling |
| `supabase/functions/paypal-subscription/index.ts` | Award Moolas to referrer when referred user subscribes |

