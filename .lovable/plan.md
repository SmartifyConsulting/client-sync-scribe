# UX Audit Fixes 1–9

Additive only. No deletions, no new tables, no schema changes.

## 1. 2FA secret persistence (safer approach)

Skip building a `totp_secrets` table — Supabase Auth already stores TOTP secrets in its hardened `auth` schema. Instead, change enrollment to **reuse** any existing unverified factor rather than unenroll + recreate, so the QR/secret stays stable when a user abandons and returns.

Files:
- `src/components/auth/MfaEnrollScreen.tsx`
- `src/components/auth/TwoFactorSetup.tsx`

Logic in both:
1. Call `supabase.auth.mfa.listFactors()`.
2. If an `unverified` TOTP factor exists → reuse its `id`, `qr_code`, `secret`.
3. Only if none exists → `supabase.auth.mfa.enroll({ factorType: 'totp' })`.
4. Keep the existing verify flow untouched.

## 2. 2FA UI redesign (both screens)

Apply consistently to `MfaEnrollScreen.tsx` and `TwoFactorSetup.tsx`:
- Holarc Health logo at top
- Label: "Account security · One-time setup"
- Responsive copy: "Tap below" (mobile) / "Click below" (desktop) via Tailwind `sm:` breakpoints
- Three authenticator download buttons: Google Authenticator, Authy, Microsoft Authenticator (platform-aware iOS/Android links — extend existing `AuthenticatorDownload` helper)
- "Need help? Contact support" → `mailto:support@holarchealth.com`
- Descriptive `alt` on QR image for screen readers
- Success state: green check in circle (Framer Motion, already imported), "You're all set!" heading, explanatory text, "Continue to Dashboard" button

## 3. Branded 404 (`src/pages/NotFound.tsx`)

- Holarc Health logo
- "404" display + "Page not found" heading
- Friendly copy
- Two CTAs: primary teal "Back to Home" → `/`, outline "Contact Support" → `mailto:support@holarchealth.com`
- Use semantic tokens (`bg-primary`, `text-primary-foreground`, etc.) — no hardcoded hex
- Keep existing route-logging `useEffect` intact

## 4. Route aliases (`src/App.tsx`)

Add (do not remove anything):
```tsx
<Route path="/login" element={<Auth />} />
<Route path="/signup" element={<Auth />} />
<Route path="/onboarding" element={<Auth />} />
```

## 5. Skip-to-content link (`src/App.tsx`)

Right after `<BrowserRouter>`:
```tsx
<a href="#main-content"
   className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md">
  Skip to main content
</a>
```
Wrap existing `<Routes>` in `<main id="main-content">` (or a `div` if `main` conflicts with nested layouts — will verify on read).

## 6. OG / Twitter meta (`index.html`)

Add (keep all existing meta):
```html
<meta property="og:url" content="https://www.holarchealth.com/" />
<meta property="og:image" content="https://www.holarchealth.com/og-preview.png" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:image" content="https://www.holarchealth.com/og-preview.png" />
```
Note: `public/og-preview.png` (1200×630) must be added separately by user — flagging, not blocking.

## 7. Favicon (`index.html`)

Ensure explicit `<link rel="icon" type="image/x-icon" href="/favicon.ico" />` is present. Add only if missing.

## 8. Landing page 390px audit (`src/pages/Landing.tsx`)

Read-only verification at mobile width. Only patch if a real overflow/clipping issue is found. No structural changes planned.

## 9. Deferred

- #10 Code splitting — separate turn (requires bundle analysis)
- #11 PWA manifest — separate turn (icons, theme color decisions)

## Files touched

- `src/components/auth/MfaEnrollScreen.tsx` (modify)
- `src/components/auth/TwoFactorSetup.tsx` (modify)
- `src/pages/NotFound.tsx` (modify)
- `src/App.tsx` (additive routes + skip link)
- `index.html` (additive meta)
- `src/pages/Landing.tsx` (only if 390px audit finds issue)

No file deletions. No new dependencies. No backend changes.
