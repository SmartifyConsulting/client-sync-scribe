# Plan: Mailgun-powered Auth Email Hook

Route Supabase auth emails (signup confirmation, password reset, magic link, email change, invite, reauthentication) through the Mailgun connector we already wired up — no SMTP password needed.

## What gets built

### 1. New edge function: `supabase/functions/auth-email-hook/index.ts`
- Public endpoint (`verify_jwt = false`) that Supabase Auth calls as a Send Email Hook webhook.
- Verifies the webhook signature using `SEND_EMAIL_HOOK_SECRET` (standard Supabase webhook HMAC, `standardwebhooks` library).
- Parses the auth payload (`user`, `email_data` with `email_action_type`, `token_hash`, `redirect_to`, `site_url`).
- Builds the action URL: `${site_url}/auth/v1/verify?token=${token_hash}&type=${email_action_type}&redirect_to=${redirect_to}`.
- Renders a branded HTML + plain-text email per `email_action_type`:
  - `signup` → "Confirm your HolarcHealth account"
  - `recovery` → "Reset your HolarcHealth password"
  - `magiclink` → "Your HolarcHealth sign-in link"
  - `invite` → "You've been invited to HolarcHealth"
  - `email_change` / `email_change_current` → "Confirm your new email"
  - `reauthentication` → "Confirm your identity" (uses 6-digit token)
- Sends via the existing `sendMailgunEmail` helper in `supabase/functions/_shared/mailgun.ts` from `noreply@holarchealth.com` (display name "HolarcHealth").
- Returns `{}` on success, error JSON with appropriate status on failure.
- Logs each send attempt for debugging.

### 2. `supabase/config.toml`
Add a function block so the hook is publicly invokable:
```
[functions.auth-email-hook]
verify_jwt = false
```

### 3. Secret
Add one new runtime secret: `SEND_EMAIL_HOOK_SECRET`. Supabase generates this value when you enable the hook in the Cloud Auth settings — you paste it in once via the secrets prompt.

### 4. Branding
HolarcHealth red (`#E01837`) primary button, white background, simple inline-styled HTML email — passes spam filters and works in every client. Plain-text fallback included.

## What you need to do (one-time, after I deploy)

1. **Verify a Mailgun sending domain.** In your Mailgun dashboard add `mg.holarchealth.com` (recommended) or use `holarchealth.com` directly. Mailgun shows you 4 DNS records (SPF TXT, DKIM TXT, 2× MX). Add them at your DNS provider; status flips to "Verified" within minutes-to-hours.
2. **Update `MAILGUN_DOMAIN`** secret if you go with `mg.holarchealth.com` instead of `holarchealth.com` (or I'll keep it on the root domain — your call).
3. **Enable the Send Email Hook** in Lovable Cloud → Auth → Hooks: paste the function URL `https://lqnnrvvrjscjceswpfal.supabase.co/functions/v1/auth-email-hook` and the generated secret.
4. **Disable Supabase's built-in SMTP** (so emails don't get sent twice).

Until step 1 completes, signup/reset emails will still be *generated and queued* but Mailgun will reject them — visible as a 4xx in `auth-email-hook` logs. After verification they flow.

## Files touched

- **New:** `supabase/functions/auth-email-hook/index.ts`
- **Edit:** `supabase/config.toml` (add function block)
- **Secret:** request `SEND_EMAIL_HOOK_SECRET`

## Out of scope

- I will NOT scaffold Lovable's built-in auth email templates (you explicitly chose Mailgun).
- I will NOT touch the 8 transactional functions already migrated.
- No changes to frontend auth flow — Supabase still triggers emails the same way; only the *delivery path* changes.

Approve and I'll build it.