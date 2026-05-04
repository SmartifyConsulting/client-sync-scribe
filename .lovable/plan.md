## Plan

### 1. Move SOS to bottom nav (right of My Rewards)
- **`src/components/layout/BottomNav.tsx`**: Add a 5th patient nav item `{ icon: Shield, label: "SOS", to: "/patient/holarchelp" }` after `My Rewards`. Use red color: when not active `text-red-600`, active state uses red tint instead of teal. Active when `location.pathname.startsWith("/patient/holarchelp")`.
- **`src/components/layout/PatientAppLayout.tsx`**: Remove global `<SOSFab />` mount.
- **`src/components/layout/SOSFab.tsx`**: Delete (no longer used).

### 2. Emergency Contact = Next of Kin
- **`src/modules/holarchelp/pages/HolarcHelpHome.tsx`**: Before creating an SOS incident, query NOK fields from `patients` (e.g. `next_of_kin_name`, `next_of_kin_phone`). If missing → show amber gate card: *"Add a Next of Kin to enable SOS — your Next of Kin is your Emergency Contact."* with a button linking to `/patient/details?section=health`. If present → proceed and pass NOK info into the incident payload (existing columns or `notes`).
- Update any standalone "Emergency Contact" copy to read "Emergency Contact (Next of Kin)".

### 3. Admin Providers — remove Import, simplify status, add CRUD, availability flag
**`src/pages/admin/HolarcHelpProviders.tsx`:**
- Remove **"Import from Holarc Guardian"** button + `importing` state + `Download` import.
- Replace status filter pills with **`["active", "inactive", "all"]`**.
- Replace status badge + approve/reject/suspend buttons with a single **Active/Inactive Switch**.
  - DB mapping (no schema migration): `status='approved'` = **Active**; anything else = **Inactive**. Toggle ON → `status='approved' + approved_at=now()`; OFF → `status='suspended'`.
- **CRUD:**
  - **Create**: "+ Add Hospital" / "+ Add Ambulance" dialog with fields: name/company_name, contact_email, contact_phone, city, country, tier, plus the new **Accepting Patients** toggle (and fleet_size for ambulances). Inserts with `status='approved'`.
  - **Edit**: row "Edit" opens prefilled dialog.
  - **Delete**: trash button + confirm AlertDialog.
- Keep tier `Select` and grouped accordion view.

### 4. Capacity availability (replace bed counts)
- **DB migration:** add `accepting_patients boolean not null default true` to `holarchelp_hospitals` and `holarchelp_ambulance_providers`. Keep existing bed/fleet columns untouched (not displayed).
- **Admin table:** drop the **Beds** (`beds_available/bed_capacity`) and **Fleet** columns. Add a single **Accepting** column with a Switch bound to `accepting_patients`. Inline toggle updates the row.
- **Provider dashboard** (`src/modules/holarchelp/pages/provider/ProviderDashboard.tsx` or `ProviderProfile.tsx`): expose the same toggle so providers can mark themselves "Full capacity" / "Accepting patients".
- **Patient-facing map & list** (`src/modules/holarchelp/components/ProviderMap.tsx` and the nearest-list in `HolarcHelpHome.tsx`):
  - Markers/list rows where `accepting_patients=false` render **greyed out** (opacity-40, grayscale icon, `cursor-not-allowed`). The "Request this provider" button is disabled with tooltip "At full capacity".
  - Accepting providers render in full color and remain interactive.
- **Auto-dispatch / sorting:** keep haversine sort but push non-accepting providers to the bottom of the list and exclude them from any auto-assignment offer logic.

### 5. Memory updates
- New entry: `mem://features/holarchelp/provider-availability` — "Providers expose `accepting_patients` boolean. Greyed out on patient map when false. Replaces bed/fleet counts in admin views."
- New entry: `mem://features/holarchelp/sos-and-nok` — "Emergency Contact = Next of Kin. SOS requires NOK on file. SOS lives in patient bottom nav (red, right of My Rewards)."
- Update `mem://architecture/role-based-system/navigation-and-profile-switching` to note 5-item patient nav now ends with SOS.

### Out of scope
- No removal of `seed-test-providers` button (dev-only).
- No changes to incident accept/dispatch RPCs beyond filtering by `accepting_patients`.
