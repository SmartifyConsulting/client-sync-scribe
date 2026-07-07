# Fix: Renken doesn't see the SOS in the incoming queue

## What's happening

Shannon's SOS (INC-2026-001080) was correctly assigned to Renken:
- `holarchelp_incidents.assigned_provider_id` = Renken
- `holarchelp_incident_offers` row for Renken has `response = 'accepted'`

But Renken's dashboard "Incoming SOS" panel (`EmergencyDashboardScreen.tsx`) filters to:
```
status IN ('open','reopened')  AND  assigned_paramedic_user_id IS NULL
```

The demo override in `holarchelp_auto_assign_incident` flips the incident to `status = 'assigned'` and inserts an already‑accepted offer for Renken. So the incident short‑circuits past the incoming queue and only appears under **Active Missions** (which is exactly what the session shows — the "Active mission" link for `80c28537…` was rendered right after login).

The user wants the incident visible in the **Incoming SOS queue** so they can demo Renken tapping Accept.

## Fix (single migration)

Rewrite `holarchelp_auto_assign_incident` so the Renken demo branch:

1. Leaves the incident in `status = 'open'` (does NOT set `assigned_provider_id`, `assigned_at`, or flip to `assigned`).
2. Inserts a **pending**, priority-boosted offer for Renken with `distance_km = 0`:
   ```sql
   INSERT INTO holarchelp_incident_offers
     (incident_id, provider_id, provider_kind, response, priority_boost, distance_km)
   VALUES (_incident_id, _renken_id, 'ambulance', 'pending', true, 0)
   ON CONFLICT (incident_id, provider_id) DO UPDATE
     SET response = 'pending', priority_boost = true, distance_km = 0, offered_at = now();
   ```
3. Logs an `auto_offered` (or reuse `auto_assigned`) event so the audit trail still shows the demo hook fired.
4. Skips the old nearest‑ambulance auto‑accept path entirely for the demo (otherwise another provider might accept before Renken taps Accept and Renken would lose the incident).

`holarchelp_get_incident_offers` keeps the Renken‑at‑top override from the previous migration — no change needed there.

## Result

- Renken signs in → **Incoming SOS** shows Shannon's incident with incident number, severity, and Accept button.
- Renken taps Accept → normal `holarchelp_accept_incident` flow runs, incident becomes `assigned` to Renken, moves to Active Missions.
- Patient's "Available ER providers" list still shows Renken first (unchanged).

## Revert after demo

Restore `holarchelp_auto_assign_incident` to its pre‑demo body (nearest‑ambulance auto‑accept, no Renken override) alongside restoring `holarchelp_get_incident_offers`.
