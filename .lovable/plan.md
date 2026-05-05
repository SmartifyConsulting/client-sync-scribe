## 1. Remove top-left logo from landing page

In `src/pages/Landing.tsx`, remove the `<img src={holarcLogo}>` element (and unused import) from the top-left of the header. Leave the rest of the landing layout intact.

## 2. Deactivate HolarcHelp (SOS)

**Global kill-switch (DB):**
- Migration: `UPDATE public.app_modules SET enabled = false WHERE module_key = 'holarchelp';` (insert row first if missing). This makes `useHolarcHelpAccess()` return `false` for everyone, so all HolarcHelp routes show the "Not enabled" gate screen.

**UI hide (so users don't see disabled CTAs):**
- `src/components/layout/BottomNav.tsx` — remove the `SOS` item from `patientSections` and drop the `useHolarcHelpAccess` import.
- `src/pages/patient/PatientDashboard.tsx` — remove the two SOS / "Nearby" cards that link to `/patient/holarchelp*` (lines around 403 and 412).
- `src/components/layout/Sidebar.tsx` — remove the "HolarcHelp Admin" admin nav entry.
- `src/modules/holarchelp/pages/HolarcHelpHome.tsx` — leave file as-is; the gate handles it.

**Keep intact:** module folder, routes, edge functions, tables, `share-incident-with-contacts`, storage bucket. Re-enabling later = flip `app_modules.enabled` back to true and restore the nav entries.

## 3. 6dot50 partner API integration (Moola)

**Secret:** request `MOOLA_PARTNER_API_KEY` via the secret tool (already referenced in current empty-state copy).

**Edge function:** create `supabase/functions/sync-moola-partner-apps/index.ts`:
- Validates JWT, requires admin role.
- Calls 6dot50 partner endpoint (default `https://api.6dot50.com/v1/partners`, overridable via `MOOLA_PARTNER_API_URL` secret) with `Authorization: Bearer ${MOOLA_PARTNER_API_KEY}`.
- Maps response → upserts into `public.moola_partner_apps` (`name`, `logo_url`, `partner_code`, `category`, `is_active`).
- Returns count synced. CORS + error handling per house style.

**DB migration:** add `partner_code text unique`, `category text`, `is_active boolean default true`, `last_synced_at timestamptz` to `moola_partner_apps` if not present.

**Frontend (`src/pages/patient/MyRewards.tsx`):**
- When `partnerApps.length === 0`, replace the static "Ask your admin" message with an "Activate retailers" card that calls `supabase.functions.invoke('sync-moola-partner-apps')` (admin-only button; non-admins see "Coming soon").
- After sync, invalidate the `partnerApps` query so the carousel populates.

**Admin trigger:** add the same "Sync 6dot50 retailers" button on `src/features/admin/pages/GamificationAdmin.tsx` (or PricingAdmin) so admins can refresh on demand.

## Technical summary

| Area | Change |
|------|--------|
| Landing | Drop holarc logo from header |
| BottomNav / Dashboard / Sidebar | Hide SOS + HolarcHelp Admin nav items |
| DB migration | `app_modules.holarchelp.enabled = false`; extend `moola_partner_apps` columns |
| Secret | `MOOLA_PARTNER_API_KEY` |
| New edge fn | `sync-moola-partner-apps` (admin-gated, calls 6dot50, upserts table) |
| MyRewards | Empty-state activation button → invokes sync function |
| Admin page | Manual "Sync retailers" button |

No files deleted; SOS module remains dormant for future re-enable.
