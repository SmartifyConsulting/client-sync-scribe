## Goal

1. Add **Patients** and **Healthcare Providers** sub-tabs under the Users tab of `/admin/users`.
2. Add a **Pharmacies** sub-tab under the existing Providers tab, backed by a real DB table with the same approve/suspend/tier/CRUD pattern as hospitals & ambulances.
3. Establish a documented **icon scale system** and run a full app-wide audit pass to fix oversized, undersized, and misaligned icons.

---

## Part 1 — Users tab sub-tabs

**File:** `src/features/admin/components/UsersTab.tsx`

- Add an inner `<Tabs defaultValue="patients">` with two triggers — **Patients** and **Healthcare Providers** — styled to match the existing teal `bg-primary` `TabsList` pattern (Tab Styling memory).
- `patients` content = current user table filtered to `role === "patient"`.
- `providers` content = current user table filtered to `role === "doctor"`.
- Keep the InviteUserDialog button in the shared header above the inner tabs.
- Admin/none rows: append a small subtle row at the end of each tab? **No** — keep simple: admins/none show under Patients tab as a fallback (or hidden). Final call: hide them from both sub-tabs and add a third small "Other" trigger only if needed. Plan: **two tabs only**, admins shown alongside patients with their existing "Admin" badge so they remain editable.

## Part 2 — Pharmacies provider type

### 2a. Schema (migration)
New table `public.holarchelp_pharmacies` mirroring `holarchelp_hospitals` columns: `id`, `owner_id`, `name`, `registration_number`, `contact_email`, `contact_phone`, `address`, `city`, `country`, `tier` (uses existing `holarchelp_tier` enum), `latitude`, `longitude`, `status` (uses existing `holarchelp_status` enum), `accepting_patients`, `dispatch_priority`, `credential_score`, `approved_at`, `created_at`, `updated_at`.

- Enable RLS with same policies as hospitals (admin full access; owner manages own row; approved rows readable to authenticated users for discovery).
- Add `pharmacy_staff` to the `user_role` enum (`ALTER TYPE user_role ADD VALUE 'pharmacy_staff'`).
- Add `holarchelp_approve_pharmacy(_provider_id uuid)` SECURITY DEFINER fn matching the hospital one.
- `updated_at` trigger using existing `update_updated_at_column()`.

### 2b. UI
**File:** `src/pages/admin/HolarcHelpProviders.tsx`
- Extend `Kind` type → `"hospital" | "ambulance" | "pharmacy"`.
- Update `tableFor()` and `nameField()` (pharmacy uses `name`).
- Add `Pharmacies` TabsTrigger with `Pill` lucide icon between Hospitals and Ambulance.
- Wire `load()` to also fetch pharmacies; render with the same `renderGroupedTable` (it's kind-agnostic).
- Extend "Add provider" chooser dialog with a 3rd Pharmacy button.
- `ProviderDialog`: pharmacy uses the same form shape (no special fields).

### 2c. UsersTab integration
- Filter pharmacy_staff out of the Users tab too (they belong on Providers → Pharmacies).
- Add pharmacy company lookup mirroring hospital/ambulance company maps so the column still resolves if any pharmacy_staff slip through.

## Part 3 — Iconography standardisation pass

### 3a. System (new file: `src/lib/icon-sizes.ts`)
Export named Tailwind class constants and a typed helper:
```ts
export const ICON = {
  xs: "h-3.5 w-3.5",   // 14 — micro/inline metadata
  sm: "h-4 w-4",       // 16 — table actions, inline labels
  md: "h-5 w-5",       // 20 — buttons, form fields, list items (default)
  lg: "h-6 w-6",       // 24 — card headers, status indicators
  xl: "h-8 w-8",       // 32 — empty states, major feature highlights
  hero: "h-12 w-12",   // 48 — SOS, emergency-only
} as const;
```
Plus a one-page doc comment at the top describing when to use each tier (mirrors the user's spec).

### 3b. Audit & fix scope (one pass)
Run regex sweep across `src/**/*.tsx` for lucide icon usages with non-standard sizes (anything not in the scale: `h-3 w-3`, `h-7 w-7`, `h-9 w-9`, `h-10 w-10`, `h-14 w-14`, `h-16 w-16`, `h-20 w-20`, `h-24 w-24`, custom `h-[Npx]`).

For each match, classify by context and remap to nearest scale tier:
- Inside `Button` (no `size` or `size="sm"`) → `sm` (16)
- Inside `Button size="icon"` → `md` (20)
- Inline next to text (`text-sm`/`text-xs` siblings) → `sm` (16)
- Card / Section headers → `md` or `lg`
- Empty-state hero illustrations → `xl` or `hero`
- Loose `<X />` spinners → keep at current contextual size but standardise to scale

**Special focus areas the user flagged:**
- Vula voucher / rewards icons (`src/pages/PatientRewards*`, `src/components/rewards/*`, `VulaRedemption*`) — known to be wildly inconsistent.
- HolarcHelp screens — already partially refined; verify against scale.
- Sidebar / mobile bottom nav — align to `md`.
- Admin pages — align to `sm` for table actions, `md` for tab triggers.

### 3c. Alignment
- Where icons sit beside text, ensure the parent uses `inline-flex items-center gap-1.5` (sm) or `gap-2` (md+). Add missing `items-center` / `gap-*` where icons are floating.
- Inside icon-only buttons, ensure parent has square dims: `h-9 w-9` for `md`, `h-8 w-8` for `sm`.

### 3d. Style consistency
- Confirm only `lucide-react` is used (already the case — quick `rg` to confirm no `@heroicons` or `react-icons` imports sneak in).
- No mixing of filled vs outline (lucide is outline-only — no action needed unless a filled SVG was inlined).

### 3e. QA
- After the sweep, run a final `rg` for any remaining `h-(7|10|14|16)` icon usages and either justify (hero/empty-state) or fix.
- Visual spot-check the screens the user is most likely to land on: `/admin/users`, `/patient`, `/patient/holarchelp`, `/patient/rewards`, `/doctor-dashboard`.

## Out of scope
- No design-token color changes.
- No layout/spacing changes beyond the icon ↔ text gap fixes needed for alignment.
- No new icon imports beyond `Pill` for pharmacies.

## Deliverables
- 1 migration (pharmacies table + role enum + approve fn + RLS).
- New `src/lib/icon-sizes.ts` (reference scale).
- Edits to: `UsersTab.tsx`, `HolarcHelpProviders.tsx`, plus an estimated 30–60 component files for the icon sweep.
