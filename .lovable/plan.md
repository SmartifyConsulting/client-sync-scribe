## Brand your auth emails (no-reply@notify.holarchealth.com)

Right now you can't brand them — the `no-reply@holarchealth.com` emails are Lovable's default templates. I'll set up the pieces so you can.

### What I'll do

1. **Set up email domain** — `notify.holarchealth.com`. You'll get a one-click DNS setup dialog; the subdomain keeps your main `holarchealth.com` mail untouched.
2. **Provision email infrastructure** — queue, send log, suppression list, unsubscribe handling. One-time backend setup.
3. **Scaffold 6 branded auth email templates** at `supabase/functions/_shared/email-templates/`:
   - `signup.tsx` — confirm signup
   - `recovery.tsx` — password reset
   - `magic-link.tsx` — magic link sign-in
   - `invite.tsx` — invitations
   - `email-change.tsx` — email change confirmation
   - `reauthentication.tsx` — reauth OTP
4. **Apply Holarc Health branding** to each template:
   - Pull palette from `src/index.css` (teal primary, red accents, foreground/background tokens)
   - Pull typography from your Tailwind config
   - Embed your existing logo (from `public/` or `src/assets/`) in the header
   - Match button radius and spacing to the app
   - Adapt copy tone to the app's voice (e.g. "Welcome to Holarc Health" rather than generic "Verify Email")
5. **Deploy** `auth-email-hook` so the templates go live as soon as DNS verifies.

### Where you'll edit branding afterwards

After scaffolding, the answer to your question becomes:

```text
supabase/functions/_shared/email-templates/
├── signup.tsx            ← edit subject, copy, colors, logo
├── recovery.tsx
├── magic-link.tsx
├── invite.tsx
├── email-change.tsx
└── reauthentication.tsx
```

Each `.tsx` is a React Email component with inline styles. Change a hex, swap copy, move the logo — redeploy `auth-email-hook` and the next email reflects the change. You'll be able to preview each template directly from Cloud → Emails.

### What I need from you

Nothing more — once you approve this plan I'll run setup, scaffold + brand the templates, and deploy. You'll just complete the DNS step in the popup that appears (one-click for most registrars). Auth emails activate automatically once DNS verifies (usually minutes, up to 72 hours worst case). Until then default Lovable emails keep working so nobody is locked out.

### Out of scope

- Transactional/app emails (booking confirmations, contact form replies, etc.) — separate setup, ask me afterwards if you want it.
- Marketing/newsletter sends — not supported by Lovable's email system.
