## 1. Move SOS to bottom-right of patient nav

In `src/components/layout/BottomNav.tsx`, change the patient `items` array so the Guardian SOS button is appended to the **end** (rightmost slot) instead of being inserted before "My Rewards":

```text
[ My Profile ] [ My Holarchy ] [ My Desk ] [ My Rewards ] [ SOS ]
```

No other styling changes — SOS keeps the existing `Shield` icon and active-state highlight.

## 2. Stop the Vula award animation

Two animations currently fire when opening `/patient/rewards`:

- **Auto-popup**: `VulaExplainerDialog` opens automatically on first visit (driven by a `localStorage` flag). Users said this is intrusive.
- **Page fade-in**: the page wrapper has `animate-fade-in` which gives a slide-up entrance.

Changes in `src/pages/patient/MyRewards.tsx`:
- Remove the `useEffect` that auto-opens the explainer. The dialog will still be reachable via the existing "What are Vulas?" info button in the header.
- Remove `animate-fade-in` from the root `<div>` wrapper so the page renders statically.

The `VulaExplainerDialog` component itself stays unchanged (still available on demand).

## 3. Enable Location services for the app

Geolocation works in browsers without site config — it's gated by per-user browser prompts. Two improvements:

**a. Allow geolocation in iframes / embedded contexts**
Add a `Permissions-Policy` meta tag to `index.html`:

```html
<meta http-equiv="Permissions-Policy" content="geolocation=(self)" />
```

This explicitly grants geolocation to the current origin, which matters for the Lovable preview iframe and any future PWA/Capacitor wrapping.

**b. Request location permission at the right moment**
Update `src/modules/guardian/hooks/useLocationTracking.ts` so that when an SOS incident starts, we:
- Call `navigator.permissions.query({ name: "geolocation" })` first.
- If `state === "prompt"`, kick off a one-shot `getCurrentPosition` to trigger the browser permission dialog before starting the watcher.
- If `state === "denied"`, surface a toast telling the user to enable location in their browser settings (so they aren't left wondering why tracking is silent).

Also add a small "Enable location" pre-flight button on `GuardianHome` that calls `getCurrentPosition` once, so patients can grant permission **before** an emergency.

## Technical notes

- Files touched: `src/components/layout/BottomNav.tsx`, `src/pages/patient/MyRewards.tsx`, `index.html`, `src/modules/guardian/hooks/useLocationTracking.ts`, `src/modules/guardian/pages/GuardianHome.tsx`.
- No DB migration, no edge function changes, no new dependencies.
- The existing localStorage key `vulas_explainer_seen_v1` is left in place (harmless) so users who've already dismissed it stay dismissed.
