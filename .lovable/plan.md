## Goal

On the active SOS screen, show the patient the **list of providers being notified** (hospitals + ambulances), let them **manually pick one**, and if they don't choose within **3 minutes**, the system **auto-assigns the closest provider or any available provider can grab the call**.

## Why your providers aren't "showing"

Your DB is fine — there are 2 approved SA hospitals + 2 approved SA ambulances with valid coordinates, and the current incident already has 2 pending offers out to both ambulances. The problem is purely UX:

- The active SOS screen only shows *"Notified N responders"* — no names, no distance, no way to pick one
- Hospitals are never offered (dispatch only queries `holarchelp_ambulance_providers`)
- There is no auto-assign timeout, so if no responder taps "Accept" on their dashboard, the spinner spins forever

## Changes

### 1. `dispatch-sos` edge function — also offer hospitals

- After picking ambulance candidates, run the same nearest-N selection over `holarchelp_hospitals` (approved + accepting + has lat/lng) and insert hospital offers into the same `holarchelp_incident_offers` table.
- This requires adding a `provider_kind` column (`'ambulance' | 'hospital'`) to `holarchelp_incident_offers` so we know which table the `provider_id` points to. Backfill existing rows to `'ambulance'`.

### 2. New "Available responders" panel on `HolarcHelpIncidentDetail.tsx`

While the incident is `open` and unassigned, replace the "Notified N responders" line with a real list:

```text
Available responders                                         03:00 ⏳
─────────────────────────────────────────────────────────
🚑  Netcare ER24            Private · 2.1 km        [ Pick ]
🚑  Emergency ER (JHN)      Private · 4.7 km        [ Pick ]
🏥  Mediclinic Sandton      Private · 3.4 km        [ Pick ]
🏥  Olivedale Clinic        Private · 8.9 km        [ Pick ]
─────────────────────────────────────────────────────────
Auto-assign closest in 03:00 if you don't pick.
```

- Pulls rows from `holarchelp_incident_offers` for this incident, joins to provider name/ownership/distance.
- Each "Pick" button calls a new `holarchelp_patient_pick_provider(_incident_id, _provider_id, _kind)` RPC that locks the assignment (similar to the existing `holarchelp_accept_incident`, but initiated by the patient).
- A live countdown shows time remaining until auto-assign.

### 3. New `holarchelp_auto_assign_incident` RPC + 3-min timeout

- RPC picks the closest pending offer and assigns it (same atomic update as `holarchelp_accept_incident`).
- Triggered client-side by a timer in `HolarcHelpIncidentDetail.tsx` once `created_at + 3 min` is reached and incident is still unassigned. (Client trigger is fine because the patient's screen is the one waiting; if they close it, the existing 30-second re-dispatch keeps offers fresh and the next time anyone opens the incident the auto-assign fires.)
- Logs an `auto_assigned` event to `holarchelp_incident_events`.

### 4. Small copy fix

- Replace the amber "Finding nearest ambulance…" banner with "Choose a responder or wait — auto-assign in mm:ss".

## Out of scope

- No changes to responder-side dashboards.
- No changes to `HolarcHelpNearby.tsx` (already lists all approved providers).
- No insurance/medical-aid filtering — current dispatch is inclusive (your medical insurance flag does not currently restrict matching, and we keep it that way).
- Charlotte Maxeke stays `pending` until you approve it from the admin panel.

## Verification

1. Trigger SOS → within seconds you see 4 entries (2 ambulances + 2 hospitals) with distances and a 3:00 countdown.
2. Tap "Pick" on Mediclinic Sandton → incident becomes `assigned`, "Responding: Mediclinic Sandton" card appears, other offers become `superseded`.
3. Trigger another SOS, wait 3 min without tapping → closest provider gets auto-assigned and the same Responding card appears.