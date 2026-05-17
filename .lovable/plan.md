# Auth emails via ZeptoMail — bypass Lovable entirely

## The core problem
Lovable Cloud doesn't expose Supabase's SMTP settings UI, and the auth email hook needs a `SEND_EMAIL_HOOK_SECRET` you can't easily see. Both paths have wasted credits. We'll avoid both.

## The solution
Stop using Supabase's built-in auth emails. Instead, intercept the two auth flows that actually send mail (password reset + signup confirmation) on the **frontend**, generate the link **server-side** using the Supabase Admin API in an edge function, and send the email through **ZeptoMail** ourselves. No hook, no hook secret, no SMTP config.

## What changes

### 1. New edge function: `auth-email-sender`
- Accepts `{ type: "recovery" | "signup" | "email_change", email, redirectTo? }`
- Uses `supabase.auth.admin.generateLink({ type, email, options: { redirectTo } })` with the service role key to mint the action link
- Renders a branded HTML email (Holarc Health styling) for that type
- Sends via `sendEmail()` from `_shared/email.ts` (already ZeptoMail)
- Returns `{ ok: true }` on success
- `verify_jwt = false` so it's callable from unauthenticated screens (Forgot Password)

### 2. Frontend swap (3 call sites)
- `src/pages/ForgotPassword.tsx` — replace `supabase.auth.resetPasswordForEmail(...)` with `supabase.functions.invoke('auth-email-sender', { body: { type: 'recovery', email, redirectTo: \`\${origin}/reset-password\` } })`
- `src/pages/Auth.tsx` (signup flow) — after `supabase.auth.signUp(...)`, if email confirmation is required, invoke `auth-email-sender` with `type: 'signup'`. If auto-confirm is on, skip.
- Anywhere `supabase.auth.updateUser({ email })` is called (email change) — follow up with `type: 'email_change'`

### 3. Disable Supabase's default auth emails
In Cloud → Auth settings:
- Keep email confirmations **on** if you want verified signups (the function handles it), or turn **auto-confirm on** to skip entirely
- The default Supabase sender will still try to fire for any flow we didn't intercept — but since we're calling `generateLink` (admin API) instead of the user-facing `resetPasswordForEmail`/`signUp` for emails, Supabase doesn't send its own copy

### 4. Email templates (inline in the edge function)
Three minimal branded HTML templates — Recovery, Confirm Signup, Confirm Email Change — using the Holarc Health red `#E01837` and teal accents, with the action link as a clear CTA button.

## What you don't have to do
- No SMTP config anywhere
- No `SEND_EMAIL_HOOK_SECRET`
- No domain verification on Lovable's side (only on ZeptoMail, which you're already doing)
- No `auth-email-hook` function (still deleted)

## Files touched
- **New:** `supabase/functions/auth-email-sender/index.ts`
- **Edit:** `src/pages/ForgotPassword.tsx`
- **Edit:** `src/pages/Auth.tsx`
- **Edit:** `supabase/config.toml` (add `[functions.auth-email-sender] verify_jwt = false`)

## Caveats
- This covers password reset + signup + email change. Magic links and OTP aren't currently used in the app (confirmed by codebase) — if added later, same pattern applies.
- 2FA codes (if you ever enable) still go via Supabase's SMS/email pipeline and would need separate handling.
- The Supabase default "reset password" template will no longer fire because we never call `resetPasswordForEmail`. Same for signup confirmation.

Approve and I'll implement.
