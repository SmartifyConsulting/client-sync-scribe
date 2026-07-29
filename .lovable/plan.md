## Goal

Finish the remaining two panels on the new Hospital Admin Dashboard, then add a new **ER Ops Dashboard** for ambulance/ER providers in the same style — without removing or changing any existing screens.

## Step 1 — Complete the Hospital Admin Dashboard (bottom row)

Two columns added below the existing KPI / ward / alerts sections:

- **ER queue (left)** — patients waiting in the ER: incident number or patient name, triage badge (critical = red, urgent = amber, routine = green), and time waiting. Shows up to 4, with a "View full queue" button linking to the existing Emergency Queue screen.
- **Recent activity (right)** — last 5 events as a timeline with relative timestamps ("8 minutes ago"): admission to ward, prescription issued (with medication name), shift clock-in/handover, discharge, and inbound emergency/ambulance alerts. Merged from admissions, prescriptions, shifts and incidents, sorted newest first, respecting the ward filter where the event has a ward.

## Step 2 — New ER Ops Dashboard

New route `/provider/ambulance/ops-dashboard` ("Ops Dashboard" added to the ER sidebar, existing Emergency Dashboard stays untouched).

**KPI row (4 cards, live):**
- Active incidents: currently assigned/en-route/at-scene count
- Average response time: from incident creation to crew arrival (last 24h)
- Fleet availability: available vehicles / total fleet, as a percentage
- Crew on shift: paramedics on active shift, plus count of vehicles without a crew

**Main row:**
- **Live incident board (left)** — open + assigned incidents with incident number, severity colour, status chip, time since creation, and assigned vehicle/crew; unassigned ones highlighted.
- **Fleet status (right)** — each vehicle with status (available / dispatched / at hospital / offline), current crew, and last telemetry ping age; colour-coded like the ward bars.

**Bottom row:**
- **Destination hospitals** — affiliated hospitals with current inbound count and ER capacity where known.
- **Recent activity** — last 5 dispatch events (SOS received, accepted, en route, patient collected, handover at hospital) with relative timestamps.

## Shared behaviour

- Ward filter equivalent for ER: filter by vehicle/base where relevant.
- "Last updated: X seconds ago" header with 10-second auto-refresh, matching the hospital dashboard.
- Existing app colours, cards, typography (Sora/Manrope) — no new palette.
- If any panel has no live rows, a small amount of demo data will be seeded for the ER provider (Renken) so the dashboard reads realistically, consistent with the earlier hospital seed.

## Technical notes

- New hook `useErOpsStats.ts` mirroring `useHospitalAdminStats.ts` (single polling loop, derived KPIs, typed lite rows) reading `holarchelp_incidents`, `ambulances`, `ambulance_crew_assignments`, `paramedic_shifts`, `holarchelp_telematics_pings`, `ambulance_hospital_affiliations`.
- Hospital bottom row extends the existing `useHospitalAdminStats` hook with a `recentActivity` merge and richer ER queue rows rather than adding a second fetcher.
- New page component `ErOpsDashboard.tsx`, registered in `routes-provider.tsx` and `ProviderSidebar.tsx`; new i18n keys in `en.json`.
