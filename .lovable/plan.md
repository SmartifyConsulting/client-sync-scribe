
# Phase 1 — 2FA UX Fixes

Apply consistently to `src/components/auth/MfaEnrollScreen.tsx` (primary gate) and `src/components/auth/TwoFactorSetup.tsx` (legacy dialog). Pure additive/in-place edits — no deletions of existing logic.

## Current state (already done — will be left intact)
- **Issue #1 (factor reuse):** Already implemented in both files via `listFactors()` + `existingUnverified` check.
- **TwoFactorSetup** already has: Holarc logo, progress label, 3 authenticator links, success step, copy-confirm, support link, factor reuse.
- **MfaEnrollScreen** already has: copy-confirm, success animation, support link, factor reuse, sign-out escape.

## Changes per file

### MfaEnrollScreen.tsx
1. Import `holarcLogo` from `@/assets/holarc-logo-clear.png`; render `<img>` (h-10) above the shield circle in the header.
2. Add small uppercase teal label `Account security · One-time setup` above the H1.
3. Add `isMobile` (UA test: `/Mobi|Android/i.test(navigator.userAgent)`); use it to toggle "Tap"/"Click" copy in `AuthenticatorDownload` intro line.
4. Secret reveal toggle: add `secretVisible` state (default `false`); render dots (`•` × secret.length) when hidden, real secret when shown; add Eye/EyeOff icon button beside the `<code>` block. Keep existing Copy Setup Key button untouched (it copies the real secret regardless of visibility).
5. Expand `AuthenticatorDownload` to 4 buttons in a 2-col grid: Google Authenticator (Android), Google Authenticator (iOS), Authy (`https://authy.com/download/`), Microsoft Authenticator (`https://www.microsoft.com/en-us/security/mobile-authenticator-app`). Preserve existing platform-ordering so the user's native store appears first.

### TwoFactorSetup.tsx
1. Add the same secret reveal toggle (Eye/EyeOff) — currently the secret is always plaintext.
2. Replace UA-agnostic `sm:hidden`/`sm:inline` Tap/Click pair with a single line driven by `isMobile` (UA detection) for parity with MfaEnrollScreen.
3. Fix the Microsoft Authenticator row to use a non-Apple icon (use `Shield` or `Download`) — the current `Apple` icon is misleading.
4. Add an Android Google Play row distinct from the generic "Google Authenticator" entry, so the list shows: Google Authenticator (Android), Google Authenticator (iOS), Authy, Microsoft Authenticator (matches MfaEnrollScreen).

## Non-goals (already satisfied; will NOT re-touch)
- Issue #1 logic (factor reuse), success screen, copy-confirm, support email link, mobile sizing of inputs/QR — all already present.
- No routing, no backend, no auth-flow logic changes.

## Test plan
1. `/auth` → trigger 2FA enrollment → verify logo + progress label + 4 app links visible.
2. Refresh mid-setup → QR/secret unchanged (existing factor reuse).
3. Secret dots by default; Eye icon toggles to reveal; Copy still copies real key.
4. Resize to 390px → buttons stack, QR scales, inputs ≥48px.
5. Desktop UA shows "Click", mobile UA shows "Tap".
6. Enter valid TOTP → success state shown before redirect.
