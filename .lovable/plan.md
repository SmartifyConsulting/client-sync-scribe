## Problem

Closing an incident at `/patient/holarchelp/incident/...` fails with:

> new row violates row-level security policy for table "holarchelp_incidents"

The UPDATE itself is well-formed. The block comes from the `WITH CHECK` clause on the `Users manage own incidents` policy:

```
(auth.uid() = user_id) AND holarchelp_user_enabled(auth.uid())
```

`holarchelp_user_enabled(uid)` requires **both** of:
- `app_modules.enabled = true` where `module_key = 'holarchelp'`
- `profiles.holarchelp_enabled = true` for that user

For Georgia (`7c12a364-…`) it currently returns `false`, so any UPDATE on her own incident is rejected — even though she owns it and can SELECT it. The same will happen to any patient whose `holarchelp_enabled` flag is off, or to everyone if the global module is off.

## Plan

### 1. Data fix (immediate unblock)
- Confirm `app_modules.enabled = true` for `module_key = 'holarchelp'`. If false, set it true.
- Set `profiles.holarchelp_enabled = true` for Georgia so she can close her active incident.

### 2. RLS fix (root cause)
The `holarchelp_user_enabled` gate on the **owner** policy is wrong: a patient who created an incident while HolarcHelp was enabled must always be able to close/manage that incident, even if the toggle is later turned off (otherwise their live SOS gets stuck open forever).

Change the `Users manage own incidents` policy so the enabled check only gates **INSERT** (creating new incidents), not UPDATE/DELETE/SELECT on incidents they already own. Concretely:

- Drop `Users manage own incidents` (FOR ALL).
- Recreate as four policies:
  - `SELECT` USING `auth.uid() = user_id`
  - `UPDATE` USING `auth.uid() = user_id` WITH CHECK `auth.uid() = user_id`
  - `DELETE` USING `auth.uid() = user_id`
  - Keep existing `Users insert own incidents` (FOR INSERT) and add the `holarchelp_user_enabled(auth.uid())` check there only.

This preserves the intent (only enabled users can *start* a SOS) without trapping owners out of their own historical/active records.

### 3. Verification
- Re-attempt closing incident `3da9c115-…` as Georgia → should succeed and redirect to `/patient/holarchelp`.
- Try creating a fresh SOS as a user with `holarchelp_enabled = false` → should still be denied at INSERT time.

### Files / changes
- Data update: `app_modules` (if needed) and `profiles.holarchelp_enabled` for Georgia (insert tool).
- Migration: drop + recreate the owner policies on `public.holarchelp_incidents` as described.
- No frontend code changes.
