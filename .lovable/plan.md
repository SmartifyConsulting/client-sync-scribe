# Early Release Notice, Auth Hardening & Support Link

## 1. Post-login "Early Release" notice
- Add a dismissible dialog/banner shown once per user after successful login.
- Copy (verbatim): *"You are participating in an early release of Holarc Health. As we continue to expand functionality and improve the platform, some features may evolve and occasional issues may occur. Your feedback is invaluable and can be submitted through the Bug Log feature found next to the notification button."*
- Persist dismissal in `localStorage` keyed by user id (`holarc_early_release_seen_<uid>`) so it only appears on first login per device/account.
- Mount inside `AppLayout` (and patient layout) so it covers both doctor and patient roles.

## 2. Disable public sign-ups
- In `src/pages/Auth.tsx`: remove/hide the "Sign up" tab and any signup CTA — keep Sign In + Forgot Password only.
- Call `supabase--configure_auth` with `disable_signup: true` so the backend also rejects signups.
- Provider/patient signup routes already gated; leave landing CTAs pointing to contact panel (already done).

## 3. Password reset (verify + ensure email delivery)
- `/forgot-password` and `/reset-password` pages already exist and work via the `send-password-reset` edge function (uses shared Resend sender).
- Verify the flow end-to-end:
  - Forgot Password page calls `send-password-reset` with `redirectTo = ${origin}/reset-password`.
  - Confirm `RESEND_API_KEY` + `EMAIL_FROM` secrets are set; if missing, prompt user to add them.
  - Confirm `send-password-reset` is deployed.
- No template/UX changes unless verification reveals an issue.

## 4. "Contact Support" footer link
- Add a `Contact Support` link in `src/components/layout/Footer.tsx` (desktop) and as a small line in `BottomNav` area / mobile footer strip so it appears app-wide.
- `href="mailto:support@holarchealth.com?subject=Holarc%20Health%20Support"`.

## Files touched
- New: `src/components/EarlyReleaseNotice.tsx`
- Edit: `src/components/layout/AppLayout.tsx`, patient layout (mount notice)
- Edit: `src/pages/Auth.tsx` (remove signup tab)
- Edit: `src/components/layout/Footer.tsx` (+ mobile equivalent) — add support mailto
- Backend: `supabase--configure_auth` → disable signups; verify `send-password-reset` deploy + Resend secret

## Acceptance
- [ ] First login shows the early-release dialog; dismiss persists.
- [ ] `/auth` shows only Sign In + Forgot Password (no signup form).
- [ ] Forgot password email arrives via Resend; reset link lands on `/reset-password` and updates password.
- [ ] Footer "Contact Support" opens mail client to support@holarchealth.com.
