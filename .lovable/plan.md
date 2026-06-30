## Emergency Responder Portal — Consolidation & Fleet Admin Upgrades

### 1. Dispatch Dashboard (merge Dispatcher Console + Emergency Dashboard)
- Rename "Emergency Dashboard" → **Dispatch Dashboard** across sidebar, routes, page header, and all 25 locale files.
- Fold the Dispatcher Console panels (incoming SOS queue, accept/assign vehicle, ETA chips) into the top of `EmergencyDashboardScreen.tsx`.
- Remove the standalone `DispatcherConsoleScreen` route and sidebar item (redirect old path).
- Keep the shifts accordion (collapsed by default) below the SOS queue.

### 2. Fleet Live — fleet-wide map
- In `RealTimeMonitoringScreen.tsx` add a Google Map at the top showing every active vehicle as a live marker (subscribed to `holarchelp_provider_locations`).
- Clicking a marker (or a vehicle row) drills into the existing individual tracking view.

### 3. Telematics — merge Safety into Tracking
- Move harsh-event / abuse data from the Safety tab into the Tracking tab as a collapsible "Safety events" section.
- Remove the Safety tab.

### 4. Admin tab order & Fleet Admin upgrades
- Reorder Admin sub-tabs to: **Users → Fleet Admin → Crew → Hospitals** → swap to **Users → Crew → Fleet Admin → Hospitals** per request (Crew before Fleet Admin).
- In **Fleet Admin**, each vehicle card gets an inline "Assigned Crew" section:
  - List current crew with role chips and a remove (×) button.
  - "Add crew member" combobox listing eligible `holarchelp_ambulance_members` not yet on the vehicle; writes to `ambulance_crew_assignments`.
- **Compact vehicle frames**: tighten padding (`p-3`), single-row meta line (reg • type • status), collapse secondary details into an accordion body.
- Wire **View Profile** → opens a read-only vehicle detail drawer (specs, current crew, recent trips, recent incidents).
- Wire **Edit** → opens the existing vehicle edit dialog prefilled with current values; saves via update RPC and invalidates the fleet query.

### 5. Demo seed data
- Seed Renken Ambulance Service with: 4 active incidents at different lifecycle stages (dispatched, en_route, at_scene, en_route_to_hospital), 3 vehicles with crew assignments, recent telematics pings, and 2 sample safety events.

### Technical notes
- New/changed files: `EmergencyDashboardScreen.tsx`, `RealTimeMonitoringScreen.tsx` (+ `FleetLiveMap.tsx`), `TelematicsScreen.tsx`, `AdministratorsScreen.tsx` (tab order + Fleet Admin crew UI), `VehicleCard.tsx` (compact), `VehicleProfileDrawer.tsx` (new), `VehicleEditDialog.tsx` (wire up), `ProviderSidebar.tsx` (remove items, rename), locale files, plus a migration for crew-assignment RPCs and demo seed.
- Realtime: ensure `holarchelp_provider_locations` and `holarchelp_incidents` are in the realtime publication (already done previously).
