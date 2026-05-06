## Root cause

The "circular processing icons" are stuck because the SOS home screen rehydrates an **existing open incident from earlier** (confirmed in DB: `df59b35f…` opened at 17:19, no responder) and shows the confirmation view with three spinners. The flags that turn those spinners into checkmarks (`coords`, `contactsNotified`, `providerAssigned`) are only set inside the fresh-trigger flow, so on rehydration they spin forever — and the only escape ("View live tracking →") is a small text link that's easy to miss.

## Fix (one file: `src/modules/holarchelp/pages/HolarcHelpHome.tsx`)

1. **Redirect rehydrated incidents to live tracking.** On the initial mount fetch, if an active incident is found, `navigate("/patient/holarchelp/incident/:id", { replace: true })` instead of dropping the user into the confirmation view. This kills the stuck-spinner case entirely for stale incidents.

2. **Add safety timeouts on the confirmation view** (so even fresh triggers can never hang):
   - "Contacts notified" — already flips on the `share-incident-with-contacts` `.then`. Add a fallback `setTimeout(8000)` that marks it done if no signal arrives.
   - "Searching for nearby providers" — flips on realtime `assigned_provider_id`. After 30s, change the label to "Still searching…" and stop spinning; the live-tracking button below remains the next step.

3. **Promote the escape route.** Replace the small "View live tracking →" text link with a full-width primary button (`h-12 rounded-2xl`) so the user always has a clear way forward from the confirmation screen.

4. **Gate the cancel countdown on incident age.** Only run the 10-second countdown when `created_at` is within the last 30 seconds (i.e. truly fresh). For older incidents the button is hidden — and after fix #1, those users won't be on this screen anyway.

## Files

- `src/modules/holarchelp/pages/HolarcHelpHome.tsx`

## Out of scope

- No DB migrations.
- No changes to the incident detail page, history, contacts, nearby, or provider screens.
