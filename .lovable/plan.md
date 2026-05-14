# Fix five SOS issues

## 1. SOS acknowledgement checkboxes stay checked between logins

**Cause:** `HolarcHelpHome.tsx` persists the three ack checkboxes to `localStorage` under `holarchelp.sos.ack.v3`. The key is global (not user-scoped), so once anyone on the device ticks them, every subsequent login (including Sharron) sees them pre-checked.

**Fix:** Remove the localStorage persistence. Always initialise `ack` to `{ a: false, b: false, c: false }` and drop the `setItem` / `getItem` calls. Re-acknowledging each session is the safer default for a life-critical action.

## 2. SOS blocked when patient has no emergency contact

**Cause:** `triggerSOS` in `HolarcHelpHome.tsx` (lines 154–158) hard-blocks and redirects to the profile page when `hasEmergency === false`.

**Fix:** Remove the block. Always proceed with the SOS dispatch. If `hasEmergency` is false, still fire the alert and show a non-blocking toast: "SOS sent. Add an emergency contact later so we can also notify someone you trust." The "Notify contacts on WhatsApp" section already renders nothing when there are no contacts.

## 3. SOS button: replace hold-to-trigger with single click

**Cause:** `HolarcHelpHome.tsx` requires a 1 s pointer-hold (`startHold` / `cancelHold` / `HOLD_MS = 1000`) plus a progress ring before firing.

**Fix:** Replace with a plain `onClick` handler that calls `triggerSOS` (or navigates to the active incident). Remove `holdProgress`, `holdTimerRef`, `holdStartRef`, the `<svg>` progress ring and the pointer-down/up/cancel handlers. Keep the three acknowledgements as the gate: button stays `disabled` until `allAck` is true. Update the button label/aria from "Hold for help" to "Tap for help". Keep the haptic vibration on press.

## 4. Show the picked / auto-assigned responder in the timeline history

**Cause:** `IncidentTimeline.tsx` renders generic event rows like "auto_assigned" or "patient_picked" but never names the hospital or ambulance that was chosen. The detail header now shows it (with the AUTO badge), but the historical timeline does not — so once you scroll past or the incident is closed, you can't see which provider was actually engaged at each step.

**Fix:**
- In `IncidentTimeline.tsx`, when an event row is one of `auto_assigned`, `patient_picked`, `accepted`, `declined`, `reassigned`, look up the responder name (ambulance `company_name` or hospital `name`) for the `provider_id` referenced on that event row (events table already stores it; if not, join on `incident.assigned_provider_id` at that point in time using `event.metadata.provider_id`).
- Render the responder name + kind icon (🚑 / 🏥) inline on that timeline row, e.g. *"Auto-assigned · 🏥 Netcare Rosebank Hospital"* or *"You picked · 🚑 ER24 Sandton"*.
- Apply the same enrichment in `PatientIncidentHistory.tsx` so the closed-incident list also shows the responder name under each entry (not just the status badge), with an "AUTO" pill when the assignment came from `auto_assigned`.
- Batch the provider lookups: collect all distinct provider IDs across the timeline, fetch ambulances + hospitals in two parallel `.in('id', [...])` queries, then map names back onto rows.

## 5. Google Map shows a blank white box

**Cause:** Map container renders but no tiles appear and no "Map unavailable" fallback is shown — Google rejected the request at tile-load time (likely `RefererNotAllowedMapError`, `ApiNotActivatedMapError`, or `BillingNotEnabledMapError`) without reliably triggering `gm_authFailure`, so our `failed` state never flips.

**Fix in code (so the user always sees a useful diagnostic instead of white):**
- In `LiveMap.tsx`, register `window.gm_authFailure` **before** calling `loadGoogleMaps()`.
- Briefly patch `console.error` during init to capture Google's `"Google Maps JavaScript API error: <CODE>"` messages into state.
- Replace the generic "Map unavailable" fallback with the captured error code plus a one-line human hint and a "Retry" button.
- Add a 6 s watchdog: if no tiles render after init, flip to `failed` so the diagnostic card always appears.

**Outside code (still required — Google Cloud Console settings):**
- Maps JavaScript API enabled
- Billing enabled on the project
- HTTP referrer restrictions include `https://id-preview--*.lovable.app/*` in addition to the existing patterns
- API key not over-restricted to exclude Maps JS

The diagnostic card from the code fix will tell us exactly which one to address.

## Files touched

- `src/modules/holarchelp/pages/HolarcHelpHome.tsx` — drop localStorage acks; remove emergency-contact block; replace hold-to-trigger with single click.
- `src/modules/holarchelp/components/IncidentTimeline.tsx` — enrich assignment events with responder name + kind.
- `src/components/holarchelp/PatientIncidentHistory.tsx` — show responder name + AUTO pill on each closed incident row.
- `src/modules/holarchelp/components/LiveMap.tsx` — earlier `gm_authFailure` hook, error-code capture, watchdog, improved fallback UI.
