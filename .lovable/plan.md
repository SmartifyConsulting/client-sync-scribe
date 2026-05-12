
## Goals
1. Patient signup wizard step 0 should keep all 3 role options (Healthcare Provider, Patient, Emergency Service Provider). Currently it only renders 2.
2. The selected role tile should be shaded with the existing light-green hover colour (`bg-accent`) so the selection is visible — not just a border.
3. After a patient verifies their email and lands in the app, they must be routed to the patient view (`/patient/details`) — not the doctor dashboard. Today the avatar shows "U" and the doctor "Good afternoon" greeting because the role isn't set yet.
4. Document pages for both patient and doctor should render as a compact **list** (rows), not cards.

## Why the patient lands in the doctor view
- `Auth.handleCreateAccount` calls `signUp(...)` then immediately `supabase.from("user_roles").insert(...)`. With email-confirmation on, there is no session yet, so RLS silently rejects the insert → no `user_roles` row is created.
- The user clicks the verification link, lands on `/`, `Landing` redirects to `/dashboard`, `RoleBasedRedirect` reads no role → falls through to `/doctor-dashboard`.
- `profiles.full_name` is also still empty (only set in the final wizard step), so `Dashboard` shows initial "U" and an empty greeting.

## Changes

### 1. `src/pages/Auth.tsx` — role picker (patient step 0)
- Replace the 2-column `RadioGroup` with the same 3-tile grid used in the doctor step (Healthcare Provider, Patient, Emergency Service Provider — last one navigates to `/provider-signup`).
- For the doctor step's existing 3-tile grid and the new patient step's grid, add the selected-shading class:
  - On the inner `Label`, add `peer-data-[state=checked]:bg-accent peer-data-[state=checked]:text-accent-foreground` so the picked option is filled with the light-green hover colour.
  - Keep `peer-data-[state=checked]:border-primary`.
- Keep `disabled={!!inviteToken}` semantics on the patient step.

### 2. `src/pages/Auth.tsx` — robust role assignment + naming at signup
- Pass user metadata to `signUp` so a DB trigger / fallback can recover even if the wizard is abandoned:
  - Update `useAuth.signUp` (and the call site) to accept an `options` arg with `data: { full_name, role }` and `emailRedirectTo: window.location.origin + "/dashboard"`.
- In `handleCreateAccount`:
  - Pass `{ full_name: fullName, role: userRole }` into signUp metadata.
  - Immediately `upsert` the `profiles` row with `full_name` and `role` (this works because the auto-created profile row belongs to the new user; if RLS blocks the unauthenticated update we fall back to step 3 below).
- Add a Supabase migration:
  - Update the existing `handle_new_user` trigger (or add one) so on `auth.users` insert it (a) inserts a `profiles` row with `full_name` and `role` from `raw_user_meta_data`, and (b) inserts the matching `user_roles` row (`patient` or `doctor`). This guarantees the role exists even before the wizard finishes and regardless of RLS, because triggers run as definer.
- After the final wizard `handleFinalSubmit`, replace the hard-coded `navigate("/dashboard")` with `await routeAfterLogin(userId)` so role-based routing is applied consistently.

### 3. `src/pages/Dashboard.tsx` — guard against patients
- At the top of the component, if `!roleLoading && isPatient`, `return <Navigate to="/patient/details" replace />`. This prevents a patient ever seeing the doctor "Good afternoon, Doctor" screen even if they navigate to `/doctor-dashboard` directly.

### 4. Document list views (cards → list rows)
- **Doctor** `src/pages/doctor/DoctorDocumentsTab.tsx`: replace the 2-column `ul` of bordered tiles with a single-column divided list:
  - `<ul className="divide-y rounded-lg border">`
  - Each row: `<li><Link className="flex items-center gap-3 px-3 py-2 hover:bg-accent">…</Link></li>`
  - Columns: icon · name · patient · template · date (right-aligned, muted).
- **Patient** `src/pages/patient/PatientDocuments.tsx` (lines ~828–927): replace the `grid gap-3` of `Card` items with the same compact divided list (icon + name + meta + actions), keeping existing actions/handlers intact. Drop the per-row `Card`/`CardContent` chrome and the left coloured border accent (or keep a thin left bar via `border-l-4` on the row itself if the colour-by-type cue should remain — confirm during build).

### Out of scope
- Mobile `BottomNav`.
- Any change to the actual role/permission model beyond ensuring `user_roles` + `profiles.role` are populated at signup time.
- Restyling the documents tab on the patient profile (`/patients/:id?tab=documents`).

## Technical notes
- The `handle_new_user` trigger must read `NEW.raw_user_meta_data->>'role'` and `->>'full_name'`. Default role to `doctor` if missing for backward compatibility with existing flows.
- `useAuth.signUp` signature change is additive (`options?` param) so existing call sites keep working.
- `routeAfterLogin` already resolves emergency vs patient vs doctor correctly; reusing it in `handleFinalSubmit` is enough.

## Files touched
- `src/pages/Auth.tsx`
- `src/hooks/useAuth.ts`
- `src/pages/Dashboard.tsx`
- `src/pages/doctor/DoctorDocumentsTab.tsx`
- `src/pages/patient/PatientDocuments.tsx`
- New migration: `supabase/migrations/<ts>_handle_new_user_role.sql`
