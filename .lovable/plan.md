## Problem

On Android **and iOS**, no "Install app" message appears near the Login button. Causes:

1. `InstallAppButton` is not placed on the Auth page — only on Landing and the mobile header.
2. The Android button only renders after Chrome fires `beforeinstallprompt`. That event does NOT fire inside the Lovable preview iframe, in in-app browsers (Facebook, Instagram, LinkedIn), in some Android browsers (Firefox, Samsung Internet, Opera), or before Chrome's engagement heuristics are satisfied.
3. iOS Safari never fires `beforeinstallprompt`. The existing component already detects iOS, but with no placement on Auth there is nothing to tap.

Result: nothing shows on either platform near the Login button.

## Fix

### 1. Place an install block on the Auth page (iOS + Android + desktop)

Add an `InstallAppPrompt` block directly below the **Login** button (and below the Sign Up button on the signup variant) with copy like:

> 📱 **Install Holarc on your phone** — get one-tap access from your home screen.
> [ Install app ]

Visible on all viewports. Same block renders for iOS (Safari + Chrome on iPhone/iPad) and Android — only the dialog content differs by platform when tapped.

### 2. Make the button work everywhere — even without `beforeinstallprompt`

Update `src/components/InstallAppButton.tsx`:

- Keep current behavior: if `beforeinstallprompt` fires, tapping triggers the native Android install sheet.
- iOS (already handled): tapping opens the existing 3-step Safari "Share → Add to Home Screen → Add" dialog. Keep this exactly as-is.
- New Android fallback: when no native prompt is captured AND the device is Android (UA contains `Android`) AND not already standalone, still render the button. Tap opens an instruction dialog mirroring the iOS one:
  - **Chrome / Edge:** "Tap the ⋮ menu → **Install app** (or **Add to Home screen**)."
  - **Samsung Internet:** "Tap the ☰ menu → **Add page to** → **Home screen**."
  - **Firefox:** "Tap the ⋮ menu → **Install**."
  - **In-app browser (FB / Instagram / LinkedIn / TikTok):** "Tap ⋯ → **Open in Chrome** first, then follow the steps above."
- iOS in-app browsers (FB / Instagram / LinkedIn / TikTok / Gmail): existing iOS dialog already has the "Open in Safari first" branch — verify the copy is shown and keep it.
- Hide entirely only when `isStandalone()` is true (already installed). Drop the early `return null` that hides on desktop non-iOS so desktop Chrome/Edge users also get the dialog fallback.

### 3. Add a new `InstallAppPrompt` wrapper component

`src/components/InstallAppPrompt.tsx` — a card-style block with icon, heading, one-line description, and `<InstallAppButton variant="primary" />`. Hidden when `isStandalone()` is true. Reusable so we can drop it on Landing later if desired.

### 4. Auth page placement

In `src/pages/Auth.tsx`, render `<InstallAppPrompt />`:
- Below the Login submit button on the sign-in view.
- Below the final Sign Up step's submit button on the signup view.

No layout shuffling beyond inserting the block. Visible identically on iOS and Android.

## Out of scope

- No service worker / offline mode changes.
- No manifest changes (already correct: `display: standalone`, `theme_color: #2DB0A6`, icons 192/512 + maskable).
- No native (Capacitor) wrapper.

## Why iOS will always show instructions (not a one-tap button)

Apple does not expose a programmatic install API. Every iOS PWA (Twitter, Starbucks, Pinterest) uses the same Share → Add to Home Screen instructional pattern. This is the iOS-correct behavior, not a limitation we can engineer around.