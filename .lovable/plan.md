# Fix ER Provider selection UI + provider queue incident numbers

Two small UI fixes.

## 1. Patient screen: always show countdown + "searching" state

**Problem:** `AvailableResponders` returns `null` when the offers RPC comes back empty, so the patient sees neither the list nor the auto-assign countdown. It only renders once at least one offer row exists.

**Fix in `src/modules/holarchelp/components/AvailableResponders.tsx`:**
- Remove the early `if (!offers.length) return null;` for the non-change-mode branch.
- When `offers.length === 0` and not in change mode, still render the card with:
  - Header: "Available ER providers (0)"
  - The `Auto-assign in MM:SS` countdown (existing logic)
  - The `+30s more time` extend button (existing logic)
  - Placeholder body: `Searching for nearby ER Providers…` with a small spinner, instead of the `<ul>`
- Keep all other logic (auto-assign RPC firing at 0, change-mode branch, current-provider pinning) untouched.

Also in `src/modules/holarchelp/pages/HolarcHelpIncidentDetail.tsx`:
- Loosen the render gate at line 357 so the "no responders yet after 90s" fallback (`showNoResponders`) no longer hides `AvailableResponders`. Change `!showNoResponders` guard to always render `AvailableResponders` while `status === "open" && !assigned_provider_id`. The countdown must remain visible even after 90 seconds elapse without offers.

## 2. Ambulance incoming queue: show incident number

**Problem:** Ambulance dashboard (`EmergencyDashboardScreen.tsx` line 126) and `IncomingSosScreen.tsx` line 120 show `#{r.id.slice(0,8)}` — a UUID slice — instead of the human-readable `incident_number` that hospitals already show.

**Fix:**
- `src/modules/holarchelp/pages/provider/ambulance/EmergencyDashboardScreen.tsx`
  - Add `incident_number?: string | null` to `Row` type
  - Add `incident_number` to the `.select(...)` list
  - Render `{r.incident_number ?? \`INC-${r.id.slice(0,8)}\`}`
- `src/modules/holarchelp/pages/provider/ambulance/IncomingSosScreen.tsx` — same three edits (add to type, select, render).
- `src/modules/holarchelp/pages/provider/ambulance/AmbulanceOpsDashboard.tsx` line 105 — same treatment for parity.

Hospital `IncomingAmbulancesScreen` already shows `incident_number`, so no change there. Hospital `TriageScreen` / `AdmissionsScreen` are internal boards (not the "incoming SOS to pick up" queue) and are out of scope.

No backend, RPC, or schema changes. Pure presentation.
