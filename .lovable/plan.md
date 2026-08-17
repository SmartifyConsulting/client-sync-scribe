# Nurse profile polish: avatar, red role pill, scoped Admissions

## 0. Fix current build error
`src/components/dashboard/CompactTodoList.tsx` uses `isDocumentTodoKind` without importing it. Add it to the existing `@/lib/resolveTodoDocumentId` import.

## 1. Nomvula Dlamini's profile picture
Generate a new professional avatar (Black woman, nurse, clean studio-style headshot matching the other seeded avatars), store it as a project asset, and update her profile record's avatar so it shows everywhere (sidebar, switcher, ward board, shift lists).

## 2. Nurse / Patient pill in the nav menu
The role switcher pill at the top of the sidebar currently uses a dark red (`bg-red-800`) for the professional side and a neutral grey for patient. Change it so:
- Whichever tab is selected uses the same red as the SOS button (the `sos` design token).
- The unselected tab renders in grey.
This applies to the Nurse|Patient pill and the Doctor|Patient pill (same component), keeping behaviour identical.

## 3. Admissions should not expose the whole hospital portal
Today `/provider/hospital/admissions` renders inside the hospital operations layout, so a nurse sees the full hospital provider sidebar, the hospital stats strip (live queue, ER beds, ICU, capacity, alerts) and every other hospital screen.

Change: when the signed-in user is a nurse (ward assignment on the hospital nursing roster), hospital routes render in the standard nurse app chrome — the nurse sidebar (Dashboard, My Profile, My Shifts, Ward Board, Admissions, SOS) with no hospital stats strip and no hospital-wide navigation. Non-nurse hospital staff keep the current ops layout unchanged.

Admissions content itself stays the same screen; only the surrounding hospital portal chrome is removed.

## Technical notes
- Avatar: new file in `src/assets`, then update `profiles.avatar_url` for the nurse account.
- Pill: `src/components/layout/Sidebar.tsx` — replace `bg-red-800` / `bg-neutral-600` with `bg-sos text-sos-foreground` for active and a muted grey for inactive.
- Layout: `src/modules/holarchelp/pages/provider/hospital/HospitalOpsLayout.tsx` — branch on `useNurseWard()`; render the standard app layout (nurse sidebar + `Outlet`) instead of `ProviderAppLayout` when the user is a nurse.
