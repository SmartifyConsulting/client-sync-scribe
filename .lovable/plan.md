Combined plan covering the original admin-access fix plus the new Holarc Guardian import and country-wide enablement.

## Part A — Admin HolarcHelp access (carryover)

1. Set `profiles.holarchelp_enabled = true` for the two admin accounts so the SOS screen stops showing the "Not enabled yet" gate:
   - georgia.adams@smartify.co.za
   - info@georgiaadams.co.za

(This was the original carryover fix. Part B will supersede it for ZA/NG users by enabling everyone in those countries — admins included.)

## Part B — Import all hospitals & ambulance providers from Holarc Guardian

The standalone "Holarc Guardian" project (Supabase ref `bwftujklwsdomdxmbotk`) holds the full seed of hospitals and ambulance providers that staff have been onboarding. We will pull every record (any status, all countries — predominantly Nigeria with some South African hospitals like Sandton Mediclinic) and load them into this app's `holarchelp_hospitals` and `holarchelp_ambulance_providers` tables.

### B1. Source data fetch
- Add a one-shot admin-only edge function `import-guardian-providers` that:
  - Verifies the caller has `admin` role.
  - Calls the source project's REST API with its anon key (`https://bwftujklwsdomdxmbotk.supabase.co/rest/v1/hospitals` and `/ambulance_providers`) using `select=*`. The source's RLS exposes approved+active rows publicly, so we will additionally need a service-role read for non-approved rows. To keep the import complete and auditable, we will accept the source `service_role` key as a one-time secret `GUARDIAN_SOURCE_SERVICE_KEY` (added via the secrets tool). I'll request it before deploying the function.
  - Maps each row's columns 1:1 into the target schema (column lists already match: `name/owner_id/registration_number/address/city/state/country/contact_email/contact_phone/lat/lng/services/bed_capacity/icu_capacity/beds_available/icu_available/at_capacity/tier/status/subscription_status/approved_at/created_at/updated_at` for hospitals; `company_name/...` for ambulances).
  - Upserts on `id` so re-running is idempotent.
  - For any source `owner_id` UUID that does not exist in this project's `auth.users`, sets `owner_id` to a placeholder admin user (the caller) so FK-less inserts still succeed and admins retain edit rights.
  - Returns counts: `{ hospitals_imported, ambulances_imported, skipped }`.

### B2. Trigger the import
- Add a button "Import from Holarc Guardian" on `/admin/holarchelp-providers` (admin only) that invokes the edge function and toasts the result. We'll run it once.
- All imported rows keep their original `status` (mostly `approved`) and `subscription_status='active'` so they immediately appear on the responder map.

### B3. Backfill missing tier/coordinates
- After import, run a small SQL backfill mirroring the source `activate_seed_providers` migration: ensure `subscription_status='active'` for approved rows and that capacity defaults are sensible.

## Part C — Switch HolarcHelp ON for all South African and Nigerian users

1. Schema: add a partial index on `profiles(country)` (cheap; many rows).
2. Data update (via insert/data tool — not a schema migration): set `holarchelp_enabled = true` for every profile whose `country` matches South Africa or Nigeria. We will accept these case-insensitive variants:
   - `'South Africa'`, `'south africa'`, `'ZA'`, `'RSA'`
   - `'Nigeria'`, `'nigeria'`, `'NG'`
3. Add a lightweight DB trigger on `profiles` so any newly inserted profile with `country` in (ZA, Nigeria) is auto-enabled. This keeps future signups consistent with the policy without further admin work.
4. Leave the global `app_modules.holarchelp.enabled` flag = true (already on).

## Verification
- `/patient/holarchelp` no longer shows "Not enabled yet" for: the two admins, any ZA user, any NG user.
- `/admin/holarchelp-providers` lists all imported hospitals and ambulance providers, with correct status/tier badges and approve/suspend actions working.
- The public responder map (existing) shows the imported approved providers with coordinates.
- Re-running the import is a no-op (idempotent upsert).

## Technical notes
- Source project ref: `bwftujklwsdomdxmbotk` (Holarc Guardian).
- Required new secret: `GUARDIAN_SOURCE_SERVICE_KEY` (source project's service_role JWT). I'll request it with the secrets tool before deploying the edge function. If you'd rather only import publicly-visible (approved+active) rows, we can skip the secret and use the anon key only — say the word.
- No destructive changes: imports use `upsert` on primary key; country enablement only flips a boolean and never disables existing per-user opt-ins.