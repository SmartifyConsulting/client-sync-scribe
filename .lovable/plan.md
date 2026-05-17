## Problem

The incident timeline already records `auto_assigned` events with `provider_id` set (verified in DB for the current incident — Mediclinic Sandton). The `IncidentTimeline` component supports rendering "Auto-assigned · 🏥 {name}", but the provider name never appears because the lookup uses direct `select` against `holarchelp_hospitals` / `holarchelp_ambulance_providers`. RLS blocks those reads for the patient (they aren't owner/staff, and many offered providers have `subscription_status = inactive`), so `providers[pid]` stays empty and the "· 🏥 Name" suffix is suppressed.

This is the same class of bug we fixed for `AvailableResponders` — that fix went through the new `holarchelp_get_incident_offers` RPC. The timeline was missed.

## Fix

### 1. Database — add a safe public resolver

Create a `SECURITY DEFINER` SQL function:

```
holarchelp_get_incident_providers_public(_incident_id uuid)
  returns table(id uuid, kind text, display_name text)
```

It checks the caller is the incident owner, an assigned provider's staff, or an admin (same auth pattern as the offers RPC). It returns id/kind/display_name for every provider referenced by that incident's events (from `provider_id` and `payload->>'provider_id'`), regardless of subscription/approval status — name + kind only, no sensitive fields.

### 2. Frontend — `src/modules/holarchelp/components/IncidentTimeline.tsx`

Replace the two direct `.from("holarchelp_ambulance_providers"…)` / `.from("holarchelp_hospitals"…)` lookups with a single `supabase.rpc("holarchelp_get_incident_providers_public", { _incident_id: incidentId })` call. Keep the existing render logic; the suffix "· 🏥 Mediclinic Sandton" will then appear on `auto_assigned`, `accepted`, `en_route`, etc.

Also extend `PROVIDER_EVENTS` only if needed (already covers `auto_assigned`).

### Files touched
- New migration: `holarchelp_get_incident_providers_public` function
- `src/modules/holarchelp/components/IncidentTimeline.tsx`

No UI/business-logic changes elsewhere.
