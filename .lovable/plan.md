## What's actually happening

You have an SOS incident open since 19:19 (status `open`, no provider has accepted yet — 2 ambulances were offered, both still `pending`). Two separate things are biting you:

**1. You can't navigate away from the active incident.**
`HolarcHelpHome` has this rule: if you have any live incident older than 30 seconds, it `navigate(..., { replace: true })` straight to `/patient/holarchelp/incident/<id>`. Your incident is over an hour old, so every time you tap **SOS Home** (or back), the home screen instantly bounces you back to the incident detail. Same loop applies to the Nearby page — you go to home first, get redirected, never reach Nearby.

**2. The Nearby/search page has nothing to show you anyway.**
The DB has 16 approved ambulances, all `ownership = private`, and 0 approved hospitals (the 67 hospitals I reported earlier were on a different env / since changed — current count is 0 approved). The map is empty for you because there are no approved hospitals at all, and the ambulance dispatch *did* find 2 within 50 km — but neither responder has accepted, so the active incident screen just keeps spinning "Finding nearest ambulance…".

## Fix

### `src/modules/holarchelp/pages/HolarcHelpHome.tsx`
- Remove the "if incident age > 30s, auto-redirect to detail" block. Instead, when there's a live incident, render the normal home screen with a prominent **"Active SOS in progress — Resume"** banner at the top that links to `/patient/holarchelp/incident/<id>`. This unblocks back-navigation and lets you reach **Find nearby provider** while the SOS is still live.
- Keep the existing realtime cleanup that clears `activeIncidentId` when the incident is completed/cancelled.

### `src/modules/holarchelp/pages/HolarcHelpIncidentDetail.tsx`
- The **SOS Home** back button already calls `navigate("/patient/holarchelp")`. With the home fix above, that will now actually land on home instead of bouncing back. No further change needed here.
- Add a small "Search nearby providers" link in the sticky bar (next to History) so you can jump straight from an active incident to the Nearby map — useful when responders are slow.

### `src/modules/holarchelp/pages/HolarcHelpNearby.tsx`
- Already shows the full approved list with Public/Private badges (last change). Add an explicit empty-state line that distinguishes "no hospitals approved yet" vs "no ambulances approved yet" so it's obvious why a category is missing, instead of just showing one combined empty message.

### Out of scope
- No DB backfill of public/private ownership.
- No changes to dispatch-sos logic or auto-accept behaviour. Pending offers staying pending is a responder-side issue (no provider app accepting), not a search bug — separate fix if you want it.
- No SOS trigger / hold-button changes.

### Verification
- Open `/patient/holarchelp/incident/df59…` → tap **SOS Home** → land on the SOS home with a "Resume active SOS" banner, **not** redirected back.
- From home, tap **Find nearby provider** → map loads, list shows the 16 approved ambulances with Private badges, and an explicit "No approved hospitals yet" note where hospitals would appear.
- Resume banner deep-links back to the incident detail.
