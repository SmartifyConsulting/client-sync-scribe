

# Plan: Make My Holarchive the Patient's Single-Page Dashboard

## Overview
Remove the separate patient Dashboard, sidebar navigation, and bottom nav. The patient experience becomes a single "My Holarchive" page with all functionality consolidated as tabs. No navigation bar needed.

## Changes

### 1. Expand PatientDetailsEditor tabs (src/components/patients/PatientDetailsEditor.tsx)
- Add 3 new tabs to both view and edit modes: **My Round Table**, **My Rewards**, **My Calendar**
- Lazy-import `PatientRoundTable`, `MyRewards`, `PatientCalendar`
- Move **Preferences** (the 3 auto-email toggles from Profile.tsx) into a new "Preferences" section at the bottom of the **Medical Information** tab
- **Consolidate Column 2** of Medical Information: merge Physical Measurements, Blood Type, Allergies, Chronic Medication, Surgeries, Family History, and Organ Donor into a single `sectionFrame` with sub-headings instead of separate bordered frames

The tab bar becomes: Personal Information | Medical Information | My Documents | My Doctors | My Round Table | My Rewards | My Calendar

### 2. Update patient routing (src/App.tsx)
- Change patient dashboard route: when `isPatient`, `RoleBasedDashboard` renders `<MyDetails />` (or redirect `/dashboard` to `/patient/details`)
- Keep individual routes (`/patient/round-table`, `/patient/rewards`, `/patient/calendar`) as redirects to `/patient/details` for backward compatibility

### 3. Remove patient sidebar/bottom nav items (src/components/layout/Sidebar.tsx, BottomNav.tsx)
- Set `patientNavItems` to empty array (or a single "My Holarchive" item pointing to `/patient/details`)
- Same for patient items in `BottomNav.tsx`
- The sidebar and bottom nav will effectively be hidden/minimal for patients

### 4. Pass Preferences data to PatientDetailsEditor (src/pages/Profile.tsx or MyDetails.tsx)
- The Preferences toggles need the `profile` and `updateProfile` from `useProfile`. Pass these as new optional props to `PatientDetailsEditor`, or embed the preferences inline.
- Remove the separate "Preferences" tab from Profile.tsx patient section (it moves into Medical Information)

### 5. Profile.tsx patient section cleanup
- Since My Holarchive IS the dashboard now, the patient section of Profile.tsx simplifies to just Personal (account info) + My Holarchive tabs, or we redirect patients from `/profile` to `/patient/details`

## Files Modified
- `src/components/patients/PatientDetailsEditor.tsx` — add 3 tabs, consolidate medical column 2, add preferences section
- `src/components/layout/Sidebar.tsx` — minimize patient nav items
- `src/components/layout/BottomNav.tsx` — minimize patient nav items  
- `src/App.tsx` — redirect patient dashboard to MyDetails
- `src/pages/Profile.tsx` — remove patient Preferences tab (moved to Medical Information)
- `src/pages/patient/MyDetails.tsx` — pass profile/updateProfile props for preferences

## Technical Detail: Consolidated Medical Column 2
Currently each sub-section (Physical Measurements, Blood Type, Allergies, etc.) has its own bordered frame. These will be merged into one `sectionFrame` with internal sub-headings separated by subtle dividers, reducing visual noise.

