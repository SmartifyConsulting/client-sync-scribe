

# Doctor Mobile Bottom Nav Redesign

## Summary
Replace the current doctor bottom nav items (Home, Calendar, Sessions, Holarprac, Settings) with: Patients, Sessions, Practice, Rewards, Profile. The Rewards tab links to the existing `/doctor/rewards` page which already mirrors the patient rewards layout.

## Changes

### File: `src/components/layout/BottomNav.tsx`
- Update `doctorNavItems` array to:
  1. **Patients** — icon: `Users`, route: `/patients`
  2. **Sessions** — icon: `Mic`, route: `/sessions`
  3. **Practice** — icon: `Briefcase`, route: `/practice`
  4. **Rewards** — icon: `Gift`, route: `/doctor/rewards`
  5. **Profile** — icon: `User`, route: `/profile`
- Add `Users` and `User` to lucide imports, remove `LayoutDashboard`, `Calendar`, `Settings` (from doctor nav only; patient nav still uses `LayoutDashboard`)

| File | Changes |
|------|---------|
| `src/components/layout/BottomNav.tsx` | Replace 5 doctor nav items with Patients/Sessions/Practice/Rewards/Profile |

