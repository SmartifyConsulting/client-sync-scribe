# HolarcHelp: Folder/Route Rename + Providers Admin + Provider Portal

Three coordinated workstreams.

## 1. Full folder & route rename `guardian` → `holarchelp`

Goal: zero references to "guardian" anywhere a future developer would look — file paths, URLs, symbol names, comments.

**Folder rename:**
- `src/modules/guardian/` → `src/modules/holarchelp/`
- Inside: `GuardianHome.tsx` → `HolarcHelpHome.tsx`, `GuardianContacts.tsx` → `HolarcHelpContacts.tsx`, `GuardianIncidents.tsx` → `HolarcHelpIncidents.tsx`, `GuardianIncidentDetail.tsx` → `HolarcHelpIncidentDetail.tsx`, `GuardianGate.tsx` → `HolarcHelpGate.tsx`, `useGuardianAccess.ts` → `useHolarcHelpAccess.ts`. `PublicTrack.tsx`, `LiveMap.tsx`, `SeverityPicker.tsx`, `useLocationTracking.ts`, `whatsapp.ts`, `routes.tsx`, `README.md` keep filenames.

**Symbol rename:**
- `GuardianHome` / `GuardianContacts` / `GuardianIncidents` / `GuardianIncidentDetail` / `GuardianGate` / `GuardianRoutes` → `HolarcHelp*` equivalents
- `useGuardianAccess` → `useHolarcHelpAccess`, hook variables `guardianEnabled` → `holarchelpEnabled`, `isOnGuardian` → `isOnHolarcHelp`, `toggleGuardian` → `toggleHolarcHelp`

**Route rename:**
- `/patient/guardian/*` → `/patient/holarchelp/*` (mounted in `App.tsx`)
- All internal `navigate()` / `<Link>` targets updated
- Public tracking URL `/track/:token` is unchanged (no "guardian" in it already)
- Realtime channel name `guardian-incident-${id}` → `holarchelp-incident-${id}`

**Importers updated:**
- `src/App.tsx` — import path + route path
- `src/components/layout/BottomNav.tsx` — import path + variable names + path-startsWith check

**README rewritten** to reflect HolarcHelp branding and explain the public-name vs DB-codename history.

After this, `grep -ri guardian src/` returns zero hits except for unrelated legal copy ("parent or legal guardian") and the relationship dropdown option.

## 2. Providers admin page (option b)

A new page for platform admins to review and manage hospital and ambulance provider applications.

**Route:** `/admin/holarchelp-providers`

**Sidebar:** add "Providers" item under Admin nav (icon: `Hospital` or `Ambulance` from lucide).

**Page layout** — two tabs:

- **Hospitals tab** — table of `holarchelp_hospitals` rows with columns: Name · Owner email · City · Tier · Status · Subscription · Beds (avail/total) · Actions
- **Ambulance providers tab** — table of `holarchelp_ambulance_providers` with: Name · Owner email · Coverage · Tier · Status · Subscription · Actions

**Filters:** status pill row (`pending` / `approved` / `rejected` / `suspended` / `all`).

**Actions per row:**
- "Approve" (only when `status='pending'`) → calls `holarchelp_approve_hospital` or `holarchelp_approve_ambulance` RPC, which flips status and grants the `hospital_staff` / `ambulance_staff` role to the owner.
- "Reject" → updates `status='rejected'` (admin RLS already covers this).
- "Suspend" / "Reactivate" → toggles between `approved` / `suspended`.
- "Edit tier" (inline select) → updates `tier` column.

**Empty states:** clear "No pending hospitals" / "No ambulance providers yet" cards.

No DB schema changes required — RLS policies already let admins manage these tables. Approval functions already exist (renamed in the previous migration).

## 3. Provider portal (option c)

A dedicated workspace for hospital and ambulance staff to receive, accept, and track SOS dispatches.

**Route base:** `/provider`

**Auth gate:** new `ProviderGate` component that allows entry only if the user has `hospital_staff` or `ambulance_staff` role (already in the `user_role` enum).

**Pages:**

- `/provider` — **Dispatch Dashboard**
  - Top: summary cards (Active SOS in your region · Accepted by us · En route · Resolved today)
  - Live feed of `holarchelp_incidents` filtered to incidents in the provider's coverage area (or all `pending` for hospitals — geo-filter is a follow-up)
  - Each card shows: severity badge, time elapsed, last known location (map snippet via existing `LiveMap`), patient name, vitals flags (conscious/breathing)
  - Buttons: **Accept** (writes to `holarchelp_incident_offers` then sets `assigned_provider_id` on the incident) · **Decline** (writes to `holarchelp_incident_cancellations`)

- `/provider/incident/:id` — **Active Incident View**
  - Reuses `LiveMap` component for live patient location
  - Status timeline pulled from `holarchelp_incident_events`
  - ETA controls (update `eta_minutes`, mark `en_route_at`, mark `arrived_at`)
  - Quick-message buttons (canned messages logged to `holarchelp_messaging_log`)

- `/provider/profile` — **Provider Profile**
  - Hospital staff: edit hospital details (capacity, beds available, ICU available, at_capacity flag) — writes to their `holarchelp_hospitals` row
  - Ambulance staff: edit ambulance provider details — writes to `holarchelp_ambulance_providers`
  - Both: see subscription status and tier (read-only — managed by admin)

**Layout:** new `ProviderLayout` with its own sidebar (Dashboard · Active Incidents · Profile · Sign out). Sign-up flow for new providers is out of scope — admins create initial provider records and link the owner via the providers admin page. A simple "Apply to be a provider" form on the public site can be a follow-up.

**Realtime:** subscribe to `holarchelp_incidents` insertions (filtered server-side via RLS) and `holarchelp_locations` for the active incident.

## Files added

- `src/modules/holarchelp/components/ProviderGate.tsx`
- `src/modules/holarchelp/pages/provider/ProviderDashboard.tsx`
- `src/modules/holarchelp/pages/provider/ProviderIncidentDetail.tsx`
- `src/modules/holarchelp/pages/provider/ProviderProfile.tsx`
- `src/modules/holarchelp/pages/provider/ProviderLayout.tsx`
- `src/modules/holarchelp/routes-provider.tsx` (mounted at `/provider/*`)
- `src/pages/admin/HolarcHelpProviders.tsx` (the providers admin page)

## Files modified

- `src/App.tsx` — new routes, updated import paths
- `src/components/layout/Sidebar.tsx` — add "Providers" admin item; add provider role detection so hospital/ambulance staff get the provider sidebar
- `src/components/layout/BottomNav.tsx` — updated import path + symbol names + route prefix
- `src/hooks/useUserRole.ts` — expose `isHospitalStaff` / `isAmbulanceStaff` flags
- README in the renamed module

## DB changes

None. The previous migration already renamed every table, function, column, and enum to `holarchelp_*`. RLS policies for hospital/ambulance owners and admins are already in place.

## Out of scope (call-outs)

- Geo-based incident filtering for providers (today: list-all-active; v2: filter by hospital lat/lng radius).
- Public provider self-signup wizard (today: admin manually creates the provider record + sets owner_id).
- Storage bucket rename from `guardian-voice-clips` to `holarchelp-voice-clips` (would require copying every existing audio object and rewriting RLS — kept for a future maintenance window). Code references the bucket via a single constant for easy future rename.
- Renaming the inherited `useGuardianAccess` hook export's display in devtools (cosmetic; the hook itself is renamed).
