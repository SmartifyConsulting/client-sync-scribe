# Dispatcher Console: hospitals, assigned SOS visibility, and Renken demo data

Focus is `EmergencyDashboardScreen.tsx` and `DispatcherConsoleScreen.tsx`. Existing drag-and-drop from Open SOS → Available vehicles stays as-is; plan extends what's shown, adds a hospitals panel, and seeds demo rows for Renken.

## 1. Show assigned SOS in the Incoming and Open SOS frames

Today both panels filter tightly:
- **Incoming SOS** (EmergencyDashboardScreen): `status IN ('open','reopened') AND assigned_paramedic_user_id IS NULL`
- **Open SOS** (DispatcherConsoleScreen): only offers with `response = 'pending'` AND incident `status IN ('open','reopened')`

Once an incident is auto-assigned or accepted (status → `assigned`), it drops out of both. Fix:
- Widen both loaders to also include incidents whose `assigned_provider_id = <this provider>` and status ∈ `['assigned','en_route','arrived','patient_collected','en_route_to_hospital','at_hospital']` — but only `assigned` rows are draggable.
- Render assigned rows with a distinct chip ("ASSIGNED · needs vehicle" if no `assigned_paramedic_user_id`, else "ROLLING · <vehicle_code>") so dispatchers can tell them apart from truly incoming ones.
- Rows already crewed become read-only (no drag).

## 2. Approved destination hospitals panel

Add a fourth column in `DispatcherConsoleScreen` (stacks on smaller screens):

```text
┌ Open SOS ┐ ┌ Vehicles ┐ ┌ Selected ┐ ┌ Destination Hospitals ┐
│ INC-…080 │ │ AMB-01   │ │ INC-…080 │ │ • Netcare Milpark 4.1km│
│ CRIT MVC │ │ AMB-02   │ │ CRIT MVC │ │ • Life Fourways   6.8km│
└──────────┘ └──────────┘ └──────────┘ └────────────────────────┘
```

Query: `holarchelp_hospitals` where `status = 'approved'` AND `subscription_status = 'active'` AND `accepting_patients = true`. Order by distance from the selected incident's lat/lng (haversine, JS); alphabetical when nothing selected. Each row shows name, ownership badge, distance, "Set destination" button. Clicking calls new SECURITY DEFINER RPC `holarchelp_set_destination_hospital(_incident_id, _hospital_id)` that updates `holarchelp_incidents.destination_hospital_id` and inserts a `destination_selected` event; guarded to the assigned provider or its dispatcher. If a destination is already set, its row is highlighted with "Change".

## 3. Demo dummy SOS data for Renken

For demo polish, seed 3–4 realistic dummy incidents so Renken's panels never look empty:

- Insert into `holarchelp_incidents` with `user_id = null` (or a demo patient), `incident_number` = `DEMO-001…004`, varied `severity` (`critical`, `high`, `moderate`), varied `incident_type` (`MVC`, `Cardiac`, `Fall`, `Stroke`), realistic `notes`, `latitude`/`longitude` clustered ~1–8 km around Renken's HQ, `created_at` staggered (2m, 8m, 22m ago).
- For each, insert a matching `holarchelp_incident_offers` row for Renken (`121ae795-…`) with `response = 'pending'`, `priority_boost = true`, `distance_km` from haversine.
- Two rows stay `status = 'open'` → land in **Incoming SOS** and **Open SOS**. One row is set to `status = 'assigned'` with `assigned_provider_id = Renken` and no `assigned_paramedic_user_id` → land in Open SOS with the new "ASSIGNED · needs vehicle" chip so the dispatcher can demo dragging it onto a vehicle.
- Also insert one `holarchelp_locations` row per incident so the map + hospital-distance ordering work.
- Add matching `incident_number` values under a `DEMO-` prefix so we can wipe them later with a single `DELETE ... WHERE incident_number LIKE 'DEMO-%'`.

Data insert only — no schema change. Run via the insert tool right after the migration.

## 4. Nothing else changes

- DnD Open SOS → Available Vehicles unchanged.
- Realtime channels already subscribe to `holarchelp_incidents` / `_offers`; add one subscription to `holarchelp_hospitals` for live approval updates.
- No new tables/RLS; `destination_hospital_id` already exists on `holarchelp_incidents`.

## Files touched

- `src/modules/holarchelp/pages/provider/ambulance/EmergencyDashboardScreen.tsx` — widen Incoming loader, add assigned chip.
- `src/modules/holarchelp/pages/provider/ambulance/DispatcherConsoleScreen.tsx` — widen Open SOS loader, add Destination Hospitals section (4-col on `xl:`, stack below).
- One migration: `holarchelp_set_destination_hospital` RPC.
- One data insert: 3–4 `DEMO-` incidents + offers + locations for Renken.

## Revert after demo

`DELETE FROM holarchelp_incident_offers WHERE incident_id IN (SELECT id FROM holarchelp_incidents WHERE incident_number LIKE 'DEMO-%');`
`DELETE FROM holarchelp_locations WHERE incident_id IN (SELECT id FROM holarchelp_incidents WHERE incident_number LIKE 'DEMO-%');`
`DELETE FROM holarchelp_incidents WHERE incident_number LIKE 'DEMO-%';`
