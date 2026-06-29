
## 1. Unify Ambulance + Hospital portal styling with the main app

Today `provider/ambulance/*` and `provider/hospital/*` use ad‑hoc headers, raw `text-2xl font-semibold`, emoji tab buttons (📍 🛡️), and hardcoded Tailwind colors (`bg-red-100`, `text-white`). The Doctor / Patient app uses: `PageHeader` (eyebrow + bold title + short description), shadcn `Tabs` with the teal `TabsList`, accordions with the global teal border, and semantic tokens (`bg-card`, `border-border`, `text-primary`, `text-destructive`).

Apply across every provider screen:
- Same `PageHeader` pattern (eyebrow uppercase + h1 + description).
- Replace custom tab strips with shadcn `<Tabs>` + teal `TabsList`. Remove emoji from tab labels.
- Apply the teal‑border accordion style (`mem://design/ui-frame-standardization`) to every grouped list.
- Swap all hardcoded colors for semantic tokens so light/dark and the Holarc palette stay consistent.
- Standardize spacing: `space-y-4` page rhythm, `rounded-2xl border border-border bg-card` cards.

## 2. User Admin — accordions with phone + email visible

In `AdministratorsScreen.tsx` (the screen being renamed to **User Admin**):
- Group rows by role: Admin, Manager, Paramedic, EMT, Driver, Dispatcher, Nurse, Supervisor.
- Each role becomes a teal‑bordered accordion item. **Default: all collapsed.** Search auto‑expands matching groups.
- Each accordion header shows role label + total count + small "active/inactive" pill.
- Each row inside an accordion shows:
  - Full name (bold)
  - **Phone number** with a click‑to‑copy + `tel:` link
  - **Email address** with a click‑to‑copy + `mailto:` link
  - Status pill (Active / Pending invite) and role badge
  - Edit / Remove icons (admins only)
- Phone and email are already on `holarchelp_ambulance_members` / `holarchelp_hospital_members`; no schema change needed. For rows with a linked `user_id`, fall back to `profiles.phone` / `auth.users.email` (via the existing profile join) when the invited fields are blank.

## 3. Retire Driver Management

`DriverManagementScreen.tsx` is mock data showing the same paramedic/EMT/driver roster that User Admin already manages from real `holarchelp_ambulance_members`. Edits there don't persist — it's confusing.

- Delete the file and its sidebar entry / route.
- All crew management lives in **User Admin** under the role accordions.

## 4. Rename Admin → User Admin

- Sidebar label and `PageHeader` title change to **User Admin**.
- Route path stays the same to avoid breaking deep links — only the label and translations change (across the 25 locales).

## 5. Navigation vs Real‑Time Monitoring — clarify

They sound similar but do different jobs:
- **NavigationScreen** = a single paramedic's turn‑by‑turn console for the one mission they accepted (status stepper, hospital picker, live ETA).
- **RealTimeMonitoringScreen** = dispatcher / manager view of all vehicles, speed, fuel, geofence, safety alerts.

Fix:
- Rename **Navigation → Active Mission**. Only show it in the sidebar while the current user is a paramedic with an assigned/in‑progress incident; otherwise hide it. Place under an "On Shift" sidebar section.
- Rename **Real‑Time Monitoring → Fleet Live**. Drop the redundant "Live Tracking" sub‑tab (the screen *is* live tracking); keep "Safety Alerts" as a sibling tab. Place under "Operations".
- Add one‑line helper text under each title: "Your current mission" vs "All vehicles, live".

## 6. Dynamically moving map — wire Google Maps + demo simulator

### What we'll build (code)
- Use the existing Google Maps connector (browser key `VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY` for Maps JS; gateway proxy for Routes).
- On `Fleet Live` and `Active Mission` / `HolarcHelpIncidentDetail`, subscribe to Realtime `INSERT` on `holarchelp_provider_locations` and **tween the marker** between the previous and new point over the GPS update interval so it visibly glides instead of teleporting.
- Draw the route polyline from the ambulance's current position → patient (then → destination hospital once `status = patient_collected`) using the **Routes API** through the connector gateway. Distance + ETA come straight from the Routes response and refresh whenever `provider_location_updated_at` changes.
- Live ETA countdown ticker, reset on each new ETA.
- Enable Realtime on the locations table:
  ```sql
  ALTER PUBLICATION supabase_realtime ADD TABLE public.holarchelp_provider_locations;
  ```

### Demo simulator (temporary, dev/preview only)
Goal: you can see the map move even when no paramedic device is online.

- Add a **"Simulate ambulance"** toggle button on `Fleet Live` and inside an active incident, visible only when:
  - the environment is preview (`import.meta.env.DEV === true` **or** hostname is a `*.lovable.app` / `*.lovableproject.com` preview domain), **and**
  - the current user has the `admin` role.
- When toggled on, a client‑side interval (every 3s) walks a fake ambulance along a pre‑computed Joburg route (Sandton → Charlotte Maxeke). On each tick it `upsert`s a row into `holarchelp_provider_locations` with a flag `simulated = true`.
- Migration adds `simulated boolean default false` to `holarchelp_provider_locations`. Map markers from simulated rows render with a dashed outline and a small "DEMO" chip so it's never mistaken for a live unit.
- Toggling off stops the interval and clears the simulated row.
- Hard guards: the simulator button never renders on `holarchealth.com` (production custom domain), and the edge gate also rejects writes with `simulated = true` from any user that isn't `admin`.

### Proving the real thing works
After the simulator is in place we'll verify the live path end‑to‑end without faking anything:
1. Open `/provider/ambulance` in one browser, signed in as a paramedic, start a shift, grant browser location permission. The `useLiveProviderLocation` hook will post real GPS into `holarchelp_provider_locations` every ~10s.
2. Open the matching patient incident in a second browser / phone — the map shows the real marker tweening between real GPS points, with a real Routes‑API polyline and ETA.
3. Walk a few metres (or refresh GPS) and confirm the marker glides and the ETA drops.
4. Flip `status` through `en_route → arrived → patient_collected → en_route_to_hospital → at_hospital` and confirm the destination pin and route swap from patient → chosen hospital at the right step.
5. Screenshot each stage so we have a live‑traffic record alongside the simulator's demo recording.

### What you need to do
- **Browser location**: confirm Chrome / Safari allows location for `holarchealth.com` and the preview domain.
- **Custom‑domain Maps key (production only)**: the Lovable‑managed Google key is restricted to `*.lovable.app`. For maps on `holarchealth.com` you need your own Google Cloud API key with Maps JavaScript API + Routes API enabled and HTTP referrer allowlist set to both `https://holarchealth.com/*` and `https://*.holarchealth.com/*`. Once you have the key, we'll wire it via a custom Google Maps connection — until then maps work on the preview domain.

## Technical details

```text
Files to edit
  src/modules/holarchelp/pages/provider/**           → PageHeader + tokens + tabs
  src/modules/holarchelp/pages/provider/AdministratorsScreen.tsx
    → "User Admin", role accordions (collapsed), phone/email rows
  src/modules/holarchelp/pages/provider/ambulance/RealTimeMonitoringScreen.tsx
    → rename "Fleet Live", drop emoji tabs, drop Live Tracking sub-tab
  src/modules/holarchelp/pages/provider/ambulance/NavigationScreen.tsx
    → rename "Active Mission", conditional sidebar visibility
  src/modules/holarchelp/components/SosLiveMap.tsx   → marker tweening + Routes polyline + ETA
  src/modules/holarchelp/components/AmbulanceSimulator.tsx  → NEW, dev/preview-only
  src/components/layout/ProviderAppLayout.tsx        → sidebar labels & grouping
  src/i18n/locales/*.json + uiTranslations.ts        → label updates

Files to delete
  src/modules/holarchelp/pages/provider/ambulance/DriverManagementScreen.tsx
  (+ its route entry in routes-provider.tsx)

Database (migration)
  ALTER PUBLICATION supabase_realtime ADD TABLE public.holarchelp_provider_locations;
  ALTER TABLE public.holarchelp_provider_locations
    ADD COLUMN IF NOT EXISTS simulated boolean NOT NULL DEFAULT false;
  -- RLS: only admins may insert/update rows with simulated = true
```

No business logic changes outside removing the redundant Driver Management mock screen and adding the simulator.
