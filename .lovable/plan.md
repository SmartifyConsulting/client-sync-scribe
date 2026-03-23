

# Multi-Fix Update Plan

## 1. Fix Moolas Icon on Doctor's Patient Profile Tab
**File:** `src/pages/PatientProfile.tsx`
- Replace `import moolasLogo from "@/assets/moolas-logo.png"` with `import moolaSymbol from "@/assets/moola-symbol.png"`
- Update the Moolas stats card (line ~312) to use `moolaSymbol` instead of `moolasLogo`

## 2. Add "Medical Overview" and "My Sessions" Tabs to Patient's Holarchive
**File:** `src/components/patients/PatientDetailsEditor.tsx`
- Add a new `TabsTrigger` for "Medical Overview" after "Personal Information" (visible when `isSelfService` and user is patient)
- Add a new `TabsTrigger` for "My Sessions" after "Medical Overview" (visible when `isSelfService` and user is patient)
- Add `TabsContent` for "overview" that renders the `PatientOverview` component (fetching sessions for the patient)
- Add `TabsContent` for "sessions" that renders the `SessionHistoryTable` component (fetching sessions where patient is linked)
- Both tabs appear in both view and edit mode tab lists

## 3. Remove Chronic Medication Banner from Patient Dashboard
**File:** `src/pages/patient/PatientDashboard.tsx`
- Remove the "Chronic Medication Badge" block (lines ~303-317)

## 4. Add Recent Activity Banner to Top of Patient Dashboard
**File:** `src/pages/patient/PatientDashboard.tsx`
- After the welcome header, add a horizontal scrollable banner showing recent notifications from the last 30 days
- Use the already-fetched `recentNotifications` data (lines 116-130)
- Display as a compact, horizontally-scrolling strip with activity type icons, short descriptions, and relative timestamps
- Style as a subtle banner with border-primary styling consistent with the app

## Files Modified Summary

| File | Changes |
|------|---------|
| `src/pages/PatientProfile.tsx` | Use `moola-symbol.png` for Moolas icon |
| `src/components/patients/PatientDetailsEditor.tsx` | Add Medical Overview and My Sessions tabs for patient self-service |
| `src/pages/patient/PatientDashboard.tsx` | Remove chronic med banner, add recent activity banner at top |

