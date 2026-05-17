## 1. Admin → User Management: search for Hospitals / Ambulances / Pharmacies

**Problem.** On desktop/tablet, the search box appears only on the Patients / Healthcare Providers / Admin sub-tabs (`UsersTab` has its own search). The Hospitals / Ambulances / Pharmacies sub-tabs use a different render path (`renderGroupedTable` in `HolarcHelpProviders.tsx`) with no search input.

**Fix (`src/pages/admin/HolarcHelpProviders.tsx`).**
- Add one `searchTerm` state per provider kind.
- Render a small `Search`-icon `Input` in the `AdminPanel` `actions` row on each of the hospital / ambulance / pharmacy tabs.
- Filter list before `renderGroupedTable`: case-insensitive match on `name` / `company_name`, `city`, `contact_email`, `contact_phone`, and resolved login email from `userEmails`.
- Empty-state copy: "No hospitals match your search." etc.

## 2. Mobile: admin section unreachable from avatar menu

**Fix (`src/components/layout/BottomNav.tsx`).** When `pathname.startsWith("/admin")` AND `useIsAdmin()` is true, render an **admin variant** of the bottom nav with 5 items:
1. **Users** → `/admin/users` (`Users`)
2. **Pricing** → `/admin/pricing` (`DollarSign`)
3. **Rewards** → `/admin/gamification` (`Gift`)
4. **Hub** → `/admin` (`LayoutDashboard`)
5. **Exit Admin** → `/doctor-dashboard` (or `/patient/details`) (`Home`)

**Fix (`src/components/layout/TopBarIcons.tsx`).** Change avatar-menu "Admin" link target from `/admin` to `/admin/users`.

## 3. SOS map: red & teal lines + countdown timer on auto-assigned incidents

**Clarification from user.** A destination hospital **was auto-picked** for them, so teal line + hospital pin must show even without manual selection. If no ambulance claims the call, the system **auto-assigns the nearest available ambulance**, and that ambulance's position must drive the red line + PICKUP countdown immediately.

**Fix (`src/modules/holarchelp/components/SosLiveMap.tsx`).**
- **Auto-pick destination hospital if missing.** When incident loads with `destination_hospital_id = NULL`, query approved hospitals with lat/lng nearest the patient (haversine), use it as the destination for line/pin rendering (no DB write — client-side fallback).
- **Auto-pick nearest ambulance if missing.** When `assigned_provider_id` is set but `provider_latitude/longitude` and live `holarchelp_provider_locations` are both empty, fall back to `holarchelp_ambulance_providers.latitude/longitude` for the assigned provider. When `assigned_provider_id` is also empty, query nearest active ambulance by haversine. Drive red line + countdown from this position.
- **Phase rule.** `transport` if `status ∈ {en_route, patient_collected, at_hospital}`; else `pickup` whenever both provider & destination exist (real or fallback); only `selecting` if neither exists.
- Net result for the current incident: teal patient↔hospital line + pill, red patient↔ambulance line + PICKUP `mm:ss` countdown, both visible.

## 4. Remove top-row SOS icons that don't belong

**File: `src/modules/holarchelp/pages/HolarcHelpIncidentDetail.tsx`** (top action icon row, ~line 268).
- **Remove the `MapPin` "Search nearby" round icon button** (and its `MapPin` import if unused elsewhere). Route `/patient/holarchelp/nearby` stays intact for deep links.
- **Remove the `Phone` SOS icon button** from the same top row. Reason: the emergency phone number varies by country and a single hard-coded number is misleading. Drop the icon and its `Phone` import. Country-aware emergency dialing can be reintroduced later via the NOK / country settings.

## 5. Timeline events: ambulance assignment + arrival at scene + arrival at destination

All three are display-side additions in **`src/modules/holarchelp/components/IncidentTimeline.tsx`** plus emission logic in `SosLiveMap.tsx` / incident assignment flow.

### 5a. Ambulance assigned
- New timeline event type: **`provider_assigned`** — renders as "Ambulance assigned: {ambulance company name}" with `Ambulance` icon, teal/primary color.
- The label distinguishes **auto-assigned vs self-selected** via a sub-field:
  - **Auto:** "🤖 Auto-assigned · {company_name}" (when `assignment_mode = 'auto'`)
  - **Manual:** "✋ Selected the call · {company_name}" (when an ambulance operator claims the SOS themselves, `assignment_mode = 'manual'`)
- Emission: wherever `holarchelp_incidents.assigned_provider_id` is set (auto-dispatch edge function and the ambulance operator's "Accept call" handler), also insert a row into the existing incident-events table with `type='provider_assigned'`, payload `{ provider_id, provider_name, mode }`. If no such table is in use, derive the event client-side in `IncidentTimeline` by detecting the `assigned_provider_id` change in realtime and joining `holarchelp_ambulance_providers.company_name`.
- For the current incident view, also do a one-time backfill render: if `assigned_provider_id` is non-null but no `provider_assigned` event exists, synthesize a synthetic timeline row from the incident `updated_at` + ambulance company name so existing SOSes show the entry too.

### 5b. Arrived at scene
- New timeline event type: **`provider_arrived_scene`** — "Ambulance arrived at SOS scene" (icon: `MapPin`, red/destructive).
- Emission in `SosLiveMap.tsx`: on each provider GPS update, haversine to patient ≤ 50 m + phase = `pickup` + not already emitted → insert event once.
- Fallback: if status flips to `patient_collected` and no arrival event was emitted within 60 s prior, emit `provider_arrived_scene` at the status-change timestamp.

### 5c. Arrived at destination
- New timeline event type: **`provider_arrived_destination`** — "Ambulance arrived at destination hospital · {hospital name}" (icon: `Hospital`, teal/primary).
- Emission: haversine to destination hospital ≤ 50 m + phase = `transport` + not already emitted → insert once.
- Fallback: if status flips to `at_hospital`, emit at that timestamp.

## Files touched

- `src/pages/admin/HolarcHelpProviders.tsx` — per-kind search input + filter.
- `src/components/layout/BottomNav.tsx` — admin variant of mobile bottom nav.
- `src/components/layout/TopBarIcons.tsx` — avatar Admin link → `/admin/users`.
- `src/modules/holarchelp/components/SosLiveMap.tsx` — destination & ambulance fallback positions; emit assignment + arrival events.
- `src/modules/holarchelp/components/IncidentTimeline.tsx` — render assignment, arrival-at-scene, arrival-at-destination events.
- `src/modules/holarchelp/pages/HolarcHelpIncidentDetail.tsx` — remove MapPin "Search nearby" and Phone SOS icon buttons (+ unused imports).
- *(If an auto-dispatch edge function exists for ambulance assignment, add the `provider_assigned` event insert there too — confirmed at implementation time.)*

No schema / migration / RLS changes required.
