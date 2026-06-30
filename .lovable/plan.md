## Dispatch Dashboard layout fix

Match the attached screenshot exactly and drop the "Rolling" metric (it duplicates Available Vehicles).

### Order on `EmergencyDashboardScreen.tsx` (top → bottom)
1. **Incoming SOS** banner + stat strip + queue
   - Stat strip becomes 2 columns: **Incoming** · **Critical** (remove **Rolling**)
2. **Dispatcher Console** (Open SOS / Available Vehicles / Selected Incident)
3. **Active Missions** grid (drill-down cards)

### Copy changes
- Dashboard subtitle: "Dispatcher console, live SOS queue and dispatch actions — all on one screen." (remove "rolling shifts")

### Code touch points
- `src/modules/holarchelp/pages/provider/ambulance/EmergencyDashboardScreen.tsx` — reorder sections, change stats grid from `lg:grid-cols-3` to `lg:grid-cols-2`, remove the Rolling card and its data source, update subtitle string.
- No DB / hook changes. Active Missions block already lives inside `DispatcherConsoleScreen` — leave it where it is so it renders directly under the console as shown.
