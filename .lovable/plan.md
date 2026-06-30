## 1. Fix "column date_of_birth does not exist"

`get_emergency_patient_context` reads `date_of_birth`, `gender`, `blood_type`, `allergies`, `chronic_conditions` from `profiles` — those columns live on `patients`. Migration recreates the RPC so the `profile` block joins `profiles` (name, mobile, language) with the linked `patients` row (dob, gender, blood type, allergies, chronic conditions), falling back to `null` when no patient record exists.

## 2. Status becomes a read-only auto-stepper

In `NavigationScreen.tsx`, replace the 6 clickable step buttons with a non-interactive visual stepper (numbered circles + connecting lines, current step highlighted). No clicks on stages.

### Auto-transition rules (driven by GPS pings + destination hospital)

New DB function `holarchelp_auto_advance_status` fires from an AFTER INSERT trigger on `holarchelp_provider_locations` for rows tied to an active incident, and is also called by the simulator:

| Detected condition (pings + speed + distance) | New status |
|---|---|
| Vehicle starts moving after accept | `en_route` |
| Vehicle stops within 75 m of incident pickup | `arrived` |
| Vehicle starts moving again after ≥ 30 s stopped at scene | `patient_collected` → `en_route_to_hospital` |
| Vehicle stops within 100 m of `destination_hospital_id` | `at_hospital` |
| After `at_hospital`, vehicle starts moving away | Unlocks manual choice: "Return to base" or "Attend next incident" |

Course-deviation flag: while `en_route_to_hospital`, if distance to destination increases for 3 consecutive pings or vehicle is > 500 m off the planned Routes polyline, log a `route_deviation` event and show an amber banner ("Off planned route to hospital").

### Cancel-on-scene

New destructive button **"Treated on scene — cancel transport"**, visible only when status ∈ {`arrived`, `patient_collected`}. Calls new RPC `holarchelp_cancel_transport(_incident_id, _reason)` which sets status to `treated_on_scene`, stamps `resolved_at`, logs a timeline event, returns vehicle to available. Stepper collapses to show pre-transport steps complete with a green "Treated on scene" badge.

## 3. Merge Dispatcher Console into Emergency Dashboard → "Dispatch Dashboard"

- Rename `EmergencyDashboardScreen` route + heading to **Dispatch Dashboard**.
- Fold the Dispatcher Console queue/assignment UI into it as the top section (Incoming SOS + assign vehicle/crew inline), followed by Active Missions and Shifts accordion.
- Remove **Dispatcher Console** from the ambulance sidebar and redirect `/provider/ambulance/dispatcher` → `/provider/ambulance/dashboard`.
- Delete obsolete bits from `DispatcherConsoleScreen.tsx` after extracting reusable components into `src/modules/holarchelp/components/dispatch/`.

## 4. Fleet Live — add Google Map of all vehicles

- Add a Google Map panel at the top of **Fleet Live** showing every on-shift vehicle's latest position from `holarchelp_provider_locations` (color-coded by status: green idle, amber en route, red on mission).
- Realtime subscription on `holarchelp_provider_locations` updates marker positions live.
- Click a marker → opens that vehicle's individual tracking view (existing `VehicleProfileScreen` / live trace) — individual tracking remains intact.

## 5. Merge Safety into Tracking

- Combine the data shown in the **Safety** tab (vehicle abuse, harsh events, geofence breaches) with the existing **Tracking** tab content into one tab simply called **Tracking**.
- Remove the standalone Safety tab/route; redirect `/provider/ambulance/safety` → `/provider/ambulance/tracking`.
- Tracking tab gets an internal sub-section "Safety events" (harsh braking, speeding, geofence) listed under the live map.

## 6. Sample data for demo

Seed (via insert tool) for Renken Ambulance Service:
- 3 vehicles currently on-shift with crews, recent `holarchelp_provider_locations` pings around Johannesburg.
- 1 active incident in each lifecycle stage (en_route, arrived, en_route_to_hospital, at_hospital).
- 1 incident with a `route_deviation` event so the amber banner is visible.
- 1 incident resolved as `treated_on_scene`.
- A handful of harsh-event / geofence rows so the merged Tracking tab shows safety data.

## 7. Files touched

Migrations:
- Recreate `get_emergency_patient_context` (profiles + patients join).
- Add `holarchelp_cancel_transport` RPC.
- Add `holarchelp_auto_advance_status` RPC + trigger on `holarchelp_provider_locations`.

Frontend:
- `NavigationScreen.tsx` — new `MissionStatusStepper`, cancel button, post-hospital chooser, deviation banner.
- New `src/modules/holarchelp/components/MissionStatusStepper.tsx`.
- `EmergencyDashboardScreen.tsx` — absorb dispatcher console UI; rename to Dispatch Dashboard.
- `ProviderSidebar.tsx` + `routes-provider.tsx` — remove Dispatcher Console + Safety nav entries; add redirects.
- `RealTimeMonitoringScreen.tsx` (Fleet Live) — new `FleetLiveMap` Google Map of all vehicles.
- Tracking screen — merge Safety content.
- Insert tool — seed demo rows.
