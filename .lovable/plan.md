# Anti-cloning + IP protection plan

You picked: **Audit edge functions + Supabase linter**, **Hide the Lovable badge**, **Legal + copyright pack** (no PDF watermarks).

The honest framing still applies: this work won't stop someone from rebuilding your UI from screenshots — nothing can. What it *does* do is (1) lock down the only IP that actually matters (server-side data and logic), (2) remove the obvious "built on Lovable" tell, and (3) give you legal teeth so you can act if a clone shows up using your name, copy, or scraped data.

---

## Part 1 — Edge function security audit

I scanned all 29 edge functions. Findings:

**Functions missing JWT validation (need review):**

```text
google-places-autocomplete  - public proxy, may need auth gating
parse-patient-import        - handles patient PII, must require auth
translate-text              - currently public, should require auth
```

**Functions that are intentionally unauthenticated (correct, no change):**

```text
receive-email-document      - inbound email webhook (signature-based)
reconcile-adherence-monthly - cron job (service-role only)
remind-audio-retention      - cron job (service-role only)
send-invoice-report         - cron job (service-role only)
```

**Steps:**

1. Open each of the 3 flagged functions, add the standard `getClaims()` block from your existing pattern (already used in `analyze-medical-image`, `lookup-medical-codes`, etc.).
2. For each function, add Zod-style input validation on `req.json()` body to reject malformed payloads with 400 before doing any work.
3. Run `supabase--linter` to catch RLS gaps, missing policies, and other DB-level misconfigurations. Fix anything flagged at error/warn severity via migration.
4. Verify `LOVABLE_API_KEY`, `OPENAI_API_KEY`, `RESEND_API_KEY`, `PAYPAL_CLIENT_SECRET`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_MAPS_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY` are never referenced from `src/` (they shouldn't be — confirming).

This is the highest-value work in the plan. A single missing RLS policy leaks more than a fully obfuscated bundle ever could protect.

---

## Part 2 — Hide the Lovable badge

One toggle via `set_badge_visibility(hide_badge: true)`. Removes the "Edit with Lovable" badge from `holarchealth.com` and `medpad.lovable.app` so a copycat can't trivially identify the build tool from your published site. Requires Pro plan (you'll be prompted if not on it).

---

## Part 3 — Legal + copyright pack

Current state: footer already shows `© {year} Holarc Health. All rights reserved.` and links to `/terms-and-conditions`. Good baseline.

What to add:

**A. Strengthen `src/pages/TermsAndConditions.tsx`** — append an "Intellectual Property & Anti-Cloning" section covering:
- All UI, code, copy, workflows, terminology ("Holarchive", "Round Table", "Vula"), and design are owned by Holarc Health (Pty) Ltd.
- Prohibited: reverse engineering, decompilation, scraping, automated access, creating derivative works, building competing products from observation of the service, using screenshots or recordings to recreate the UI.
- Account termination + liability for damages on breach.
- Trademark notice for "Holarc Health" and the logo.
- Governing law: South Africa (adjust if needed).

**B. New page `src/pages/IntellectualProperty.tsx`** — a dedicated, link-shareable IP notice you can point a cease-and-desist at. Listed in footer next to T&C.

**C. `index.html` meta hardening:**
```html
<meta name="copyright" content="© 2026 Holarc Health (Pty) Ltd. All rights reserved." />
<meta name="rights" content="All rights reserved. Reverse engineering and unauthorized reproduction prohibited." />
```

**D. Footer update** — add the new IP link beside Terms & Conditions, keep the existing copyright line.

**E. Console notice** (Facebook/PayPal style, one-time per session) on app boot:
```text
⚠ Stop!
This is a private application owned by Holarc Health (Pty) Ltd.
Unauthorized access, scraping, reverse engineering, or attempts to
copy this service are prohibited and may result in legal action.
See holarchealth.com/intellectual-property
```
Single `console.warn` on mount of `App.tsx`. Zero UX impact, zero false security, but it's the standard "we are watching and we have lawyers" signal.

**Not doing:**
- ❌ PDF watermarks (you said no).
- ❌ Right-click / DevTools / shortcut blocking (breaks accessibility, doesn't deter).
- ❌ Heavy obfuscation (5–20× bundle size, useless).
- ❌ Rate limiting (Lovable platform doesn't support it yet).

---

## Files to touch

```text
supabase/functions/google-places-autocomplete/index.ts   (add auth)
supabase/functions/parse-patient-import/index.ts         (add auth)
supabase/functions/translate-text/index.ts               (add auth)
+ any migrations the Supabase linter requires
src/pages/TermsAndConditions.tsx                         (extend)
src/pages/IntellectualProperty.tsx                       (new)
src/components/layout/Footer.tsx                         (add IP link)
src/App.tsx                                              (route + console notice)
index.html                                               (meta tags)
[platform action] hide Lovable badge
```

## What this protects, honestly

| Threat | Protected? |
|---|---|
| Visual UI cloning by AI / dev shop | No (impossible) |
| Use of your name, logo, distinctive terms | Yes (legal) |
| Scraping your data via your APIs | Yes (auth audit + RLS) |
| Stealing your AI prompts / business logic | Yes (already server-side, audit confirms) |
| Someone publishing a clone on AppStore | Improved (DMCA + trademark grounds) |
| Identifying you built on Lovable | Yes (badge hidden) |

Reply approve to execute, or tell me what to change.