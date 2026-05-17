## Goal
All auth emails (signup confirmation, password reset, magic link, email change, reauthentication) leave via your already-connected Resend account from `no-reply@holarchealth.com`. Lovable Emails is switched off so the two systems don't fight.

## Current state
- `_shared/email.ts` already sends through the Resend connector gateway — verified `holarchealth.com` domain.
- `auth-email-sender` exists but is **not wired into Supabase's auth pipeline**. It's only callable manually (currently from `ForgotPassword.tsx`), so Supabase's own signup confirmation email never goes through it.
- Lovable Emails was the active sender; you've now removed the `notify.nigeria.holarchealth.com` delegation.

## Plan

### 1. Turn off Lovable Emails
Disable the managed Lovable Emails pipeline so Supabase stops trying to route auth mail through it.

### 2. Build a proper Supabase Send Email Hook
Create `supabase/functions/auth-email-hook/index.ts`:
- Verifies the `standard-webhooks` signature using a new `SEND_EMAIL_HOOK_SECRET`.
- Receives Supabase's hook payload (`user`, `email_data` with `token_hash`, `email_action_type`, `redirect_to`, `site_url`).
- Builds the correct action URL (`{site_url}/auth/v1/verify?token={token_hash}&type={email_action_type}&redirect_to={redirect_to}`).
- Renders the branded Holarc Health HTML (reusing the template currently in `auth-email-sender`) per action type: `signup`, `recovery`, `magiclink`, `email_change`, `reauthentication`.
- Sends via `_shared/email.ts` (Resend gateway).
- Returns 200 on success, 4xx/5xx on failure so Supabase retries.

Register it in `supabase/config.toml` with `verify_jwt = false` (hook is signature-verified, not JWT).

### 3. Add the hook secret
Add a single new secret: `SEND_EMAIL_HOOK_SECRET` (you'll generate/paste a value when prompted).

### 4. Enable the hook in Supabase Auth config
Point Supabase's "Send Email Hook" to the new edge function URL and paste the same secret. This is the step that actually replaces Supabase's built-in email sending with our Resend pipeline. (Done from the Cloud → Users → Auth Settings area — exact toggle path called out after deploy.)

### 5. Clean up the old wiring
- `ForgotPassword.tsx` keeps using `supabase.auth.resetPasswordForEmail(...)` (already done) — once the hook is live, that call automatically goes through Resend too.
- Keep `auth-email-sender` deleted/retired (the hook supersedes it). I'll delete the function to avoid two code paths.

### 6. Verify
- Re-trigger Marlene Smith's signup confirmation from `/auth` (resend confirmation).
- Watch `auth-email-hook` logs → expect 200 + Resend `id` in response.
- Confirm email arrives from `no-reply@holarchealth.com`.

## Technical notes
- Default `From` stays `Holarc Health <no-reply@holarchealth.com>` (already set in `_shared/email.ts`).
- Hook payload uses the `standard-webhooks` HMAC scheme; verification is ~15 lines using `npm:standardwebhooks`.
- No DB changes, no RLS changes, no front-end changes beyond what's already shipped.
- After the hook is wired, **every** auth email Supabase generates (including ones triggered by `signUp`, `resetPasswordForEmail`, `signInWithOtp`, `updateUser({email})`) flows through Resend automatically — no per-call invocation needed.

## Order of operations
1. Toggle Lovable Emails off.
2. Request `SEND_EMAIL_HOOK_SECRET`.
3. Write + deploy `auth-email-hook`, delete `auth-email-sender`.
4. Configure the Supabase Send Email Hook (URL + secret).
5. Resend Marlene's confirmation to verify end-to-end.