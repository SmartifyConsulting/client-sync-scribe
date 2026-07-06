## Problem summary (what's really happening)

I traced each of your three complaints to a specific bug.

### 1. Renken doesn't see INC-2026-001077 in the SOS queue

The incident **is** in the database (`status: open`), and Renken **is** on the offer list for it (row exists in `holarchelp_incident_offers` for provider `121ae7…`, response `pending`). So dispatch worked.

The Dispatcher Console however reads the `holarchelp_incidents` table **directly**, and the RLS policies on that table only let a provider read an incident once it has been **assigned** to them (`assigned_provider_id = …`) or if they are the destination hospital. There is no policy that lets an ambulance provider read incidents where they have a *pending offer*. Result: Renken's dispatcher gets zero rows back, so the queue shows old test data only.

### 2. "Available Vehicles" column is empty even though Fleet Admin shows RA‑01..RA‑06 as Available

The "Available Vehicles" column is not showing vehicles at all — it's showing **paramedic shifts** (rows in `paramedic_shifts` where `status='available'`). Renken has no shifts started, so it renders "No vehicles on shift available." The Fleet Admin vehicles (`ambulances` table with `status='available'`) are never read here. Two different concepts glued to the same column.

### 3. "I don't see AMB‑001/002/003 from Live Fleet in Admin"

Those AMB‑00x codes only exist inside a hardcoded `MOCK_AVAILABILITY` / `MOCK_DETAILS` array in the legacy `VehicleAvailabilityScreen.tsx` and similar demo screens. Renken's real fleet in the DB is RA‑01…RA‑06 (which is what Fleet Admin correctly shows). Nothing is missing — the "Live Fleet" screen is showing fake demo data that never came from your provider.

---

## Plan

### A. Fix visibility so Renken's dispatcher can see incoming SOS (root cause of #1)

Add a Postgres migration with one new SELECT policy on `holarchelp_incidents`:

```sql
CREATE POLICY "Provider staff read offered incidents"
ON public.holarchelp_incidents FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.holarchelp_incident_offers o
    WHERE o.incident_id = holarchelp_incidents.id
      AND (
        is_ambulance_staff(o.provider_id, auth.uid())
        OR is_hospital_staff(o.provider_id, auth.uid())
      )
  )
);
```

Also narrow the Dispatcher Console query so it only lists incidents that were *offered to this provider* (avoid leaking global open incidents once the policy is in place):

- In `DispatcherConsoleScreen.tsx`, change the `holarchelp_incidents` fetch to inner-join through `holarchelp_incident_offers` filtered by `provider_id = providerId` and `response = 'pending'`.

After this, INC‑2026‑001077 will appear for Renken and every other offered provider.

### B. Rebuild the middle column as "Available Vehicles" (real vehicles) with drag‑and‑drop (root cause of #2)

In `DispatcherConsoleScreen.tsx`:

- Replace the current `paramedic_shifts`‑backed list with a query on `ambulances` where `provider_id = providerId` AND `status = 'available'`. Show `vehicle_code`, `registration_number`, and (if a paramedic shift exists for that ambulance) the crew lead.
- Keep a small "On a call" section fed by `ambulances.status = 'assigned'`.
- Add HTML5 drag‑and‑drop:
  - Left column SOS cards get `draggable`, dragging carries the `incident_id`.
  - Right on each vehicle card, `onDrop` calls a new RPC `holarchelp_dispatcher_assign_vehicle(_incident_id, _ambulance_id)` that: picks the first paramedic shift on that ambulance (if one exists) and calls the existing assign logic; if no shift, creates a minimal shift stub or falls back to assigning at the provider level and paging the crew.
  - Visual affordance: dashed primary border + "Drop to dispatch" hint when a card is dragged over.
  - Keep the existing "Assign to selected SOS" button as a click‑fallback for touch/keyboard users.

### C. Retire the fake "Live Fleet" demo data (root cause of #3)

- `VehicleAvailabilityScreen.tsx` and any sibling screen that still uses the `AMB‑001/002/003` `MOCK_AVAILABILITY` / `MOCK_DETAILS` arrays: replace with a live query on `ambulances` scoped by `provider_id`. If a screen was pure demo with no real equivalent, remove its nav entry rather than leave misleading data.
- Remove the `MOCK_DETAILS` object in `FleetOperationsScreen.tsx` (make/mileage/utilization/trips) so Fleet Admin no longer implies extra data for AMB‑00x codes it will never match. Either wire those stats to real columns if they exist on `ambulances`, or drop the block.

Renken will then see exactly RA‑01..RA‑06 everywhere, and no ghost AMB entries.

### D. Verification

1. Reload Dispatcher Console as Renken user → INC‑2026‑001077 appears in Open SOS.
2. Middle column lists RA‑01, RA‑03, RA‑04 (status `available`); RA‑02, RA‑05 in "On a call"; RA‑06 hidden (out_of_service).
3. Drag INC‑2026‑001077 onto RA‑01 → toast "Vehicle assigned", incident moves off the queue, RA‑01 flips to `assigned`.
4. Open the Vehicle Availability / Live Fleet screens → they show RA‑01..RA‑06 only, no AMB‑00x.

### Files touched

- New: `supabase/migrations/<ts>_incidents_provider_offer_select.sql`
- New: `supabase/migrations/<ts>_holarchelp_dispatcher_assign_vehicle.sql`
- Edit: `src/modules/holarchelp/pages/provider/ambulance/DispatcherConsoleScreen.tsx`
- Edit: `src/modules/holarchelp/pages/provider/ambulance/VehicleAvailabilityScreen.tsx`
- Edit: `src/modules/holarchelp/pages/provider/ambulance/FleetOperationsScreen.tsx` (drop mock stats)
- Sweep: other ambulance screens still importing `AMB-001/002/003` mocks — wire to `ambulances` table or remove.

No schema changes to existing tables; only one new policy and one new RPC.
