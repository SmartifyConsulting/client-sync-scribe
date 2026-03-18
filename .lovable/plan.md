

# Multi-Feature Update Plan

## 1. Doctor Specialty Badge under My Doctors

**File: `src/pages/patient/MyDoctors.tsx`**

Add a coloured `Badge` below the doctor's name showing their specialty. Map common specialties to Tailwind colours with a teal fallback.

## 2. Remove "Patient Information" from permissions display

**File: `src/pages/patient/MyDoctors.tsx`** (lines ~143-153)

Keep the "Access granted to" section but filter out `patient_information` (or equivalent key) from the displayed permissions array. The patient has already granted access, so showing "Patient Information" is redundant. All other permissions (Calendar, Session Summaries, Prescription History, Round Table) remain visible.

## 3. Rename "Transfers" → "Moolas" and reorder after History

**File: `src/pages/patient/MyRewards.tsx`**

- Rename the "Transfers" tab label to "Moolas"
- Reorder tabs: Overview → Assigned Tasks → Chronic Meds → Milestones → Streaks → History → Moolas

## 4. Hide top stats when doctor views their own patient record

**File: `src/pages/PatientProfile.tsx`**

Hide the stats grid when `patient.patient_user_id === currentUserId`.

## 5. Calendar sync with real appointments

**Files: `src/components/dashboard/UpcomingAppointments.tsx`, `src/pages/CalendarView.tsx`**

Replace mock/fake appointment data with real queries to the `appointments` table filtered by date.

## 6. Auto-guess visit category for Moola awarding

**File: `src/components/sessions/VisitCategoryDialog.tsx`**

- Accept `transcript` prop, use keyword matching to pre-select the most likely visit category
- Auto-focus the confirm button so doctor can just press Enter
- Doctor can still change selection if guess was wrong

**File: `src/pages/Sessions.tsx`** — pass transcript to the dialog

## Files Modified

| File | Change |
|------|--------|
| `src/pages/patient/MyDoctors.tsx` | Add specialty badge, filter out "patient_information" from permissions |
| `src/pages/patient/MyRewards.tsx` | Rename Transfers → Moolas, reorder after History |
| `src/pages/PatientProfile.tsx` | Hide stats grid for own record |
| `src/components/dashboard/UpcomingAppointments.tsx` | Real appointments query |
| `src/pages/CalendarView.tsx` | Real appointments query |
| `src/components/sessions/VisitCategoryDialog.tsx` | Auto-guess category, auto-focus confirm |
| `src/pages/Sessions.tsx` | Pass transcript prop |

