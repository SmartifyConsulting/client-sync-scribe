# Three small SOS fixes

## 1. Severity dialog appears twice after cancelling the voice note

**Cause:** In `src/modules/holarchelp/components/SosVoiceNoteDialog.tsx`, `cancel()` calls `cleanup()` which stops the `MediaRecorder`. The recorder's `onstop` handler (`handleStop`) then fires asynchronously, hits the `blob.size < 500` branch, and calls `onClose()` a second time. Each `onClose` in `HolarcHelpIncidentDetail` sets `severityOpen=true`, so after the user dismisses the picker once, the second `onClose` re-opens it.

**Fix:** In `SosVoiceNoteDialog.tsx`, make `cancel()` detach the `onstop` handler before stopping so `handleStop` cannot re-fire `onClose`:
- Set `recorderRef.current.onstop = null` (and clear `mr.ondataavailable`) inside `cancel()` before invoking `cleanup()`.
- Also guard with a `closedRef = useRef(false)` flag — set true in both `cancel()` and at the end of `handleStop()` — and bail out of `handleStop` if it's already true. This protects against any other async path firing `onClose` twice.

No change to `HolarcHelpIncidentDetail.tsx`.

## 2. After cancel, the incident screen shows no ER options

This is the same screen the screenshot shows. The `AvailableResponders` panel only renders when there's at least one ambulance offer in `holarchelp_incident_offers`. Right now there are zero offers because none of the Johannesburg ER providers have `latitude`/`longitude` populated — `dispatch-sos` filters with `.not("latitude", "is", null)`, so the candidate set is empty and no offers are written. The map then also has nothing to show beyond the patient pin.

**Fix:** Seed coordinates for ER providers around Randburg and Sandton so dispatch can offer them. See migration in section 3 — it doubles as the data fix for this issue.

No frontend changes needed; once offers exist, `AvailableResponders` will render the list and `SosLiveMap` will plot the red ambulance markers.

## 3. Rename "Emergency Users" → "ER Providers" + seed Randburg/Sandton ER providers

**Rename** in `src/pages/admin/HolarcHelpProviders.tsx`:
- Line 377: tab label `Emergency Users` → `ER Providers` (keep the `value="emergency-users"` key unchanged so routing/tab state still works).

**Seed data** — new migration that:
- `UPDATE`s the existing JoBurg ER providers that already have `subscription_status='active'` and `accepting_patients=true` but no coordinates, giving them realistic Randburg / Sandton lat-lngs:
  - Randburg cluster (around -26.0936, 27.9737): ER24 Joburg Central, Medi Response, Emer-G-Med EMS, Inter City Ambulance Service, High Care EMS (Pty) Ltd, National Emergency Medical Services.
  - Sandton cluster (around -26.1076, 28.0567): ER24 Joburg South, Rescue 786, Ralmed, St John EMS - Jhb Base.
- Sets `city` to `Randburg` or `Sandton` accordingly.
- Inserts 4 additional fictitious providers (so the list feels well-populated) with `gen_random_uuid()` owner_ids, status `approved`, subscription `active`, `accepting_patients=true`, ownership `private`, valid emergency_phone, and small lat-lng jitter inside each suburb:
  - Randburg: "Randburg Rapid Medics", "Ferndale Emergency Response".
  - Sandton: "Sandton Med Evac", "Rivonia ER Services".

Each row also gets `dispatch_priority=0` and `tier='tier_2'` so they qualify for dispatch.

## Files touched

- `src/modules/holarchelp/components/SosVoiceNoteDialog.tsx` — guard against double `onClose` on cancel.
- `src/pages/admin/HolarcHelpProviders.tsx` — relabel tab to "ER Providers".
- `supabase/migrations/<new>.sql` — update JoBurg ER provider coordinates and insert four fictitious Randburg/Sandton providers.

No changes to `HolarcHelpIncidentDetail`, `AvailableResponders`, `dispatch-sos`, `SosLiveMap`, or the auto-assign function — fixing the data unblocks the existing UI.
