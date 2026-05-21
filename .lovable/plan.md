## Changes

### 1. Avatar role label (`src/components/layout/TopBarIcons.tsx`, lines ~274-278)
Currently always shows "Patient" when not a doctor. Replace with a derived label:
- If `location.pathname.startsWith("/provider/ambulance")` → `"ER"`
- Else if `location.pathname.startsWith("/provider/hospital")` → `"Hospital"`
- Else if `isEmergency` (no provider route active) → `"ER"`
- Else → `"Patient"`

(`useLocation` and `isEmergency` from `useUserRole` are already imported/used in this file.)

### 2. Rename "Ambulance Dispatch" → "Emergency Response Dispatch"
Update the header label string in these 6 ambulance screens:
- `src/modules/holarchelp/pages/provider/ambulance/AmbulanceOpsDashboard.tsx`
- `src/modules/holarchelp/pages/provider/ambulance/IncomingSosScreen.tsx`
- `src/modules/holarchelp/pages/provider/ambulance/NavigationScreen.tsx` (becomes "Emergency Response Dispatch · Navigation")
- `src/modules/holarchelp/pages/provider/ambulance/HospitalsDirectoryScreen.tsx`
- `src/modules/holarchelp/pages/provider/ambulance/IncidentHistoryScreen.tsx`
- `src/modules/holarchelp/pages/provider/ambulance/TeamStatusScreen.tsx`
- `src/pages/Landing.tsx` (line 205 marketing label)

### Out of scope
No route renames, no DB role renames, no other copy changes.