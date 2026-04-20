

# Plan: De-duplicate Bug Icon, Recolor Green, Make App Installable

## Part 1 — Single green Bug button

**Problem:** `MobileHeader` renders its own Bug button **and** then mounts `<TopBarIcons />` which renders another Bug button → two icons stacked side-by-side on mobile. Doctors and patients both already share `TopBarIcons`, so a single instance there serves both roles; the duplicate in `MobileHeader` is the offender.

**Fix:**

| File | Change |
|---|---|
| `src/components/layout/MobileHeader.tsx` | Remove the local Bug button + `ReportFixSheet` mount + `useState`. Keep only the logo and `<TopBarIcons />`. |
| `src/components/layout/TopBarIcons.tsx` | Change Bug button background from `bg-terracotta hover:bg-terracotta-dark` to `bg-green-600 hover:bg-green-700`. Icon stays `text-white`. |

Result: one green Bug pill with a white bug icon, visible to both doctors (AppLayout) and patients (PatientAppLayout) since both layouts mount `TopBarIcons`.

## Part 2 — PWA installability (no service worker)

Per Lovable's PWA guidance, full `vite-plugin-pwa` + service workers cause stale-cache and routing issues inside the editor preview iframe. Since the goal is **distribution / install to home screen** (not offline support), the recommended approach is a **manifest-only PWA**: phones get the "Add to Home Screen" / install prompt and the app launches standalone, without any service worker.

**Files added/changed:**

| File | Change |
|---|---|
| `public/manifest.webmanifest` | **new** — name "Holarc Health", short_name "Holarc", `start_url: "/"`, `display: "standalone"`, theme/background colors from brand (teal `#0F766E` + white), icons referencing the new PNGs below. |
| `public/icon-192.png` | **new** — 192×192 app icon generated from the existing Holarc logo. |
| `public/icon-512.png` | **new** — 512×512 app icon (also `purpose: "any maskable"` entry in manifest). |
| `public/apple-touch-icon.png` | **new** — 180×180 for iOS home-screen install. |
| `index.html` | Add `<link rel="manifest" href="/manifest.webmanifest">`, `<link rel="apple-touch-icon" href="/apple-touch-icon.png">`, `<meta name="theme-color" content="#0F766E">`, `<meta name="apple-mobile-web-app-capable" content="yes">`, `<meta name="apple-mobile-web-app-status-bar-style" content="default">`, `<meta name="apple-mobile-web-app-title" content="Holarc">`. |

**Explicitly NOT included:**
- No `vite-plugin-pwa`, no service worker, no offline cache — avoids iframe/preview breakage and stale-content issues called out in Lovable's PWA guidance.
- No Capacitor / native wrap.

**How users install after this ships:**
- iPhone (Safari): Share → Add to Home Screen.
- Android (Chrome): browser menu → Install app / Add to Home Screen.
- Desktop Chrome/Edge: install icon in the URL bar.
The app launches in standalone mode (no browser chrome) using the teal theme color.

## Out of scope
- Offline support (would require a service worker — deferred per PWA guidance).
- Push notifications.
- App-store packaging.
- Security-scan items shown in the side panel (separate task).

