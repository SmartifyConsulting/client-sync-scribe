## Split Active Missions into its own framed section + nav padding

### 1. Active Missions as its own red-framed panel

**`DispatcherConsoleScreen.tsx`** — remove the inline Active Missions section and its `activeMissions` state/loader. Console keeps only header + Open SOS / Available Vehicles / Selected Incident.

**New `src/modules/holarchelp/hooks/useActiveMissions.ts`** — extracts the loader (incidents in `ACTIVE_STATUSES` for the provider, joined with destination hospital + vehicle code) plus its realtime channel. Returns `ActiveMission[]`.

**New `src/modules/holarchelp/pages/provider/ambulance/ActiveMissionsPanel.tsx`** — renders the drill-down grid that previously lived inside the console (incident # chip, compact `MissionStatusStepper`, hospital, `EtaCountdown`, vehicle code, chevron link to `/provider/ambulance/navigation/:id`).

**`EmergencyDashboardScreen.tsx`** — three top-level frames in this order:
```text
[ Incoming SOS              (existing) ]
[ Dispatcher Console        (teal border, existing) ]
[ Active Missions           (RED border, new) ]
```
The Active Missions frame mirrors the Dispatcher Console frame styling but with `border-2 border-destructive/60 bg-destructive/5`, and an `<h2>` "Active Missions" at the same size as the Dispatcher Console heading (`text-sm font-bold uppercase tracking-wider`) with a red `Navigation` icon and the live count chip.

### 2. Top padding on sidebar nav items

In `src/modules/holarchelp/components/ProviderSidebar.tsx` (and the matching doctor/patient sidebar if shared), push the first nav group down by `1.5cm` (~`pt-[1.5cm]` on the `SidebarContent`'s first `SidebarGroup`, or equivalent `mt-[1.5cm]` on the menu list) so the menu items sit clearly below the top bar.

### No backend/data changes.
