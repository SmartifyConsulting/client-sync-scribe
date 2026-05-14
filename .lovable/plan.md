# Connect Supabase Auth → Mailgun (API)

The `auth-email-hook` edge function already exists and calls Mailgun via the connector API (no SMTP). It just needs the shared webhook secret so it can verify that incoming requests are really from Supabase Auth.

## Steps

1. **Generate the hook secret in Supabase**
   - Open Cloud → Users → Auth Settings → "Send Email Hook"
   - Enable it, point the URL at the deployed `auth-email-hook` function
   - Copy the generated value — it looks like `v1,whsec_xxxxxxxx...`

2. **Store the secret in Lovable**
   - I'll prompt you for `SEND_EMAIL_HOOK_SECRET` using the secrets tool
   - You paste the `v1,whsec_...` value from step 1
   - The hook already strips the `v1,whsec_` prefix before verifying, so paste it as-is

3. **Verify Mailgun domain**
   - Confirm `holarchealth.com` (or whichever sending domain matches the `FROM` in the hook: `noreply@holarchealth.com`) is **verified** in your Mailgun dashboard
   - If it's only the sandbox domain, Mailgun will reject sends to non-authorized recipients

4. **Redeploy `auth-email-hook`** so it picks up the new secret env var

5. **Test** — trigger a password reset from `/forgot-password`; check:
   - Edge function logs for `auth-email-hook: sending recovery to ...`
   - Mailgun logs for the delivered message
   - Inbox

## What stays the same

- `supabase/functions/auth-email-hook/index.ts` — no code changes needed
- `supabase/functions/_shared/mailgun.ts` — already API-based via the Mailgun connector
- All transactional functions (`send-patient-invitation`, `send-document-email`, etc.) keep using the same Mailgun helper

## What you'll need handy

- The `v1,whsec_...` value from Supabase Auth → Send Email Hook
- Confirmation that `holarchealth.com` is verified in Mailgun
