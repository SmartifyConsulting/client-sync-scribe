

# Mobile Bottom Tab Bar Navigation Restructure

## Summary
Replace the 5-item patient bottom nav with category-based tabs that filter which top tabs appear in PatientDetailsEditor. All content stays on `/patient/details` — the bottom nav passes a `?section=` query param.

## Bottom Nav → Top Tabs Mapping

```text
Bottom Bar:  👤 Profile  |  🏥 Health  |  🤝 Care  |  📁 Records  |  🎁 Rewards
Top Tabs:    Personal     Medical       Providers    Documents     My Vulas
             NOK & ICE    Med Overview  Sessions
                                        My Calendar
                                        Round Table
```

## Changes

### 1. `src/components/layout/BottomNav.tsx`
- Replace `patientNavItems` with 5 category items, all linking to `/patient/details?section=X`:
  - `User` icon → "Profile" → `?section=profile`
  - `HeartPulse` icon → "Health" → `?section=health`
  - `Handshake` icon → "Care" → `?section=care`
  - `FolderOpen` icon → "Records" → `?section=records`
  - `Gift` icon → "Rewards" → `?section=rewards`
- Use `useSearchParams` to determine active state based on `section` param instead of route matching

### 2. `src/components/patients/PatientDetailsEditor.tsx`
- Accept a `section` prop (string)
- Filter visible `TabsTrigger` items based on section:
  - **profile**: `personal`, `nok-iced`
  - **health**: `medical`, `overview`
  - **care**: `doctors`, `sessions`, `calendar`, `roundtable`
  - **records**: `documents`
  - **rewards**: navigate to `/patient/rewards`
- Default the first tab in each group as the active tab
- Apply in both view and edit mode tab bars

### 3. `src/pages/patient/MyDetails.tsx`
- Read `section` from `useSearchParams`, default to `"profile"`
- Pass `section` to `PatientDetailsEditor`
- If section is `"rewards"`, redirect to `/patient/rewards`

| File | Change |
|------|--------|
| `src/components/layout/BottomNav.tsx` | Replace patient nav items with 5 section-based items |
| `src/components/patients/PatientDetailsEditor.tsx` | Filter tabs by `section` prop in both view/edit modes |
| `src/pages/patient/MyDetails.tsx` | Read `section` param, pass to editor, redirect for rewards |

