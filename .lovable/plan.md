## 1. Make the Incident # badge match the "Assigned" badge — but green

Currently `IncidentNumberBadge` is a large pill with a `Hash` icon, "INCIDENT #" label, copy button, `border-2 border-primary` frame, and `text-base/lg` font. The "Assigned" badge it should match is a small flat pill:

```
rounded-full bg-emerald-200 px-2 py-0.5 text-[10px] font-semibold text-emerald-900
```

Changes in `src/components/IncidentNumberBadge.tsx`:
- Drop the border, shadow, `Hash` icon, uppercase "INCIDENT #" label, and copy button.
- Render a single compact green pill: `inline-flex items-center rounded-full bg-emerald-200 px-2 py-0.5 text-[10px] font-semibold text-emerald-900` (and a dark-mode equivalent `dark:bg-emerald-900/40 dark:text-emerald-100`).
- Content is just `Incident {number}` in the same `text-[10px] font-semibold` weight — no font-mono, no extra letter spacing — so it visually sits next to the AUTO-ASSIGNED / ASSIGNED chips at identical size.
- Keep the `size` prop for back-compat but ignore it (all callers now render the same compact green chip).

No change to `HolarcHelpIncidentDetail.tsx` callers — the existing single placement in the sticky bar (line 286) and the existing chip on the assigned-responder card (lines 342–345) will both shrink to the same green pill automatically.

## 2. Show Renken (and every nearby approved ER provider) by default

Root cause: `holarchelp_get_incident_offers` only returns rows from `holarchelp_incident_offers`. For `INC-2026-001070` that table is empty (no client wrote offers, and the reset migration didn't seed any), so `AvailableResponders` correctly renders nothing — Renken, ER24 Joburg South, etc. all sit silent.

Fix in two parts:

**A. Migration — backfill offers for the in-flight test incident**

Insert one `pending` offer per approved + accepting ambulance provider into `holarchelp_incident_offers` for incident `e8add7b5-808c-4651-8483-c809cea7e0c8`, with `distance_km` computed from the incident's reporter location (look up the most recent `holarchelp_locations` row for `user_id 9ceb1207-…` — fallback to Sandton lat/lng `-26.1076, 28.0567` if absent). This immediately puts Renken at the top of the list for the current test.

**B. RPC — auto-list nearby providers whenever offers are empty**

Update `public.holarchelp_get_incident_offers(_incident_id)` so that when the per-incident offers query returns zero rows AND the incident is still `open` AND the caller is the incident owner (or admin), it returns a fallback set:

- `SELECT id, 'ambulance', 'pending', distance_km, company_name, ownership, accepting_patients FROM holarchelp_ambulance_providers WHERE status = 'approved' AND accepting_patients = true AND latitude IS NOT NULL ORDER BY distance ASC LIMIT 12`.
- Distance is `earth_distance(...)` against the incident's reporter location (`holarchelp_locations`) or the provider-supplied incident lat/lng if present; null if neither is available.

This guarantees Renken (Sandton, approved, accepting) shows for every future SOS even if the client forgets to seed offers, and resolves the "I can't find Renken" complaint with no UI changes.

`AvailableResponders.tsx` already filters by `provider_kind === 'ambulance'`, already sorts by distance, and already calls `holarchelp_patient_pick_provider` which inserts/updates the offer row on pick — so the fallback list works end-to-end without any frontend changes.

## Technical notes

- Files touched: `src/components/IncidentNumberBadge.tsx` (visual only).
- One migration:
  - `INSERT … SELECT` to seed pending offers for INC-2026-001070.
  - `CREATE OR REPLACE FUNCTION public.holarchelp_get_incident_offers` with the fallback branch (keeps existing auth checks, change-mode logic, and signature).
- No changes to `AvailableResponders.tsx`, `HolarcHelpIncidentDetail.tsx`, RLS, grants, or any other RPC.
