## Goal

Restructure the `/admin/users` screen so it functions as a single **Users** hub with sub-tabs by actor type, group every list by **Country**, and re-skin Admin pages to feel like a premium healthcare ops platform (Linear / Stripe / Notion density).

No data model changes. No workflow changes. Visual + structural reorganisation only.

---

## 1. Restructure the top-level Admin tabs

In `src/pages/admin/HolarcHelpProviders.tsx`:

- **Merge** the current top tabs `Users` + `Providers` → a single **Users** tab.
- New top-tab set:
  ```text
  Users  |  Accountability  |  SOS Voice Clip
  ```
- The merged **Users** tab gets sub-tabs (Admin is the last one):
  ```text
  Patients | Healthcare Providers | Hospitals | Ambulance | Pharmacies | Admin
  ```
  Each sub-tab carries a count chip and an icon. The **Admin** sub-tab lists users whose role is `admin` (e.g. Georgia Adams), grouped by country like every other sub-tab.

The "Add provider" button moves into Hospitals / Ambulance / Pharmacies sub-tabs (contextual).
The Active / Inactive / All filter pills are kept but restyled as a segmented control on the right of each sub-tab header.

## 2. Group every list by Country (no Role column)

- **Patients / Healthcare Providers / Admin** sub-tabs (`UsersTab.tsx`):
  - Do **not** add a Role column — the active sub-tab already conveys the role.
  - Wrap rows in a country accordion using the same `groupByCountryTier` pattern. Country source: `profiles.country` (fallback `"Unknown"`), reused via the existing `normalizeCountry()` helper extracted to `src/pages/admin/_shared/grouping.ts`.
  - Pinned countries (South Africa, Nigeria) appear first; flag emoji + total count in the header.
- **Hospitals / Ambulance / Pharmacies** already group by country → keep, but harmonise styling with the new patient/provider grouping.

## 3. Accountability sub-tabs

In `HolarcHelpAccountability.tsx`:

- Existing `Ambulance | Hospitals` tabs stay.
- Inside each, replace the flat table with a **Country accordion → Approved / Unapproved sub-accordion → table**. Approved = `status = 'approved'`, Unapproved = everything else.
- Reuse the same shared grouping helper + accordion styling so all three Admin screens look identical.

## 4. Premium visual redesign (Admin scope only)

A small, shared design pass — applied to `HolarcHelpProviders.tsx`, `UsersTab.tsx`, `HolarcHelpAccountability.tsx`, `PricingAdmin.tsx`, `GamificationAdmin.tsx`.

**Layout**
- New shared `AdminShell` wrapper (`src/pages/admin/_shared/AdminShell.tsx`): max-width container, consistent 24px page padding, kicker label + H1 + subtitle pattern (matches existing top of `HolarcHelpProviders`).
- New shared `AdminPanel` card: `rounded-xl border border-border/70 bg-card shadow-[0_1px_2px_rgba(15,23,42,0.04)]` — replaces the heavier `rounded-2xl` cards and the bright teal `border-primary` frames currently used.
- Remove the bright `bg-primary` (teal) `TabsList` background. Replace with a flat segmented control:
  ```text
  border-b border-border, triggers are text-muted-foreground with
  data-[state=active]:text-foreground + bottom 2px primary underline
  ```
- Tighten vertical rhythm: page `space-y-5` → `space-y-4`; card padding `p-6` → `p-4`; section gaps standardised to 12 / 16 / 24 px.

**Tables**
- Sticky header row (`sticky top-0 bg-card/95 backdrop-blur z-10`).
- Row height ~40 px (currently ~56 px), `text-[12px]` body, `text-[11px] uppercase tracking-wide` headers.
- Softer row dividers: `divide-y divide-border/50` instead of full borders.
- Hover: `hover:bg-muted/40`. Selected row: `bg-primary/5 border-l-2 border-l-primary`.
- Action icons: `h-7 w-7` ghost buttons, `text-muted-foreground hover:text-foreground`, destructive on hover only.
- Status pills replaced with quieter dot+label: `● Active` (emerald-600), `● Pending` (amber-600), `● Suspended` (slate-400).

**Typography & colour**
- Headings: `font-semibold` (drop `font-extrabold`).
- Use existing semantic tokens only (`bg-card`, `bg-muted`, `text-foreground`, `text-muted-foreground`, `border-border`, `text-primary`). Add two utility tokens to `index.css` (`--surface-muted`, `--admin-row-hover`).
- Tier chips kept but restyled to neutral (slate / muted) with a small coloured dot.

**Buttons**
- "Invite user" / "Add" become `size="sm"` with leading icon, neutral border, primary fill only on the primary action per screen.

**Responsiveness**
- Tables wrap in `overflow-x-auto`; on `<sm` collapse to a stacked card list (name + sub-tab implies role + actions).

## 5. States

- Empty: centred icon + one-line message + optional CTA (promote existing `Empty` helper to `_shared/EmptyState.tsx`).
- Loading: skeleton rows (`Skeleton` from shadcn) instead of the centred spinner.
- Error toast retained.

## 6. Out of scope

- No DB / RLS / edge function changes.
- No workflow, role logic, RPC, or data shape changes.
- No redesign of patient or doctor dashboards — Admin screens only.
- Profile `country` field is assumed to already exist; null falls under "Unknown".

---

## Files touched

- `src/pages/admin/HolarcHelpProviders.tsx` — top-tab restructure (Users / Accountability / SOS), AdminShell, segmented tabs.
- `src/features/admin/components/UsersTab.tsx` — sub-tabs `Patients | Healthcare Providers | Hospitals | Ambulance | Pharmacies | Admin`, country grouping, no role column, premium table styling.
- `src/pages/admin/HolarcHelpAccountability.tsx` — country + approved/unapproved grouping, restyled tabs.
- `src/pages/admin/PricingAdmin.tsx`, `src/pages/admin/GamificationAdmin.tsx` — wrap in `AdminShell`, apply panel + tab restyle.
- New: `src/pages/admin/_shared/AdminShell.tsx`, `AdminPanel.tsx`, `SegmentedTabs.tsx`, `CountryAccordion.tsx`, `EmptyState.tsx`, `grouping.ts`.
- `src/index.css` — two semantic token additions.
