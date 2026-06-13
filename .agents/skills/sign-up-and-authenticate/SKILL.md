---
name: sign-up-and-authenticate
description: Rules for building or modifying any auth surface in this project — sign-up, sign-in, sign-out, password reset, email verification, 2FA, onboarding tips, post-sign-in install-app banner. Fires on terms like "auth", "login", "signin", "signup", "register", "forgot password", "reset password", "verify email", "2FA", "MFA", "install app banner", and on edits to /auth, /verify-email, /reset-password, /forgot-password, /auth/challenge, useAuth, RequireAuth, RequireEmailVerified, InstallAppBanner.
---

# Sign-Up & Authenticate

Conventions every auth change in this app must follow. Do not invent alternative flows; extend the patterns below.

## 1. Sign-up never blocks on email

- Supabase `auto_confirm_email = true`. New users get a session immediately on `signUp`.
- After `signUp`, route straight into onboarding: `/onboarding/signature?next=/onboarding/plan` → `/dashboard`. Do not show a "check your email" screen.
- Reason: friction at registration is the biggest drop-off in this product.

## 2. Email verification — once, on the second sign-in

The user verifies exactly once, ever. Logic lives in `profiles.login_count` and `profiles.email_verified_at`.

- `useAuth` bumps `login_count` on every `SIGNED_IN` via `bump_login_count` RPC. Dedupe per access-token suffix so React StrictMode / refresh doesn't double-count.
- Gate authed routes with `<RequireEmailVerified>`. Redirect to `/verify-email` **only** when all are true:
  - provider is `email` (OAuth users are exempt — see §3),
  - `login_count >= 2`,
  - `email_verified_at IS NULL`.
- `/verify-email` flow is **link-based**, not code-based:
  - Auto-call `supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false, emailRedirectTo: \`${origin}/verify-email?verified=1\` } })`.
  - When the user returns with `?verified=1`, call `mark_email_verified` RPC, toast success, navigate to `/dashboard`.
  - Never ask for a 6-digit code. The default Lovable auth email is a one-time login link, not a code.
- After verification, the gate is inert for that user forever — never re-prompt.

## 3. OAuth users skip verification entirely

- On `SIGNED_IN`, if `session.user.app_metadata.provider !== "email"`, call `mark_email_verified_if_oauth` RPC. It sets `email_verified_at = now()` (idempotent, security definer).
- `RequireEmailVerified` also short-circuits to `ok` when provider is not `email`, so OAuth users never hit `/verify-email` even before the RPC lands.

## 4. 2FA — email link only

- Settings page (`Profile`) renders `TwoFactorSection` with a toggle backed by `user_mfa_email { user_id, enabled }`.
- On password sign-in in `Auth.tsx`: after a successful `signInWithPassword`, look up `user_mfa_email.enabled`. If true, `navigate("/auth/challenge?type=email&next=...")` instead of going to the destination.
- `/auth/challenge` (email mode) sends `signInWithOtp` with `emailRedirectTo` back to `next`. Clicking the emailed link completes the challenge — no code entry.
- TOTP/authenticator-app and 6-digit email codes are **out of scope** for this skill. Label any such UI "Coming soon" and keep the switch disabled. Do not add a true email-code path until a custom code sender is in place — the project's branded sender domain is not currently verified.

## 5. First-time onboarding tips

- `DashboardTour` is a portal-based spotlight using `data-tour` attributes on the avatar, "+ New" button, filter chips, and Plans button.
- Auto-runs on first dashboard visit, gated by `localStorage["snappy.tour.dashboard.v1"]`.
- Re-trigger entry in `AppHeader` user dropdown ("Show navigation tips") clears the key and re-mounts the tour.

## 6. Password fields always show a visibility toggle

Every password `<Input type="password">` — sign-up, sign-in, reset — wraps a right-aligned eye / eye-off button.

- State is **per-field**, never shared across fields on the same screen.
- Use `lucide-react`'s `Eye` / `EyeOff` icons.
- Toggle button itself uses `tabIndex={-1}` so it doesn't interrupt the Tab sequence (§8).

## 7. Forgot Password is required on every auth flow

- Every sign-in screen has a "Forgot password?" link. Required by the cross-project user rule, also stored in `mem://~user`.
- `/forgot-password`: `resetPasswordForEmail(email, { redirectTo: \`${origin}/reset-password\` })`.
- `/reset-password`: **public route**, checks for `type=recovery` in the URL hash, calls `supabase.auth.updateUser({ password })`, then navigates to `/dashboard`. Without this page, recovery links silently auto-log-in users without rotating the password.

## 7a. Meaningful password feedback

Never bubble up raw Supabase errors for password flows. Map them through a single helper (e.g. `mapAuthError(error)`) and render the result both as a toast **and** as inline text with `aria-live="polite"` next to the field. A generic "invalid password" hides the actual fix from the user.

**Sign-up — strength rules** (enforced client-side before submit, mirrored by Supabase):
- min 8 characters
- contains at least one letter and one number
- not equal to the email local-part
- Render a live checklist under the password field; each rule ticks green as it passes. On submit, focus the first failing rule.

**Leaked-password rejection (HIBP)** — Supabase returns `error.code === "weak_password"` or message containing "pwned"/"compromised":
> "This password has appeared in a known data breach. Pick a different one — even adding 2 unique characters helps."

**Sign-in failures** — never reveal which field is wrong (prevents account enumeration). Collapse `invalid_credentials`, `user_not_found`, and `invalid_grant` into one message:
> "Email or password is incorrect."

Other sign-in cases keep their specifics: `email_not_confirmed` → "Confirm your email to continue"; `user_banned` → "This account is suspended — contact support."

**Reset password**:
- Apply the same strength rules.
- `same_password` → "Your new password must be different from your current one."
- Expired/invalid recovery link → "This reset link has expired. Request a new one." with a button back to `/forgot-password`.

**Rate limits** (`over_request_rate_limit`, `over_email_send_rate_limit`, HTTP 429): parse seconds from the message or `Retry-After` and show:
> "Too many attempts. Try again in {N} seconds."
Disable the submit button until the countdown ends.

**Network / unknown**: fall back to "Something went wrong — please try again." Log the original `error.code` / `error.message` to the console for debugging; never to the toast.

**Helper shape:**
```ts
// src/lib/auth-errors.ts
export function mapAuthError(e: { code?: string; message?: string; status?: number }): string {
  // Switch on e.code first, then heuristics on e.message. Return a single string.
}
```
Use this helper in `Auth.tsx`, `ForgotPassword.tsx`, `ResetPassword.tsx`, and `VerifyEmail.tsx`. Do not duplicate the string table inside components.

## 8. Sign-in tab order: Email → Password → Submit → Forgot

Logical sequence Email → Password → Submit. Forgot Password is reachable but never lands between Password and Submit.

- Implementation: the "Forgot password?" `<Link>` uses `tabIndex={-1}`.
- The password visibility toggle button also uses `tabIndex={-1}`.
- Submit button has no `tabIndex` override (natural 0).

## 9. Project invariants (don't break)

- Never insert into `ndas` or `signatures` from the client — go through the `create-nda` edge function (calls `consume_nda_entitlement`).
- Roles live in `user_roles` + `has_role(uuid, app_role)`. Never put a role column on `profiles`.
- Do not edit `src/integrations/supabase/client.ts` or `src/integrations/supabase/types.ts` — auto-generated.
- Public share-token RPCs (`get_nda_by_token`, `get_signatures_by_token`, `get_active_change_request_by_token`, `sign_nda`, `request_nda_changes`) and `has_role` are intentionally anon-callable.

## 10. Install-app banner persists on every sign-in

Every authenticated session must render a persistent **install-app banner** at the very top of the app shell (above `AppHeader` / `MobileHeader`), on every page, until the user either installs the app or explicitly dismisses it.

**Component:** `src/components/InstallAppBanner.tsx`. Reuses the styling of `InstallAppPrompt` — teal-tinted rounded card (`border-primary/30 bg-primary/5`), Smartphone icon in a `bg-primary/15` circle, heading "Install Holarc on your phone", subline "Works on iPhone and Android — one-tap access from your home screen.", and an `InstallAppButton variant="primary"` action. Adds a right-aligned dismiss (X) button.

**Visibility — evaluated in this order, first match wins:**
1. Hidden if `isStandalone()` is true (already installed — same check as `InstallAppPrompt`).
2. Hidden once `appinstalled` fires in the current tab.
3. Hidden if `localStorage["holarc-install-banner-dismissed"] === "1"`. This is a **permanent** dismiss — it intentionally survives sign-out / sign-in. The only ways back are clearing site data or a future "Show install tips again" entry in the user dropdown.
4. Otherwise visible on every authenticated route, including immediately after each fresh sign-in and on every subsequent navigation.

**Keys — do not collide:**
- Banner: `holarc-install-banner-dismissed` (string `"1"`, no expiry).
- Compact header button: `holarc-install-dismissed-until` (7-day soft dismiss, owned by `InstallAppButton`). Leave it alone.

**Dismiss button:** sets `holarc-install-banner-dismissed = "1"`, hides the banner, no toast, no analytics.

**Install button:** delegates to `InstallAppButton` (it owns `beforeinstallprompt`, the iOS Safari instructions sheet, and the Android browser-specific instructions sheet). On `appinstalled` the banner removes itself automatically.

**Mount point:** the authenticated layout wrapper that hosts the header — the same boundary as `RequireEmailVerified`. The banner must **not** mount on `/auth`, `/verify-email`, `/forgot-password`, `/reset-password`, or `/auth/challenge`; those screens stay focused on the auth task.

**Accessibility:**
- Container: `<section role="region" aria-label="Install app">`.
- Dismiss button: `aria-label="Dismiss install banner"` and `tabIndex={-1}` so it never lands inside the §8 auth-form tab sequence on pages that also render forms.

**Do not:**
- Re-prompt on a timer after dismissal.
- Track dismissals server-side.
- Modify `InstallAppButton` or `InstallAppPrompt` behavior.
- Use any localStorage key other than `holarc-install-banner-dismissed` for this banner.

## File map

| Concern | File |
| --- | --- |
| Session + login-count bump + OAuth verify | `src/hooks/useAuth.tsx` |
| Sign-up / sign-in / Google / tab order | `src/pages/Auth.tsx` |
| Verification gate | `src/components/RequireEmailVerified.tsx` |
| Verification page (link-based) | `src/pages/VerifyEmail.tsx` |
| 2FA settings UI | `src/components/security/TwoFactorSection.tsx` |
| 2FA challenge | `src/pages/AuthChallenge.tsx` |
| Onboarding tour | `src/components/DashboardTour.tsx` |
| Forgot / Reset | `src/pages/ForgotPassword.tsx`, `src/pages/ResetPassword.tsx` |
| Persistent install banner | `src/components/InstallAppBanner.tsx` (mounted in authed layout) |

## Relevant RPCs

- `bump_login_count()` — increments `profiles.login_count` for `auth.uid()`.
- `mark_email_verified()` — sets `email_verified_at = now()` (idempotent).
- `mark_email_verified_if_oauth()` — same, gated on `auth.users.raw_app_meta_data->>'provider' <> 'email'`.
