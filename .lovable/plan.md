# Plan: Admin landing, standalone ER portal, HolarcHealth styling parity

## 1. Admin never lands in provider portal

**File:** `src/App.tsx` (`RoleBasedRedirect`)

- Pull `isAdmin` from `useIsAdmin()` alongside `useUserRole()` / `useProviderAccess()`.
- If `isAdmin` → always `Navigate to="/doctor-dashboard"` (or `/admin` if admin route preferred).
- Skip the `providerType` branch entirely for admins. They can still reach `/provider/...` manually via the profile switcher.

Out of scope: removing Georgia from any hospital seed data.

## 2. Rename "Ambulance" → "ER Providers" everywhere user-facing

Pure copy/label/icon change. No DB column renames (tables stay `holarchelp_ambulance_providers`, `holarchelp_ambulance_members` to avoid migration churn — internal only).

User-visible touchpoints to update:
- Sidebar/menu labels and page titles in `AmbulanceOpsLayout.tsx`, hospital nav ("Our Ambulances" stays — it refers to the ER fleet connected to a hospital; rename to "Our ER Providers").
- `AmbulanceHospitalAffiliations.tsx`, `AffiliatedAmbulancesScreen.tsx`, `AffiliatedHospitalsScreen.tsx`, `IncomingAmbulancesScreen.tsx` headings + button text → "ER Provider(s)".
- Toasts, empty states, dialog titles, badges, `ProviderSignup.tsx` choice copy.
- `TEST_PROFILES`: change role label "Ambulance" → "ER Provider".
- `ProviderGate.tsx` empty state copy.
- Keep route paths `/provider/ambulance/...` to avoid breaking existing links; add a redirect alias `/provider/er` → `/provider/ambulance` for forward-friendly URLs.

## 3. Standalone ER portal (separate test account)

The ER test user (`er.test@holarchealth.com`) currently has role "Hospital" in `TEST_PROFILES`. That's wrong — change role to "ER Provider" and back it with an ambulance-provider record so it routes to `/provider/ambulance` (the ER portal).

- Update `TEST_PROFILES` entry: role "ER Provider", icon `Ambulance`.
- Migration: insert a `holarchelp_ambulance_providers` row owned by the er.test user (if not present), so `useProviderAccess` resolves to `ambulance`.
- `hospital.test@holarchealth.com` keeps Hospital role and goes to the hospital portal.
- Result: Hospital test → Hospital portal. ER test → ER portal. Admin → dashboard.

## 4. Restyle provider shells to HolarcHealth design tokens

Keep the bespoke ops sidebar + stats top bar structure (per your answer), but swap all cards/buttons/tabs/badges/inputs to the same shadcn primitives + semantic tokens used in the doctor/patient app.

**Audit + fix in:**
- `HospitalOpsLayout.tsx`, `AmbulanceOpsLayout.tsx` (top bar chips → use `Badge` variants, `border-sos/40` etc. → `border-primary/40`, replace ad-hoc red/yellow/green Tailwind classes with semantic `bg-destructive/10 text-destructive`, `bg-warning/10`, `bg-success/10` tokens defined in `index.css`).
- All provider screens under `src/modules/holarchelp/pages/provider/hospital/` and `src/modules/holarchelp/pages/provider/ambulance/`:
  - Replace raw `<div className="rounded-xl border ...">` with `<Card>/<CardHeader>/<CardContent>`.
  - Replace `<button>` with `<Button variant=...>`.
  - Tabs → standardized teal `TabsList` per `mem://design/standardized-tab-styling`.
  - Accordion-style clinical sections get the teal-border treatment per `mem://design/ui-frame-standardization`.
  - Form fields → label above input, `space-y-1.5` (`mem://style/form-field-standardization`).
  - Tables/lists adopt mobile compaction (`mem://style/mobile-ui-compaction-standards`).
- `ProviderProfileMenu.tsx`: align with `TopBarIcons` avatar popover styling (same trigger size, popover width, sign-out row).

No new design tokens — only consume existing ones from `index.css` / `tailwind.config.ts`.

## 5. Out of scope

- Renaming database tables/columns from `ambulance_*` to `er_*`.
- Rewriting the provider sidebar into the main `AppLayout` shell.
- Functional changes to dispatch, triage, admissions, CSV import.

## Files touched

Edit: `src/App.tsx`, `src/components/layout/testProfiles.ts`, `src/modules/holarchelp/components/ProviderGate.tsx`, `src/modules/holarchelp/pages/provider/ambulance/AmbulanceOpsLayout.tsx`, `src/modules/holarchelp/pages/provider/hospital/HospitalOpsLayout.tsx`, `src/modules/holarchelp/pages/provider/hospital/*Screen.tsx`, `src/modules/holarchelp/pages/provider/ambulance/*Screen.tsx`, `src/modules/holarchelp/components/AmbulanceHospitalAffiliations.tsx`, `src/modules/holarchelp/routes-provider.tsx` (add `/provider/er` alias), `src/pages/ProviderSignup.tsx`, `src/components/layout/ProviderProfileMenu.tsx`.

Migration: seed an `holarchelp_ambulance_providers` row for `er.test@holarchealth.com` if missing.
