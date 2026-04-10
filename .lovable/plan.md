

# Medication Rename, Conditions/Diagnoses, Dashboard Restructure, Overview Fixes

## Summary
Rename "Current Medications" to "Medication" with past/current + date ranges, add "Conditions & Diagnoses" section, restructure patient dashboard layout, fix Vula logo size, fix cached profile issue, fix Medical Overview (remove edit button, add blood type badge, AI summary before timeline).

---

## 1. Expand CurrentMedication interface + rename to "Medication"

**File:** `src/hooks/usePatients.ts`
- Add `status: "current" | "past"`, `start_date?: string`, `end_date?: string` to `CurrentMedication` interface

**File:** `src/components/patients/PatientDetailsEditor.tsx`
- Rename heading from "Current Medications" to "Medication"
- In view mode: show status badge (Current/Past) and date range per medication
- In edit mode: add status dropdown (Current/Past) and start/end date fields per medication entry

## 2. Add "Conditions & Diagnoses" section to Medical Information tab

**File:** `src/hooks/usePatients.ts`
- Add `ConditionDiagnosis` interface: `{ id, name, diagnosed_date, diagnosed_by, status }`
- Add `conditions_diagnoses: ConditionDiagnosis[] | null` to `Patient` interface

**Database migration:** Add `conditions_diagnoses` JSONB column (default `'[]'`) to `patients` table.

**File:** `src/components/patients/PatientDetailsEditor.tsx`
- Add a new bordered frame after Family History in both view and edit modes
- Icon: `HeartPulse`; heading: "Conditions & Diagnoses"
- Fields per entry: condition name, date diagnosed, diagnosed by (doctor name), status (active/resolved)
- These will automatically show in Medical Overview since the AI summarizer already reads patient data

## 3. Restructure Patient Dashboard layout

**File:** `src/pages/patient/PatientDashboard.tsx`

New layout:
- **Row 1:** AI Health Summary (col 1) | Upcoming Appointments (col 2) -- new appointments card needed
- **Row 2 (3-col):** My Medications | My Healthcare Providers | My Pharmacies
- **Row 3:** My Vula Balance (col 1) | Earn More Vulas (col 2)
- **Row 4:** Recent Claims (col 1) | Documentation (col 2)
- Remove "My Calendar" quick action card
- Fix "My Medications" link to navigate to `/patient/details` with medical tab (use `?tab=medical`)
- Remove Assigned Tasks section (keep if tasks exist but move after row 4)

## 4. Enlarge Vula logo on Doctor Dashboard by 100%

**File:** `src/components/dashboard/StatsCard.tsx`
- Change the `imageUrl` img class from `h-8 w-8 md:h-12 md:w-12` to `h-16 w-16 md:h-24 md:w-24`
- Increase the container size for `iconSize === "large"` accordingly

## 5. Fix cached profile issue

**File:** `src/pages/patient/PatientDashboard.tsx` and routing
- The issue is likely the user role check. When a user logs in, the app may briefly show the doctor dashboard before redirecting to patient dashboard. This is a routing/role caching issue.
- Add `queryClient.invalidateQueries()` on auth state change to clear all cached data on login/logout
- Ensure the patient dashboard query uses the fresh user ID and doesn't serve stale data

**File:** `src/App.tsx` — Check the routing logic to ensure proper role-based redirect on login.

## 6. Fix Medical Overview tab

**File:** `src/components/patients/PatientOverview.tsx`

- **Remove Edit button**: The overview is AI-generated read-only. Remove the edit button from the view when rendered in self-service/patient mode (pass a prop or check context).
- **Blood Type badge**: Add a badge showing blood type under the Medical Overview heading (pass `blood_type` from patient data, display as a colored badge)
- **AI Summary first, then timeline**: Restructure the AI Summary card to show the plain text summary paragraph first, followed by the timeline breakdown below it. Currently it goes straight to timeline — add a "Summary" section above with the overall narrative, then "Timeline" section below.

## 7. Update PatientOverview patient prop to include blood_type

**File:** `src/components/patients/PatientOverview.tsx`
- Add `blood_type?: string | null` to the patient prop interface
- Render blood type as a badge: `<Badge className="bg-red-100 text-red-700">O+</Badge>` style

**File:** `src/components/patients/PatientDetailsEditor.tsx`
- Pass `blood_type` to `PatientOverviewLazy` component

---

## Technical Summary

| File | Change |
|------|--------|
| Migration SQL | Add `conditions_diagnoses` JSONB column to `patients` |
| `src/hooks/usePatients.ts` | Add `ConditionDiagnosis` interface; expand `CurrentMedication` with status/dates; add field to `Patient` |
| `src/components/patients/PatientDetailsEditor.tsx` | Rename meds heading; add date ranges; add Conditions section; pass blood_type to overview |
| `src/pages/patient/PatientDashboard.tsx` | Full layout restructure (AI+Appointments row 1, Meds+Providers+Pharmacies row 2, Vulas+Earn row 3, Claims+Docs row 4); remove Calendar; fix med link |
| `src/components/dashboard/StatsCard.tsx` | Double Vula logo size for `large` iconSize |
| `src/components/patients/PatientOverview.tsx` | Remove edit button; add blood type badge; show AI summary paragraph before timeline |
| `src/App.tsx` | Invalidate queries on auth change to prevent stale cached profiles |

