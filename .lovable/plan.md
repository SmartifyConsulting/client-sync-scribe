## Demo fixes: always auto-assign to Renken + fix SOS for Dean Allie

### Part 1 — Always auto-assign to Renken (demo)

Every new patient SOS should be auto-assigned to **Renken Ambulance
Service** (`121ae795-b2b1-4693-93bf-a2ba1dfdaeae`) so its incident
number is guaranteed to appear in Renken's incoming queue.

Approach — one migration, two functions updated:

1. **`holarchelp_get_incident_offers`** — in the "no offers yet"
   fallback list for the patient, always include Renken first with
   `distance_km = 0` regardless of real distance. Renken shows in
   "Available ER providers" even in areas with no other coverage.

2. **`holarchelp_auto_assign_incident`** — before the existing
   "nearest pending ambulance" query, insert a Renken pending offer if
   one doesn't already exist, then pick Renken. Fall back to the current
   nearest-ambulance logic only if the Renken insert fails.

The 30-second countdown, "+30s more time" extend, and change-provider
window all keep working — Renken simply wins the auto-assign at 0:00.
Renken UUID is a single `_renken_id` constant so it's easy to remove
after the demo.

### Part 2 — Fix SOS for the "Dean Allie" patient profile

SOS doesn't work when **Dean Allie** (who has both a doctor account
`sme@smartify.co.za` and a patient account `dean.allie@gmail.com`) fires
it from his patient profile. Investigate before writing the fix. Likely
suspects (all have hit this app before):

- **Multi-role resolution collision** — Dean Allie is both a doctor and
  a patient, so the SOS entry point may be resolving his role to
  "doctor" (which follows the "trigger SOS for a patient" branch that
  needs a target patient) instead of "patient" (self-SOS). Result: the
  button either no-ops or calls the wrong edge function.
- **Patient-record vs auth-user `user_id` mismatch** — SOS created with
  the patient record's `id` instead of the linked auth `user_id`, so
  RLS blocks the follow-up offers/locations/dispatch calls.
- **Missing location** — patient profile page doesn't request geolocation
  before calling `dispatch-sos`, so it throws "no location for incident"
  and no offers get created (silent failure on screen).

Steps:

1. Reproduce as Dean Allie's patient profile (`dean.allie@gmail.com`),
   watch console + network for the failing request, and check what row
   (if any) lands in `holarchelp_incidents`.
2. Fix the branch that's actually wrong:
   - Role collision: force the SOS button on `/patient/*` routes to use
     the patient self-SOS path regardless of any doctor role the same
     account holds.
   - `user_id` mismatch: use the linked auth `user_id` when creating the
     incident.
   - Missing location: request geolocation up front and pass it to
     `dispatch-sos`; show a clear toast if the browser denies it.
3. Re-test end-to-end so the incident appears in Renken's incoming queue
   (validating Part 1 at the same time).

### Technical details
- Part 1: single Postgres migration under `supabase/migrations/`
  updating the two functions above. No frontend changes.
- Part 2: frontend + possibly `supabase/functions/dispatch-sos` edits,
  driven by what the reproduction reveals. No schema changes expected.

### How to revert Renken override after the demo
Re-run the two `CREATE OR REPLACE FUNCTION` bodies without the
`_renken_id` override lines (their pre-migration versions).
