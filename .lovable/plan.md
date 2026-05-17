## Why the previous approach is stuck
Lovable Cloud's Auth UI doesn't surface the Supabase "Send Email Hook" secret — so we can't wire a custom hook endpoint from the dashboard. Our standalone `auth-email-mailgun` function works in tests but Supabase Auth has no way to reach it.

## New approach: piggyback on Lovable's managed `auth-email-hook`
Lovable has built-in plumbing for auth email hooks: scaffolding `auth-email-hook` automatically registers it with Supabase Auth and provisions the signing secret behind the scenes. We'll:

1. Run the Lovable scaffold to create `auth-email-hook` (and templates) and let Lovable wire the hook + secret automatically.
2. **Replace the body of `auth-email-hook/index.ts`** so instead of calling Lovable's Email API, it renders the email and sends it via the **Mailgun connector gateway** (`https://connector-gateway.lovable.dev/mailgun/mg.holarchealth.com/messages`) using `LOVABLE_API_KEY` + `MAILGUN_API_KEY`.
3. Keep signature verification using `@lovable.dev/webhooks-js` (already handled by the scaffold template) — no manual secret needed.
4. Deploy `auth-email-hook`.
5. Delete the now-unused `auth-email-mailgun` function and remove `SEND_EMAIL_HOOK_SECRET` / `MAILGUN_REGION` secrets (no longer needed; Mailgun routing is via the connector gateway).
6. Test by triggering a password reset from `/auth` → email arrives from `no-reply@mg.holarchealth.com`.

## Files
- **Scaffold (auto-created):** `supabase/functions/auth-email-hook/index.ts`, `supabase/functions/auth-email-hook/deno.json`, `supabase/functions/_shared/email-templates/*.tsx`
- **Edit:** `supabase/functions/auth-email-hook/index.ts` — replace the Lovable Email API call with a Mailgun gateway POST
- **Edit:** `supabase/config.toml` — remove the `[functions.auth-email-mailgun]` block
- **Delete:** `supabase/functions/auth-email-mailgun/` (entire folder)

## What stays the same
- Mailgun connector is already linked (`MAILGUN_API_KEY` populated by the connector).
- `mg.holarchealth.com` is verified in your Mailgun account; SPF record is already in DNS.
- The branded HTML template (HolarcHealth teal, button, fallback link) — we'll keep the same look but render via simple inline HTML inside the hook (skipping React Email to keep it simple).

## Out of scope
- Lovable Emails / `notify.nigeria.holarchealth.com` (left alone).
- Transactional/app emails (only auth emails).

## Risk
If Lovable's managed hook setup later overwrites `auth-email-hook/index.ts` on re-scaffold, our Mailgun customization would be lost. Mitigation: only re-scaffold with `confirm_overwrite=true` when intentional.
