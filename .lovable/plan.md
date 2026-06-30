## 1. Make the Incident Number visible exactly once (and bolder)

Currently `HolarcHelpIncidentDetail.tsx` renders `<IncidentNumberBadge>` twice — once inside the sticky quick-action bar (line 286) and again under the page heading (lines 301–305). That's the duplication you're seeing.

Changes:

- **Remove** the second badge under the H1 (lines 301–305).
- Keep a **single** badge inside the sticky bar so it stays visible as you scroll.
- Reformat `src/components/IncidentNumberBadge.tsx` to be more prominent:
  - Bump the visual size: `md` → `text-base px-3 py-1.5`, `lg` → `text-lg px-3.5 py-2`.
  - Stronger frame: `border-2 border-primary bg-primary/10 text-primary shadow-sm`.
  - Render the number in `font-mono font-extrabold tracking-[0.18em] tabular-nums`.
  - Label changes from "Ref" to **"Incident #"** (single label), still copyable.
- Use `size="lg"` in the sticky bar so the single badge reads clearly.
- Same single-badge treatment is already used on the ER/Hospital screens via the shared component — they automatically inherit the new look.

## 2. Test A — Patient picks Renken for INC-2026-001070

`INC-2026-001070` is currently `status = assigned` to **Ferndale Emergency Response** (auto-assigned), and the 90-second patient change window is long past, so the "Change ER Provider" UI is hidden on the patient detail page.

To run the test cleanly without code changes, the plan is to reset the incident server-side so the patient can pick Renken from scratch:

1. Reopen the incident: set `status = 'open'`, clear `assigned_provider_id`, `assigned_paramedic_user_id`, `accepted_at`, and the auto-assign event flags.
2. Reload `/patient/holarchelp/incident/e8add7b5-…` as Sharon (the patient on the incident).
3. The `AvailableResponders` panel will reappear with the list of providers — pick **Renken Ambulance Service** (Cresta).
4. Confirm the badge reads **Incident # INC-2026-001070** once, the assigned provider becomes Renken, and a Renken shift sees the assignment under **Active Mission**.

## 3. Test B — Renken self-accepts from the Incoming SOS feed

For this run we need the same incident sitting unassigned in Renken's queue:

1. Sign in as a Renken staffer (`renken@smartify.co.za`) and **Start Shift** so `IncomingSosScreen` is unlocked.
2. With the incident reset to `open` (no `assigned_paramedic_user_id`, no `assigned_provider_id`), `INC-2026-001070` will appear in **Incoming SOS** sorted by severity.
3. Tap **Accept & Roll**, choose a destination Johannesburg hospital in `ParamedicAcceptDialog`, and confirm:
   - Incident moves to **Active Mission** for the Renken paramedic.
   - Patient screen shows the single prominent **Incident # INC-2026-001070** badge and the Renken vehicle on the map.
   - Hospital inbound listener toasts the chosen destination.

## Technical notes

- File touched: `src/components/IncidentNumberBadge.tsx` (style + default label), `src/modules/holarchelp/pages/HolarcHelpIncidentDetail.tsx` (delete duplicate badge, bump remaining one to `size="lg"`).
- DB reset for Tests A & B is a one-shot UPDATE on `holarchelp_incidents` + delete of the `auto_assigned`/`assigned`/`accepted` rows from `holarchelp_incident_events` for that incident — no schema changes, no migration.
- No changes to RPCs, RLS, or the dispatcher console.
