## Root cause

The `holarchelp_hospitals` / `holarchelp_ambulance_providers` tables require `auth.uid() = owner_id` to insert. After `supabase.auth.signUp()` with email confirmation enabled, the new user has **no active session**, so `auth.uid()` is null and the insert is rejected by RLS. Same path will fail on hospital and ambulance signups.

## Fix strategy

Move the provider creation to a service-role edge function so the row is inserted server-side with the new user's id. This also lets sign-up work even when email confirmation is required. While we are there, add Google-Places autocomplete to the address field and auto-derive city/country/lat/lng/company name (when the picked place looks like the company itself).

## Changes

### 1. New edge function `supabase/functions/register-emergency-provider/index.ts` (service role)
- Public (no JWT). `verify_jwt = false` in `supabase/config.toml`.
- Body: `{ type: "hospital"|"ambulance", company_name, registration_number, ownership: "public"|"private", address, city, country, latitude, longitude, first_name, last_name, email, phone, password }`.
- Validates with zod (lengths, ownership enum, email).
- Uses service role to:
  1. `auth.admin.createUser({ email, password, email_confirm: false, user_metadata: { full_name } })`.
  2. Update `profiles` row created by the `handle_new_user` trigger with `full_name` and `mobile_number`.
  3. Insert into the appropriate provider table (hospital or ambulance), with `owner_id = newUser.id`, `ownership`, address fields, `latitude/longitude`, and `status = 'pending'`.
- Returns `{ user_id }` or an error message.

### 2. New public edge functions for address lookup during signup
Reuse logic from `google-places-autocomplete` / `google-place-details` but **without the JWT requirement**, since the user is not yet signed in. Two options:

- **Preferred**: add `?public=1` branch to existing functions that skips `getClaims` but still uses the same `GOOGLE_MAPS_API_KEY`. Add a simple in-memory rate-limit (per-IP, e.g. 30/min) to mitigate abuse.
- Or new files `places-autocomplete-public` / `place-details-public` mirroring the existing ones with no auth check.

Will go with the "new files" approach to avoid touching authenticated paths used elsewhere. Set `verify_jwt = false` for both in `supabase/config.toml`.

### 3. New component `src/modules/holarchelp/components/PublicAddressPicker.tsx`
Same UX as `AddressAutocomplete` but:
- Calls the public edge functions directly with `fetch` (no Supabase auth needed) using `VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY` apikey header.
- Exposes `onSelect({ formatted_address, name, city, country, lat, lng })` in addition to the typed value.

### 4. `src/pages/ProviderSignup.tsx`
- Replace the address `Textarea` with `<PublicAddressPicker />`.
- Remove the manual City and Country inputs; show them read-only below the address (auto-filled from selection). Keep editable fallback if the user types a free-text address that wasn't picked from suggestions.
- Keep the Public/Private toggle (already present).
- Submit by calling the new `register-emergency-provider` edge function via `fetch` (no authenticated supabase needed). On success: toast and redirect to `/auth?mode=login`.
- Remove direct `supabase.from(...).insert(...)` calls and the `signUp` call from this page.

### 5. Out of scope
- No RLS policy changes (existing policies are correct; the issue is that signup happens before login).
- No changes to existing authenticated address autocomplete used elsewhere in the app.
- Custom domain/Google API key restrictions are unchanged — the edge function already proxies via the server-side key, so the preview domain works.

## Technical notes

- `auth.admin.createUser` with `email_confirm: false` keeps the existing "verify email before login" flow intact; the user will still need to confirm their email at `/auth` to sign in. The provider record is created immediately so admins can review pending applications regardless of confirmation status.
- The existing `handle_new_user` trigger inserts the `profiles` row automatically — the edge function only needs to update `full_name` / `mobile_number`.
- Ownership column already exists on both provider tables (added in the previous migration).
