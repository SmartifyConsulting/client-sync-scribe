# ER Provider Portal — Workflow Rework

Goal: make the Ambulance portal match how EMS actually works and remove confusing UI. No new help page — the screens themselves must read intuitively.

## How it will work (target workflow)

```
Provider (company)
 └── Many Vehicles on shift simultaneously
       └── Each Vehicle has a Crew (1 lead + optional partners) for that shift
             └── A Vehicle is assigned to ONE active Incident at a time
```

Roles inside an ER Provider:
- **Dispatcher** (desk): sees all incoming SOS, picks vehicle, assigns crew.
- **Crew** (in the ambulance): clocks onto a vehicle, acknowledges assignments, drives the mission.
- **ER_Admin**: manages fleet, members, hospitals.

Dispatch rule (hybrid):
- If a Dispatcher is on duty → SOS goes to Dispatcher console; crew gets "Acknowledge / Rolling".
- If no Dispatcher is on duty → crew can self-accept from Incoming SOS (today's behavior).

## Changes

### 1. Data model (small additions)
- `vehicle_shifts` (new): one row per vehicle currently on shift. Columns: `provider_id`, `vehicle_id`, `lead_user_id`, `status` (available/busy/off), `current_incident_id`, `started_at`, `ended_at`.
- `vehicle_shift_crew` (new): `vehicle_shift_id`, `user_id`, `role` (lead/partner).
- Keep `paramedic_shifts` for back-compat; new code reads/writes `vehicle_shifts`. Migrate the "1 crew = 1 vehicle" rows on the fly.
- Add `dispatcher_on_duty` boolean on `holarchelp_ambulance_providers` (toggled by Dispatcher clocking in).

### 2. Stats strip (`AmbulanceOpsLayout.tsx`)
Reordered, deduped:
```
[ Start Shift / End Shift ]  [ ●ON SHIFT · busy/available ]  [ Active Mission #INC-… ]   …  [online]
```
- "Start Shift" action chip is first when off-shift.
- On/Off status chip second.
- Active Mission chip only renders when there IS one (no "Standing by" filler).
- **Remove Open SOS chip** (already on dashboard).

### 3. Start Shift dialog
Now asks: **Vehicle** + **Crew partners (optional, multi-select from provider members)**. Lead = current user. Creates a `vehicle_shifts` row + crew rows.

### 4. Incoming SOS screen (crew view)
- If `dispatcher_on_duty` = true → banner "Dispatcher is assigning units" and the Accept button is replaced by **Acknowledge** which only appears once Dispatcher assigns this vehicle.
- If `dispatcher_on_duty` = false → today's self-accept flow stays (renamed button to **Accept & Roll**).
- Remove the word "Dispatch" from this screen.

### 5. New Dispatcher Console (`/provider/ambulance/dispatch`)
Sidebar item visible to users with role `dispatcher` or `er_admin`. Three columns:
- Open SOS queue (sev-sorted)
- Available vehicles (live, with crew names + GPS)
- Selected incident detail → **Assign Vehicle** button opens picker, sets incident.assigned_provider/vehicle/lead, sets vehicle status busy, notifies crew.

Toggle at top: **"I am on duty as Dispatcher"** → flips `dispatcher_on_duty`.

### 6. Active Mission / Navigation
No structural change — already vehicle-centric. Just shows assigned vehicle + crew names on the side panel.

### 7. Fleet Live
Group markers by vehicle; show crew names on hover. No change to map tech.

## Why each of your points is addressed

| Your concern | Fix |
|---|---|
| Can a shift have many vehicles? | Yes — shifts are now per-vehicle, provider has many concurrent `vehicle_shifts`. |
| OFF SHIFT shows before ON SHIFT | Action chip (Start Shift) moves to position 1; status chip becomes secondary. |
| Open SOS duplicated | Removed from strip; lives on dashboard only. |
| What does Accept/Dispatch do? | Two clearly separated flows: Dispatcher **Assigns**, Crew **Acknowledges** (or **Accepts & Rolls** when no dispatcher). Word "Dispatch" only appears in the Dispatcher console. |
| Shouldn't the dispatcher pick the vehicle? | New Dispatcher Console does exactly that. |

## Out of scope
- Multi-vehicle convoy on one incident (still 1 vehicle ↔ 1 incident).
- Shift scheduling/rosters in advance (clock-in only, like today).
- In-app help page (per your direction — UI must be self-explanatory).

## Files touched
- DB: new migration for `vehicle_shifts`, `vehicle_shift_crew`, `dispatcher_on_duty` column, RPCs `start_vehicle_shift`, `end_vehicle_shift`, `dispatcher_assign_vehicle`, `crew_acknowledge`.
- `src/modules/holarchelp/pages/provider/ambulance/AmbulanceOpsLayout.tsx` — strip reorder, remove Open SOS chip, hide Active Mission when none.
- `src/modules/holarchelp/components/StartShiftDialog.tsx` — vehicle + crew picker.
- `src/modules/holarchelp/hooks/useParamedicShift.ts` → rename/extend to `useVehicleShift.ts`.
- `src/modules/holarchelp/pages/provider/ambulance/IncomingSosScreen.tsx` — hybrid Accept/Acknowledge, remove "Dispatch" wording.
- New `src/modules/holarchelp/pages/provider/ambulance/DispatchConsoleScreen.tsx` + route + sidebar entry (role-gated).
- `FleetLiveScreen.tsx` — show crew names per vehicle.
- i18n keys for new labels across all 25 locales.
