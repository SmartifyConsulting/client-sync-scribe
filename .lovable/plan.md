## Scope

Four additions to HolarcHelp:

1. Provider admin: re-organize Hospitals & Ambulances tables grouped by country → tier
2. New "Accountability" admin screen with provider performance metrics
3. SOS voice clip upload UI (admin)
4. Patient dashboard: add SOS button + Nearby icon under Upcoming Events, left of Vula Vouchers
5. Rename "Ambulance providers" tab → "Ambulance" with white styling

---

## 1. Providers admin — group by Country → Tier

File: `src/pages/admin/HolarcHelpProviders.tsx`

- Replace flat table with collapsible accordion sections:
  - Outer: country group (with country flag emoji + name + total count, e.g. "🇳🇬 Nigeria")
  - Inner: tier sub-sections matching the screenshot style:
    - Tier 1 — pink chip
    - Tier 2 — orange chip  
    - Tier 3 — yellow chip
    - Tier 4 — blue chip (ambulances only)
    - Each shows "{count} hospitals" / "{count} ambulances"
- Each tier expands to the existing row table (Name/Contact/City/Status/Beds/Actions) — same actions preserved
- Sort countries alphabetically; ZA + NG pinned to top
- Rename Tab: `Ambulance providers` → `Ambulance`; both TabsTriggers get white background styling (`data-[state=active]:bg-white data-[state=active]:text-foreground`) with the parent TabsList keeping teal background

## 2. Accountability admin screen

New route: `/admin/holarchelp-accountability` (admin only, link from sidebar + "Accountability" button on Providers page header).

File: `src/pages/admin/HolarcHelpAccountability.tsx`

Columns (per screenshot):
- Provider (name + status sub-label)
- Accepts — count of `holarchelp_incident_offers` where response='accepted'
- Avg Arr (min) — average minutes between offer accepted_at and incident `arrived_at`/resolved_at
- Cancels — count from `holarchelp_incident_cancellations`
- Critical Cancels — cancels where source incident severity in (high, critical)
- Stalled — accepted offers with no movement in >15min and not resolved
- Avg Rating — from `holarchelp_feedback` for incidents assigned to provider
- Flags — count of `holarchelp_incident_cancellations` with reason_code != 'declined' (proxy)
- Priority — `dispatch_priority` (editable inline; numeric)
- Actions: `Lower` (decrement priority by 10, min 0), `Suspend` (set provider status='suspended')

Data source: aggregate via SQL view `vw_holarchelp_provider_accountability` (created in migration) or compute client-side from queries against `holarchelp_incidents`, `holarchelp_incident_offers`, `holarchelp_incident_cancellations`, `holarchelp_feedback`. Migration approach is preferred (one query, faster).

Tabs at top: Hospitals | Ambulance.

## 3. SOS Voice Clip upload

The schema (`holarchelp_voice_clip_settings` + `guardian-voice-clips` bucket) already exists.

Add a new card on the Providers admin page (or its own `/admin/holarchelp-voice-clip` route — single-page card) titled "SOS voice clip":
- Shows current default clip path (or "None — calls will use a fallback text-to-speech message.")
- File input (accepts `audio/mpeg,.mp3`)
- "Upload & set as default" button → uploads to `guardian-voice-clips/default/{timestamp}.mp3`, then upserts `holarchelp_voice_clip_settings` row id=1 with new path
- Tip text below: "keep clips under ~30 seconds. Africa's Talking sandbox only delivers to numbers registered in their Simulator."

Place this card on the existing `/admin/holarchelp-providers` page (above tabs) so admins have one HolarcHelp hub.

## 4. Patient dashboard — SOS + Nearby

File: `src/pages/patient/PatientDashboard.tsx`

Insert a new row directly **after** the Upcoming Appointments card and **before** the existing Vulas Balance row (Row 2):

```text
[ SOS button ][ Nearby icon ]   [ Vula Vouchers card ]
```

Implementation:
- New grid row: `grid-cols-2` on mobile (SOS+Nearby on left half, Vulas on right half) — but since current layout is full-width Vulas row, change Row 2 to a 3-col layout on desktop, 2-col on mobile:
  - Col 1-2: small horizontal pair with two square buttons:
    - **SOS** — red gradient button, links to `/patient/holarchelp` (HolarcHelpHome). Uses `Siren` lucide icon.
    - **Nearby** — outline button with `MapPin` icon, links to `/patient/holarchelp/contacts` (lists nearby hospitals/ambulances)
  - Col 3 (or row 2 on mobile): existing Vulas balance card unchanged
- Both buttons gated on `useHolarcHelpAccess` — if not enabled, hide gracefully

## 5. Sidebar nav

Add "Accountability" link under the existing "HolarcHelp Providers" admin item in `src/components/layout/Sidebar.tsx`.

---

## Technical details

### Migrations

```sql
-- Materialized aggregates (fast read for accountability)
CREATE OR REPLACE VIEW public.vw_holarchelp_provider_accountability AS
SELECT
  p.id AS provider_id,
  p.name,
  p.status,
  p.dispatch_priority,
  'hospital'::text AS provider_type,
  p.country,
  p.tier,
  (SELECT count(*) FROM holarchelp_incident_offers o WHERE o.provider_id=p.id AND o.response='accepted') AS accepts,
  (SELECT count(*) FROM holarchelp_incident_cancellations c WHERE c.provider_id=p.id) AS cancels,
  (SELECT count(*) FROM holarchelp_incident_cancellations c
     JOIN holarchelp_incidents i ON i.id=c.incident_id
     WHERE c.provider_id=p.id AND i.severity IN ('high','critical')) AS critical_cancels,
  (SELECT avg(EXTRACT(EPOCH FROM (i.resolved_at - o.responded_at))/60)
     FROM holarchelp_incident_offers o
     JOIN holarchelp_incidents i ON i.id=o.incident_id
     WHERE o.provider_id=p.id AND o.response='accepted' AND i.resolved_at IS NOT NULL) AS avg_arr_min,
  (SELECT avg(rating) FROM holarchelp_feedback f
     JOIN holarchelp_incidents i ON i.id=f.incident_id
     WHERE i.assigned_provider_id=p.id) AS avg_rating
FROM holarchelp_hospitals p
UNION ALL
SELECT a.id, a.company_name, a.status, a.dispatch_priority, 'ambulance', a.country, a.tier,
  /* same subqueries with provider_id=a.id */ ...
FROM holarchelp_ambulance_providers a;
```
(View is SECURITY INVOKER; admin RLS via wrapper RPC `admin_provider_accountability()` that checks `has_role(auth.uid(),'admin')`.)

### Tier color tokens (semantic)
Add to provider rendering: `tier_1`→pink, `tier_2`→orange, `tier_3`→yellow, `tier_4`→blue. Use existing tailwind classes — no theme changes.

### Country grouping
Group providers in TS using `Object.groupBy(rows, r => r.country || 'Unknown')`, then within each country `groupBy(r => r.tier)`.

### SOS + Nearby buttons
Compact dual-button card:
```tsx
<div className="grid grid-cols-2 gap-2">
  <Link to="/patient/holarchelp">
    <Button className="h-full w-full bg-gradient-to-br from-red-500 to-red-600 text-white">
      <Siren /> SOS
    </Button>
  </Link>
  <Link to="/patient/holarchelp/contacts">
    <Button variant="outline" className="h-full w-full">
      <MapPin /> Nearby
    </Button>
  </Link>
</div>
```

---

## Files changed

- `supabase/migrations/<new>.sql` — view + admin RPC
- `src/pages/admin/HolarcHelpProviders.tsx` — country/tier grouping, voice clip card, white tabs, "Ambulance" rename, link to Accountability
- `src/pages/admin/HolarcHelpAccountability.tsx` — NEW
- `src/App.tsx` — register accountability route
- `src/components/layout/Sidebar.tsx` — add nav link
- `src/pages/patient/PatientDashboard.tsx` — SOS + Nearby row

No changes to existing approval/RLS logic; voice clip schema/bucket already exist.