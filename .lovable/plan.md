## Patient SOS map + ER provider test-login

### Part A — Show ambulance marker + distance while waiting for ER pickup

**Problem.** In `SosLiveMap.tsx`, both the ambulance marker and the distance/ETA badge are gated on a destination hospital being set:

- `phase = "selecting"` whenever `hospital` is null (before the ER picks one).
- `points` hides the provider in selecting: `if (phase !== "selecting" && provider)`.
- The countdown/distance badge only renders for `pickup` / `transport`.

So the patient sees only their own pin and no km/ETA, even though the code already resolves the nearest available ER provider.

**Fix (frontend only, `src/modules/holarchelp/components/SosLiveMap.tsx`):**

1. Render the ambulance marker during `selecting` — drop the `phase !== "selecting"` guard in the `points` memo. Label it `"Nearest ER"` until `assigned_provider_id` exists, then `"Ambulance"`.
2. Draw the red patient↔ambulance line during `selecting` too — remove the `if (phase === "selecting") return rs;` early-return in the `routes` memo (hospital/transport routes stay gated as today).
3. Add a `searchEta` effect mirroring the existing pickup/transport ETA effects: when `phase === "selecting"` with both `provider` and `patient`, call `fetchEta` (1 s debounce, `routes-eta` → `fallbackEta`). Render a `CountdownBadge` with `label="NEAREST ER"`, `arriveText="ER nearby"` so the patient sees live km + minutes.
4. Re-run the nearest-ER lookup when the realtime `holarchelp_locations` INSERT first delivers `patient`, gated on `assigned_provider_id IS NULL` and no live `provider`. Extract the existing block into a small helper. No behaviour change once assigned.

### Part B — Test-login for "National Emergency Medical Services"

Goal: let the developer one-click sign in as an ER provider account so they can pick up an SOS, see the patient incident, and select a destination hospital (which then shows on the patient app via existing realtime).

**B1. Seed a real ER provider account + membership (migration + seed data).**

- Pick the existing `holarchelp_ambulance_providers` row whose `company_name = 'National Emergency Medical Services'` (one of the seeded Johannesburg providers). If absent, insert it (Randburg coords, `status='approved'`, `subscription_status='active'`, `accepting_patients=true`, `tier='tier_2'`, `dispatch_priority=0`).
- In a one-off `supabase--insert` (no auth context), provision an auth user `ner.test@holarchealth.test` / password `ErTest1234!` via direct insert into `auth.users` is not possible — instead handle this through an edge function: add a tiny admin-only edge function `seed-test-er-user` that uses the service-role client to:
  - `auth.admin.createUser({ email, password, email_confirm: true })` (idempotent: if user exists, fetch them).
  - Insert into `public.profiles` with `full_name='NEMS Dispatcher'`, country `South Africa`.
  - Insert into `public.user_roles` with `role='ambulance_staff'`.
  - Insert into `public.holarchelp_ambulance_members` (`provider_id` = NEMS provider id, `user_id`, `role='admin'`) on conflict do nothing.
  - Returns `{ user_id, provider_id, email }`.
- Function deploys automatically; no secrets needed beyond `SUPABASE_SERVICE_ROLE_KEY` (already provisioned).

**B2. One-click "Sign in as NEMS dispatcher" button.**

- Add a small dev-only button on `/auth` (visible only when `import.meta.env.DEV` or when `?devLogin=1`) that:
  1. Calls `seed-test-er-user` once (idempotent) to guarantee the account exists.
  2. Calls `supabase.auth.signInWithPassword({ email: 'ner.test@holarchealth.test', password: 'ErTest1234!' })`.
  3. On success navigates to `/emergency` (existing ambulance dispatcher route).
- File: new `src/components/auth/DevErLoginButton.tsx`; mounted in the existing `Auth` page below the normal form, in a `Dev only` callout. No other auth UX changes.

**B3. Verify the ER pickup → hospital select flow already wires through.**

Already in place — only call out so the user knows what to expect after logging in:

- `/emergency` shows open incidents with `AvailableResponders` accept buttons (ambulance-only after recent migration).
- After accept, `holarchelp_accept_incident` flips `status='assigned'` and writes `assigned_provider_id`.
- The ER provider opens the incident and uses the existing `HospitalPicker` to set `destination_hospital_id`.
- `notify_hospital_inbound` trigger + the patient's `SosLiveMap` realtime subscription on `holarchelp_incidents` UPDATE already pick up `destination_hospital_id` and render the red hospital marker + teal line on the patient screen, exactly as designed in Part A.

No changes needed to `dispatch-sos`, `holarchelp_auto_assign_incident`, `HospitalPicker`, or hospital RLS.

### Files

- `src/modules/holarchelp/components/SosLiveMap.tsx` — Part A edits.
- `supabase/functions/seed-test-er-user/index.ts` — new admin edge function (service role).
- `src/components/auth/DevErLoginButton.tsx` — new dev button.
- `src/pages/Auth.tsx` (or whichever auth page is current) — mount the dev button.
- Optional migration: ensure the NEMS provider row exists with the correct coords/status (idempotent `INSERT ... ON CONFLICT`).

### Out of scope

- Production user provisioning, password rotation, MFA. The seeded account is for dev/QA only and is gated behind a DEV/`?devLogin=1` check on the UI.
- `AvailableResponders.tsx`, auto-assign, dispatch-sos, severity dialog double-fire — already shipped in earlier turns.