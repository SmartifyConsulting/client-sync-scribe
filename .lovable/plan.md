## 1. Set passwords to `Password123` for 5 accounts

Create a one-shot admin edge function `admin-set-test-passwords` that, when invoked by an admin, calls `auth.admin.updateUserById` for each:

| Display | Email |
|---|---|
| Paraskevi Soldatos | `paraskevoulasoldatos@gmail.com` |
| Zano | `zano@smartify.co.za` |
| Xtina | `xtina@smartify.co.za` |
| Renken | `renken@smartify.co.za` |
| Nonastasia | `nonastasia@gmail.com` |

For any email that has no auth user yet (likely `nonastasia@gmail.com`), the function will `createUser` first with `email_confirm: true, password: 'Password123'`, then proceed.

I'll invoke the function once from my side after deploy and report which were updated vs created. The function stays in the project so you can rerun it later.

> Note: `Password123` fails Have-I-Been-Pwned checks. If HIBP is enabled on your project the update will be rejected — I'll temporarily disable it for the run and re-enable it after, or leave it off if you prefer (let me know).

## 2. Brand auth emails on `notify.holarchealth.com`

**Step 1 — Open the email setup dialog.** You'll click "Set up email domain", enter `notify.holarchealth.com`, and Lovable provisions DNS, DKIM/SPF, and the `auth-email-hook` automatically.

```
<presentation-actions>
<presentation-open-email-setup>Set up email domain</presentation-open-email-setup>
</presentation-actions>
```

**Step 2 — Once the dialog closes, I scaffold + brand the templates.**
- Run `scaffold_auth_email_templates` → creates 6 React Email templates (signup, magic-link, recovery, invite, email-change, reauthentication).
- Apply Holarc Health brand: **#E01837 red** primary, teal accents, white body bg, your logo from `public/` or `src/assets/`, and the friendly tone used elsewhere in the app.
- Sender: `Holarc Health <no-reply@notify.holarchealth.com>`.
- Deploy `auth-email-hook`.

**Step 3 — Activation.** Auth emails route through the hook the moment DNS verification finishes (Lovable polls automatically — no work from you). Until then, default Lovable templates continue to send so signups never break. You can monitor in Cloud → Emails.

## DNS prerequisite — important

Adding `notify.holarchealth.com` delegates **only that subdomain** to Lovable's nameservers (`ns3.lovable.cloud`, `ns4.lovable.cloud`). It does not affect:
- Root `holarchealth.com` (your website on `www.holarchealth.com` is untouched).
- Any Mailgun domain (e.g. `mg.holarchealth.com` or root) — they keep working in parallel.

If your Mailgun is currently set up on `notify.holarchealth.com` specifically, tell me first and we'll pick a different subdomain (e.g. `mail.holarchealth.com`).

## Files / changes

- **new** `supabase/functions/admin-set-test-passwords/index.ts` — admin-only batch password setter (with auto-create fallback).
- **scaffolded** `supabase/functions/auth-email-hook/index.ts` + `supabase/functions/_shared/email-templates/*.tsx` — branded with Holarc Health palette and logo.

## What I need from you to start

1. Confirm I should temporarily turn HIBP off so `Password123` can be set (I'll re-enable it after if you say so).
2. Confirm `notify.holarchealth.com` is OK as the email subdomain (or pick a different one).
