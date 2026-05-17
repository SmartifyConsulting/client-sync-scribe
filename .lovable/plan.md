## Switch auth + transactional emails to Resend

Replace the Mailgun-based email pipeline with Resend, using a Resend API key stored as a secret.

### 1. Secrets
- Add `RESEND_API_KEY` (user provides from resend.com/api-keys)
- Remove `MAILGUN_API_KEY`, `MAILGUN_REGION`, `MAILGUN_CONNECTION_KEY`, `SEND_EMAIL_HOOK_SECRET` (no longer needed)

### 2. Shared sender module
- Replace `supabase/functions/_shared/mailgun.ts` with `supabase/functions/_shared/resend.ts` exporting `sendEmail({ to, subject, html, from?, replyTo? })`
- Default `from`: `Holarc Health <no-reply@holarchealth.com>` (Resend-verified domain)
- Calls `https://api.resend.com/emails` directly with `Authorization: Bearer ${RESEND_API_KEY}`
- Keep the same return shape (`{ ok, data?, error? }`) so callers don't change

### 3. Update existing transactional functions
Swap `sendMailgunEmail` → `sendEmail` in:
- `send-document-email`
- `send-invoice-report`
- `submit-insurance-claim`
- any other function importing `_shared/mailgun.ts` (grep first)

### 4. Auth emails (password reset, signup, magic link)
Replace the abandoned `auth-email-mailgun` approach with an **app-layer Resend flow** (since Lovable Cloud doesn't expose the Supabase Send Email Hook UI):
- Delete `supabase/functions/auth-email-mailgun/`
- Create `supabase/functions/send-password-reset/index.ts`: takes `{ email }`, calls `supabase.auth.admin.generateLink({ type: 'recovery' })`, sends a branded reset email via Resend pointing to `https://holarchealth.com/reset-password#...`
- Update `src/pages/ForgotPassword.tsx` to invoke `send-password-reset` instead of `supabase.auth.resetPasswordForEmail`
- Disable Supabase's built-in auth emails for signup/recovery in `supabase/config.toml` (or accept that default Supabase templates remain as fallback)

### 5. Domain prerequisite
User must verify `holarchealth.com` (or a subdomain like `mail.holarchealth.com`) in Resend dashboard before sending. I'll prompt for which sender domain to use.

### 6. Cleanup
- Delete `supabase/functions/_shared/mailgun.ts`
- Delete `supabase/functions/auth-email-mailgun/`
- Remove related entries from `supabase/config.toml`

### Out of scope
- Signup confirmation / email-change / magic-link custom templates (only password reset for now; can add later)
- Lovable Emails managed flow (`notify.nigeria.holarchealth.com`) — left alone

### Questions before I build
1. **Which sender domain** is verified (or will be verified) in Resend? `holarchealth.com`, `mail.holarchealth.com`, or other?
2. **Auth emails scope**: just password reset, or also signup confirmation + magic link via custom Resend functions?
