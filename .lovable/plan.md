## Plan: Finish org + staff refactor UI

Five focused pieces wrapping up the paramedic-direct dispatch refactor. All UI/frontend except one small invite edge-function tweak.

### 1. Fleet management (ER admin)

New route: `/provider/ambulance/fleet` (added to `routes-provider.tsx`).

Page `provider/ambulance/FleetPage.tsx`:
- Lists `ambulances` for the current provider (via `useProviderAccess()` → `providerId`).
- Columns: `vehicle_code`, `registration_number`, `status` (badge: available/assigned/out_of_service), updated_at.
- Actions: **Add ambulance**, **Edit**, **Set status**, **Delete** (soft-block delete if `status='assigned'`).
- Gated to `er_admin` via `is_ambulance_role(providerId, uid, 'er_admin')` — paramedics see read-only.
- Add "Fleet" link in the ambulance provider sidebar (`ProviderAppLayout` ambulance nav).

Dialog `AmbulanceFormDialog.tsx` — fields: vehicle_code (required), registration_number, status. Uses supabase upsert.

### 2. Hospital-role granularity UI

`HospitalOpsLayout` / `HospitalOpsDashboard`:
- Read current user's hospital role from `holarchelp_hospital_members.role` for the active hospital.
- Render role chip in the header: `hospital_admin` / `coordinator` / `doctor` / `nurse`.
- Gate sections:
  - **ER capacity edit, accept incoming, dispatch decisions** → `hospital_admin` or `coordinator`.
  - **Clinical patient view (incoming patient context)** → `doctor`, `nurse`, plus admins.
  - **Members/Settings tab** → `hospital_admin` only.
- New `useHospitalRole(hospitalId)` hook returning `{ role, can: { manage, dispatch, clinical } }`.
- "Read-only" badge + disabled buttons with tooltip for non-permitted roles (no hard redirect — staff still see ops view).

### 3. Admin tab rename → "Organisations"

In `src/pages/admin/HolarcHelpProviders.tsx` (and wherever it's registered in admin nav):
- Rename label "HolarcHelp Providers" → **"Organisations"**, route stays.
- Unified list of Hospitals + ER Providers with type filter chip.
- Row click opens a side **Drawer** (`OrganisationDrawer.tsx`) with tabs:
  - **Profile** — existing edit fields.
  - **Members** — list `holarchelp_hospital_members` / `holarchelp_ambulance_members` with role chip + remove + "Invite staff" button.
  - **Ambulances** — (ER only) read-only list of `ambulances` with status badges, link to fleet page.

### 4. Invite Staff dialog with role dropdown

New `InviteStaffDialog.tsx` (separate from generic `InviteUserDialog`):
- Props: `orgType: 'hospital'|'ambulance'`, `orgId`.
- Fields: email, full_name, **role** (dropdown):
  - hospital → `hospital_admin`, `coordinator`, `doctor`, `nurse`
  - ambulance → `er_admin`, `paramedic`
- Calls existing edge function `invite-provider-admin`, passing `invited_role` in the body.
- Edge function update: accept `invited_role`, write into `role` column on the pending member row (already exists per migration).
- Used from Organisation Drawer → Members tab, and ER Admin team page.

### 5. Landing page copy

In `src/pages/Landing.tsx`:
- Remove the "Register as Emergency Provider" CTA button that links to `/provider-signup`.
- Replace with a small line under the relevant section: *"Are you a hospital or ambulance service? [Contact us](/provider-signup)"* — still routes to the contact panel.
- Update any nav/footer reference accordingly.

### Files touched

```
src/modules/holarchelp/pages/provider/ambulance/FleetPage.tsx      (new)
src/modules/holarchelp/components/AmbulanceFormDialog.tsx          (new)
src/modules/holarchelp/components/InviteStaffDialog.tsx            (new)
src/modules/holarchelp/components/OrganisationDrawer.tsx           (new)
src/modules/holarchelp/hooks/useHospitalRole.ts                    (new)
src/modules/holarchelp/routes-provider.tsx                         (add fleet route + nav)
src/modules/holarchelp/pages/provider/hospital/HospitalOpsDashboard.tsx (role gating)
src/modules/holarchelp/pages/provider/hospital/HospitalOpsLayout.tsx   (role chip)
src/pages/admin/HolarcHelpProviders.tsx                            (rename + drawer)
src/pages/Landing.tsx                                              (CTA copy)
supabase/functions/invite-provider-admin/index.ts                  (accept invited_role)
```

### Out of scope (confirm OK)
- No schema changes — `role` columns and `ambulances` table already exist.
- No changes to dispatch / accept logic.
- No mobile-specific redesign beyond responsive tables.
