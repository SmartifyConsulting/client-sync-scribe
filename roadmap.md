# Roadmap — Step 5 Indigro copy
- [x] Glossary + hide healthcare modules (nav, mobile nav, route guard)
- [x] Nav labels, en.json + uiTranslations (en) rewrite
- [x] Hardcoded copy on shared screens (86 files)
- [x] Onboarding tour + screen tips
- [x] Landing page + page head, install prompts
- [x] Invitation/password/document emails (sender name Indigro), redeployed
- [ ] Remaining ~40 backend functions' copy and AI prompts (not rewritten)
- [ ] Other 24 languages (English-first decision)
- [ ] Landing logo artwork / capability graphic (removed; need Indigro artwork)
- [ ] Legal pages (T&C, BAA, consent) — left as-is, need legal review

## Wealth roles & demo (Sep 2026)
- [x] Resend key saved (RESEND_API_KEY)
- [x] Sign-up "I am a..." limited to Client, Wealth Manager, FSP / Key Individual, Insurer
- [x] Pastel green badges/buttons swapped to brand blue
- [x] Demo users + data tracing Client → Wealth Manager → FSP → Insurer
- [x] "View as" switcher + pipeline / underwriting dashboard card
- [ ] Richer Indie-style client portfolio dashboard

## Holarc Wealth cleanup pass
- [x] Indigro → Holarc Wealth
- [x] Vula removal, greeting subtext, beta notice, grey pill, My Business, client tabs, Unknown WM, overview, Beneficiaries
- [x] My Business: remove Rewards/Referrals, Targets & Commission
- [x] 7 compliance forms (typed e-signature; Astute, screening and liveness integrations still pending external services)

## PayFast billing
- [x] PayFast keys saved, sandbox mode
- [x] Checkout, payment notifications, cancel; Billing tab in My Business
- [ ] Real plan prices (placeholder R499 Adviser / R1,999 Firm) — waiting on user
- [x] Compliance guardrails, FICA file storage, drawn signatures, commission entry
- [x] Plan change cancels old PayFast subscription
- [x] Client profile: Personal Information / Financial Information (FNA pillars), no header icons

## Client menu / consultation / dashboard pass
- [x] My Future menu for clients (My Cover, My Investments, Retirement, Claims, Documents); no My Business for clients
- [x] Client greeting uses real name
- [x] Consultation Mode wealth copy + Client Overview + Start Consultation
- [x] Pastel green icons → #9CC7DD
- [x] Remove Vula awarding
- [x] Hide My Clients from clients
- [x] Client dashboard: existing frames with Indie wealth data

## Partner systems (Marlin's login)
- [x] Favicon replaced with blue heart
- [x] Login details saved for Astute, XPLAN, Beeswax
- [ ] Astute sign-in — blocked: need the actual Astute portal login address (astutefse.com is the public site)
- [ ] XPLAN sync — blocked: XPLAN's data access needs an Iress "App ID" in addition to the login
- [ ] Beeswax — blocked: user to explain its role (beeswax.com is an advertising platform — confirm it's the right one)

## Oct 2026 — Claims, styles, firm profile, billing
- [x] Claims page (/claims): create, read and update; only Wealth Managers can change status (enforced in the database)
- [x] Shared style sheet (page-title, frame, tab-brand, data-table, empty-state); tab bars, page titles and hardcoded white/black swept
- [x] Style follow-up: text scale, card rounding, greens, readable tabs, phone layout of Live Workspace
- [ ] Remaining ~78 custom sizes in health-only/hidden screens; Wealth Manager screens not screenshot-checked (no WM test sign-in)
- [x] Wealth Manager logos (business + FSP) on documents and sign-up page
- [x] New Client button → Client ID, workflow, WhatsApp/email/copy link; /join sign-up lands on Live Workspace Step 1
- [x] Marlin Moodley firm profile (all Introduction Letter fields), About Me / Partners / Assistants / Hospital Affiliations / Signature / Voice hidden
- [x] Billing tab visible to System Admins only
- [ ] Real Disclosure Agreement wording (blocked: waiting on the firm)

## Workflow redesign (Oct 2026)
- [x] Same step names for everyone; Needs Analysis is Step 2, Portfolio is Step 3
- [x] Shared map + Live Workspace tray, pulse only on your own next action, chime + mute
- [x] Marlin has 6 clients linked (Georgia with 3 policies)
- [x] Astute sign-in verified (reaches CCP home)
- [ ] Astute data pull: BLOCKED — Marlin's Astute account has 0 clients, 0 requests, 0 results; needs one real client request (ID + consent, may be billed) to map result fields

## Live Workspace end-to-end (Oct 2026)
- [x] Step 1 collapses / current step expands
- [x] Step 2 "Schedule meeting" sub-step with booking link
- [x] Record meeting button → transcribe → auto-capture financials
- [x] Client sees simplified Steps 3–4
- [x] Working Window tools for Steps 5–6
- [x] All map steps expanded (design request)
- [ ] Step 4 Working Window tools (quotes, affordability)

## Live Workspace documents
- [x] Disclosure Agreement + LOA rows in LW: preview (eye), download, sign, auto-file to Documents
- [x] Document previews: FSP logo top-left, WM logo top-right

## Live Workspace layout v2
- [x] Map replaced by My Profile (Personal, Financial, Claims) on the left
- [x] All six steps listed; completed steps collapse and expand to show history
- [x] Bold legend with client and Wealth Manager first names
- [x] Overview + Life Events on dashboard; My Profile removed from menu
- [x] Date of birth fills from SA ID
- [ ] Copy Georgia's Astute policies to Georgia Demo (SQL script ready, not run)
