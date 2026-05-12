## 1. Account change: georgia.adams@smartify.co.za → patient

Two data changes (no schema):

- Insert `('patient')` into `user_roles` for user `7c12a364-61f1-471e-8cc2-1c3a762794e3`.
- Delete the existing `('admin')` row for the same user.

**Heads-up:** Georgia is the currently signed-in admin. The moment admin is revoked she will lose access to `/admin/*` and the user-management RPC (`get_users_admin` raises "Access denied"). Confirm she should keep access via a different admin account before this is applied, or we should promote another user (e.g. `sme@smartify.co.za`) to admin in the same step. **I'll wait for your confirmation on who else should be admin before running this.**

## 2. Carry-over fixes from previous plan

- **Edits silently dropped (Dean Allie, etc.):** add a SELECT policy on `public.profiles` so admins can see all rows, otherwise the existing admin UPDATE policy matches 0 rows. Migration:
  ```sql
  CREATE POLICY "Admins can view all profiles"
    ON public.profiles FOR SELECT
    USING (public.has_role(auth.uid(), 'admin'::public.user_role));
  ```
- **Accordions collapsed by default:** remove `defaultValue` from country and Approved/Unapproved accordions in `UsersTab.tsx` and `HolarcHelpAccountability.tsx`.
- **Unknown → South Africa:** in `src/pages/admin/_shared/grouping.ts`, `normalizeCountry` returns `"South Africa"` when country is null/empty.

## 3. Admin UI overhaul — premium healthcare operations feel

Visual-only. No workflow, data-model, or RPC changes.

### 3.1 Design tokens (`src/index.css`, `tailwind.config.ts`)

Introduce a calm clinical palette layered on top of existing tokens:

- `--surface`: pure white panels.
- `--surface-muted`: very faint cool grey (`hsl(210 20% 98%)`) for page background.
- `--border-subtle`: `hsl(215 16% 90%)` for hairline dividers.
- `--border-strong`: `hsl(215 16% 82%)` for panel edges.
- `--accent-clinical`: deep teal `hsl(180 45% 28%)` (replaces bright turquoise for active states, links, focus rings).
- `--accent-clinical-soft`: `hsl(180 45% 28% / 0.08)` for selected rows / active tab underline halo.
- `--text-primary`, `--text-secondary`, `--text-tertiary` for a 3-step type hierarchy.
- Status dots: `--status-active` (emerald 600), `--status-pending` (amber 600), `--status-suspended` (rose 600), `--status-inactive` (slate 400).
- Spacing rhythm tightened: panel padding `16px`, table cell padding `8px 12px`, row height `36px`.
- Type ramp: page title `text-[15px] font-semibold`, section title `text-[13px] font-semibold uppercase tracking-wide`, table header `text-[11px] font-medium uppercase tracking-wide text-text-tertiary`, table body `text-[13px]`.

### 3.2 Shared shell components (new in `src/pages/admin/_shared/`)

- `AdminPage.tsx` — page wrapper: max-width container, top bar with title + count + primary action, sticky page header with bottom hairline border.
- `AdminPanel.tsx` — `rounded-lg border border-border-strong bg-surface shadow-[0_1px_0_rgba(15,23,42,0.04)]` card that contains tables/forms. Replaces the large floating sections currently used.
- `AdminTabs.tsx` — flat underline tabs (no pill background, no teal fill); active tab gets a 2px deep-teal underline and `text-text-primary font-semibold`. Used for both top tabs (Users / Accountability / SOS Voice Clip) and Users sub-tabs.
- `AdminTable.tsx` + `AdminTableRow.tsx` — sticky header (`position: sticky; top: 0; bg-surface; border-b border-border-strong`), `divide-y divide-border-subtle`, hover `bg-accent-clinical-soft/40`, selected `bg-accent-clinical-soft border-l-2 border-l-accent-clinical`, 36px row height, right-aligned action column with `h-7 w-7` ghost icon buttons.
- `StatusDot.tsx` — `● Active` / `● Pending` / `● Suspended` / `● Inactive` with `text-[12px]` and the matching status colour. Replaces filled pill badges everywhere.
- `EmptyState.tsx` — centred icon + one-line message + optional CTA.
- `RowSkeleton.tsx` — skeleton rows for loading.
- `Toolbar.tsx` — search input + segmented filter + primary action, all `size="sm"`, aligned in a single 40px-tall row above the table.

### 3.3 Pages refactored to use the shell

Visual-only refactor — keep current logic, just swap layout primitives:

- `src/pages/admin/HolarcHelpProviders.tsx` (top tabs container)
- `src/features/admin/components/UsersTab.tsx` (Patients / Healthcare Providers / Hospitals / Ambulance / Pharmacies / Admin)
- `src/pages/admin/HolarcHelpAccountability.tsx`
- `src/pages/admin/PricingAdmin.tsx`
- `src/pages/admin/GamificationAdmin.tsx`

Each gets:
- `AdminPage` shell with sticky title bar.
- `AdminTabs` for top tabs and sub-tabs (no bright `bg-primary`, no rounded pills).
- `AdminPanel` wrapping every table/form section so panels feel contained, not floating.
- `Toolbar` row with search + filter + primary action above the table.
- `AdminTable` for all lists with sticky header, tighter rows, status dots, ghost-icon actions.
- `EmptyState` and `RowSkeleton` wired up where data loads.

### 3.4 Buttons & toggles

- Standardise on `size="sm"` for "Invite user", "Add", "Save", "Cancel" — `h-8 px-3 text-[12px]`.
- Edit/Delete become `h-7 w-7` ghost icon buttons in the row's action column; appear on row hover only on desktop, always visible on touch widths.
- HolarcHelp / accepting-patients toggles use shadcn `Switch` at `scale-75` with a small inline label, replacing the larger pill toggles.

### 3.5 Responsiveness

- ≥1280px: full table view as above.
- 768–1279px: same table, horizontally scrollable inside `AdminPanel`; sticky first column for name.
- <768px: each row collapses into a stacked card inside `AdminPanel` (name + role/country line, status dot, action menu in a `…` popover). No data hidden — only re-flowed.

### 3.6 Out of scope (explicit)

- No DB schema, RLS, RPC, or edge-function changes beyond the one admin SELECT policy in §2.
- No changes to patient or doctor dashboards.
- No new fields, no workflow changes, no role logic changes.
- No animation libraries; transitions limited to `transition-colors`/`transition-shadow` already in Tailwind.

## Files touched

**Migration**
- `Admins can view all profiles` SELECT policy on `public.profiles`.

**Data change (after your confirmation on a replacement admin)**
- `user_roles`: insert `(georgia, patient)`, delete `(georgia, admin)`, optionally insert `(<chosen user>, admin)`.

**New shared files**
- `src/pages/admin/_shared/AdminPage.tsx`
- `src/pages/admin/_shared/AdminPanel.tsx`
- `src/pages/admin/_shared/AdminTabs.tsx`
- `src/pages/admin/_shared/AdminTable.tsx`
- `src/pages/admin/_shared/AdminTableRow.tsx`
- `src/pages/admin/_shared/StatusDot.tsx`
- `src/pages/admin/_shared/EmptyState.tsx`
- `src/pages/admin/_shared/RowSkeleton.tsx`
- `src/pages/admin/_shared/Toolbar.tsx`

**Edited**
- `src/index.css`, `tailwind.config.ts` (token additions)
- `src/pages/admin/_shared/grouping.ts` (Unknown → South Africa)
- `src/pages/admin/HolarcHelpProviders.tsx`
- `src/features/admin/components/UsersTab.tsx`
- `src/pages/admin/HolarcHelpAccountability.tsx`
- `src/pages/admin/PricingAdmin.tsx`
- `src/pages/admin/GamificationAdmin.tsx`
