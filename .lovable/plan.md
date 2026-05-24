# SOS: Call ER Providers Only (No Hospitals)

When a patient taps SOS, the "Available responders" list and the 30-second auto-assignment currently include both ER (ambulance) providers and hospitals. The patient should only ever be calling an ER provider to come collect them — the ER provider then selects the destination hospital.

## What changes

### 1. Patient-facing responder list — ambulances only
`src/modules/holarchelp/components/AvailableResponders.tsx`
- Filter the offers returned by `holarchelp_get_incident_offers` to `provider_kind === "ambulance"` before rendering.
- Update header label from "Available responders" to "Available ER providers".
- Remove the `Hospital` icon branch (only the red `Ambulance` icon is needed).
- Empty-state copy: "No ER providers available nearby yet — keep this screen open."

### 2. Auto-assign — ambulance only
New migration updating `public.holarchelp_auto_assign_incident(_incident_id uuid)`:
- Add `AND provider_kind = 'ambulance'` to the `SELECT … FROM holarchelp_incident_offers` candidate query so the 30-second fallback can only ever assign an ER provider, never a hospital.
- Everything else (race guard, offer supersede, event log) unchanged.

### 3. Patient pick guard
`src/modules/holarchelp/components/AvailableResponders.tsx`
- Since hospitals are filtered out of the UI, no extra guard is needed in the pick handler. Server-side, `holarchelp_patient_pick_provider` already accepts the kind passed in; the patient UI will only ever send `"ambulance"`.

### 4. Dispatch — leave hospital offers intact (server-side)
`supabase/functions/dispatch-sos/index.ts` continues to write hospital offers as well, because the ER provider/admin views still need that pool to choose a receiving hospital later. The patient simply never sees or auto-picks them.

## Files touched
- `src/modules/holarchelp/components/AvailableResponders.tsx` — filter to ambulance, relabel, drop hospital icon branch.
- `supabase/migrations/<new>.sql` — replace `holarchelp_auto_assign_incident` with ambulance-only candidate selection.

No changes to dispatch edge function, hospital tables, or `SosLiveMap` (already correctly hides the destination hospital marker until an ER provider sets it).
