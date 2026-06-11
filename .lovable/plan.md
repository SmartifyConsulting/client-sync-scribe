## Why the app freezes after login / navigation

Every authenticated layout (`PatientAppLayout`, `ProviderAppLayout`, `AppLayout`, `MobileHeader`, `BottomNav`) uses `backdrop-blur` on sticky/fixed bars, and wraps the page content in `<AnimatePresence mode="wait">` + `PageTransition` (a `motion.div` that fades + translates on every route change).

`backdrop-blur` forces the browser to re-sample and blur every pixel underneath on each frame. While `PageTransition` is animating the underlying content (opacity + translate), the blurred header/footer must recompute on every frame — across the whole viewport, on three layers (top header, sticky header, bottom nav). On lower-powered devices this produces the multi-second freeze the user is seeing right after login (when the first authenticated route mounts and animates in).

The 2FA QR code itself is a static `<img>` from a data URL and is not the cause; the MfaEnrollScreen success animation is a one-off spring and also not the cause.

## Fix (frontend / presentation only)

1. **Drop `backdrop-blur` from layout chrome.** Replace the translucent + blur combo with a solid token background so the GPU stops re-blurring every frame:
   - `src/components/layout/PatientAppLayout.tsx` header
   - `src/components/layout/ProviderAppLayout.tsx` header
   - `src/components/layout/AppLayout.tsx` (if it has the same pattern — confirm in build)
   - `src/components/layout/MobileHeader.tsx`
   - `src/components/layout/BottomNav.tsx` (3 occurrences)
   - `src/components/auth/SubscriptionGateModal.tsx` overlay
   
   Swap `bg-background/95 backdrop-blur* supports-[backdrop-filter]:bg-background/60` → `bg-background border-…` (keep existing border + sticky/fixed positioning + z-index). Visual difference is minimal; perf difference is large.

2. **Lighten `PageTransition`.** Keep the fade for polish but remove the `y` translate and shorten the duration to ~150ms so the underlying composite work is brief. This also avoids janky interaction with the now-solid bars.

3. **Keep `AnimatePresence mode="wait"`** — it's cheap once the blurred layers are gone. No structural changes to routes/layouts.

4. **No changes to MfaEnrollScreen / TwoFactorSetup / MfaGate / auth flow.** QR rendering, factor reuse, secret reveal, and verification stay exactly as they are.

## Verification

- Sign in as a test user → land on dashboard → confirm no freeze, headers still look correct.
- Navigate between 3–4 routes back-to-back → transitions are smooth, no main-thread stalls.
- Mobile viewport (390px): bottom nav + mobile header still visually distinct against scrolled content.
- 2FA enroll page still shows QR + secret + verify flow unchanged.

## Non-goals

- No backend, auth, or RLS changes.
- No removal of framer-motion.
- No changes to the QR generation / `supabase.auth.mfa.enroll` logic.
