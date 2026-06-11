# Make Holarc Health installable on iOS & Android

The app already ships a valid `manifest.webmanifest` plus `icon-192`, `icon-512`, and `apple-touch-icon.png`, so Android browsers technically already offer "Add to Home Screen" via their menu. The problem is there is no visible cue in the app, and iOS Safari never auto-prompts — users have to know to tap Share → Add to Home Screen. This plan adds clear, in-app install affordances for both platforms without touching any backend logic.

## What I'll build

1. **`InstallAppButton` component** (new, `src/components/InstallAppButton.tsx`)
   - Listens for the `beforeinstallprompt` event (Android/Chrome/Edge) and, when fired, shows an "Install app" button that triggers the native install prompt.
   - On iOS Safari (detected via UA + `navigator.standalone`), shows an "Add to Home Screen" button that opens a small dialog with illustrated steps: tap the Share icon → "Add to Home Screen" → "Add".
   - Hides itself entirely when the app is already running standalone (`display-mode: standalone` or `navigator.standalone === true`) or after a successful install (`appinstalled` event).
   - Remembers a "dismiss for 7 days" choice in `localStorage` so it isn't nagging.

2. **Placement** — two entry points so users always find it:
   - **Landing page** (`src/pages/Landing.tsx`): a teal pill button in the hero/CTA area, "📱 Install the app".
   - **Top bar / mobile header** (`src/components/layout/MobileHeader.tsx` and the desktop sidebar footer): a compact icon button visible only when installable, so logged-in users can install later.

3. **Manifest tidy-up** (`public/manifest.webmanifest`)
   - Update `theme_color` to the brand teal `#2DB0A6` (currently `#0F766E`).
   - Add `"id": "/"` and `"display_override": ["standalone", "minimal-ui"]` for better cross-browser behavior.
   - Confirm existing 192/512 + maskable icons cover Android install requirements (they do).

4. **Head tags** (`index.html`) — already has `manifest`, `apple-touch-icon`, `theme-color`, `apple-mobile-web-app-capable`, `apple-mobile-web-app-title`. Only change: align `theme-color` to `#2DB0A6` to match the manifest.

5. **No service worker, no offline mode.** Per the PWA skill, manifest-only is the correct scope for "let me install it on my phone". I won't add `vite-plugin-pwa`, Workbox, or any SW — those would risk breaking the Lovable preview and aren't needed for home-screen install.

## Platform behavior the user should expect

- **Android (Chrome/Edge/Samsung Internet):** the in-app "Install app" button triggers the real OS install sheet. One tap, app icon lands on the home screen.
- **iOS (Safari 16.4+):** Apple does not allow programmatic install. The button opens an instructional sheet showing the Share → Add to Home Screen flow. This is the standard, App Store-compliant pattern every iOS PWA uses (Twitter, Starbucks, etc.).
- **iOS in-app browsers** (Instagram, Facebook, LinkedIn webviews): install is impossible there; the sheet will tell the user to "Open in Safari" first.
- **Desktop Chrome/Edge:** the same Android path works — they get a desktop install prompt.

## Out of scope

- Offline support / service worker (not requested).
- Push notifications (separate flow, would need backend work).
- App Store / Play Store submission (that's the Capacitor native path — happy to plan separately if you want a true native app).

After implementation, you'll see the "Install app" button on the landing page and in the header whenever the browser supports install — open the preview on your phone to test.
