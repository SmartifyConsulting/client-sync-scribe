# Roadmap — Step 5 Indigro copy
## Inline client authorisation — Nov 8
- [x] Fix the live signed-document type constraint to accept debit_order and life_declaration alongside Disclosure/LOA; verify all four types and retain rejection of unsupported kinds.
- [x] Replace the Documents detour with banking details, premium review and two explicit client consents; normal declarations no longer show as a red blocker.
- [x] Deploy atomic sealed-document filing and workflow refresh, tied to accepted ROA and selected premiums; live broker signing rejected (403), service-only RPC grants verified, 11 isolated signing tests pass.
- [x] Authenticated Georgia Demo manager step checked on desktop/mobile with no runtime errors or horizontal overflow; preview build OK.
- [ ] Client form and successful signing/readback — requires the linked client's session and their own consent; no signatures or notifications created on their behalf. Isolated client-layout capture was unsuccessful.
## Record of Advice signing — Nov 7
- [x] Applied the live notification/reminder client-lookup fix; both functions now use public.clients and retain existing security settings. Verified both live definitions and four existing document-signing checks; preview build OK.
- [ ] Client signing and Step 6 readback — requires the client to retry signing; no signatures or client notifications created on their behalf during testing.
## Quote sourcing — Nov 4
- [x] Distinguish Companion, email desk and broker-entered indicative planning in Step 4; estimates stay in quote specs, never become insurer quote rows or unlock advice; prominent official-confirmation warning.
- [x] Nine isolated tests pass; authenticated Georgia Demo desktop/mobile method switching and estimate save/reload verified; original demo value restored, no client/insurer communications. Live insurer calculations remain unverified.
## Supplied Phase 2 manuals - Nov 3
- [x] Reconcile all 20 manual pages and screenshots with the existing Companion adapters; source-to-state runbook in docs/automation/quote-manual-runbook.md.
- [x] Add the demonstrated BrightRock New cover proposal and Momentum post-report Download labels plus BrightRock Finish - See the cover; required radio/benefit-toggle validation; preserve stops for unknown providers, duplicate actions and missing inputs.
- [x] Package Companion 1.6.2; 45 isolated regressions and simulated browser checks pass for documented navigation, approved field/toggle entry, required-data stops and report export.
- [ ] Complete live portal control maps, required case/policy/role-player/occupation inputs, quote/report integrity review and BrightRock export mapping. Bidvest quote screens and other provider walkthroughs are not supplied.

## Documented insurer journeys — Nov 3
- [x] Add bounded Momentum navigation/report and BrightRock new/copy scenario adapters from supplied PDFs; pause for missing approved data and unmapped controls. Partial adapters, not live-verified end-to-end automation.
- [x] Send actual available client/rating and insurer-specific options; keep premium and benefit increases separate. Missing dates, role players, occupation-result selections, and underwriting inputs stop for broker review, not defaults.
- [x] Associate saved PDFs with exact numbered scenarios and keep portals open until all scenario saves finish; Companion v1.6.0 packaged. 45 isolated checks pass plus simulated browser navigation/input/copy/required-data stops; preview build OK.
- [ ] Broker-run live verification — requires updated Companion, approved portal URLs and legitimate verification; Bidvest quote screens and other insurer journeys not supplied. No fabricated quotes or real-client communications.
## Recording compatibility — Nov 3
- [x] Deployed clientId/patientId-compatible transcription and financial extraction; UI sends both identifiers. Ten isolated processing regressions pass (14 including signing regressions).
- [ ] Confirm a real recorded meeting and financial readback with Georgia only — requires an authenticated Wealth Manager session.
## Jean document signing — Nov 2
- [x] Deployed sign-wealth-document using clients; live wealth_onboarding_refresh already uses clients and preserves all four completion requirements.
- [x] Four isolated regression checks pass: LOA and Disclosure seal/file/refresh, plus unlinked and wrong-account rejection (Vitest 2.1.9 for Vite 5 compatibility).
- [ ] Jean's own signing/readback — requires Jean to sign; no signature created or messages sent on her behalf.
## Preview repair — Oct 27
- [x] Align remaining shared types, roles and client joins with the current generated schema; restore missing admissions hook; verify preview (build OK, signed-in dashboard without runtime errors, gold AI Summary heading).
## Numbered scenario submission — Oct 22
- [x] Quote 1-3 (Options A-C) tracked per insurer with own status, 90s stall warning and per-quote Retry; saved quotes never resent
- [x] Companion v1.5.0 enters each option into the connected portal by field label and clicks Quote/Calculate; insurers run in parallel tabs
- [ ] Validate label matching on live Discovery/Momentum quote screens — requires broker-installed Companion and broker login

## Live quote activity — Oct 21
- [x] Add insurer-coloured activity ring, actual stage commentary and 30-second waiting warning with Retry
- [x] Show actual workflow quote-PDF count; await document count refresh after successful save; no promised nine-document total
- [x] Test Companion progress and authenticated Georgia Demo UI with simulated activity, OTP, waiting and failure; 22 isolated tests pass; Companion v1.4.0 packaged
- [ ] Live quote generation remains blocked: partial documented Momentum/BrightRock adapters added Nov 3, but live multi-step fields/report integrity are unverified; broker-installed Companion and legitimate insurer verification required.

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

## Oct 2026 — Personal touches, nav, calendar
- [x] Rename Step 2 meeting step to Schedule "Review Financial Health" meeting
- [x] Wealth Manager can create, edit and delete calendar appointments
- [x] Use the Wealth Manager's name instead of "Your Wealth Manager"
- [x] Documents grouped by Type by default; Type chip before Date
- [x] Client menu: Live Workspace under My Dashboard; Personal Info, Financial Info, Claims, Documents; no My Profile

## Messenger / ROA negotiation / Annual review (Oct 2026)
- [x] Messenger on nav (client + WM), audited, append-only, realtime, notifications
- [x] ROA change conversation (request ⇄ counter ⇄ agree) then WM redraft
- [x] Step 6 auto-schedules annual review 12 months after issue; Step 7 Annual Review
- [x] Calendar + notifications back in top bar; Documents nav count removed
- [x] Clients can read their WM's name (no more "Your Wealth Manager")
- [x] Option A/B quoting selector, per-step output cards (Steps 3–4), legend tick colours

## Step 4 quotes (Oct 2026)
- [x] Amounts shown as R 1 000 000.00
- [x] Saved insurer logins used directly (no App Integrations visit)
- [x] Insurer tabs with products quoted in each
- [x] Compact frames, fields and fonts
- [x] Insurers chosen first; they set the tabs
- [x] Products pre-filled from needs analysis, 3 options each
- [x] In-app OTP box per insurer tab (handed to broker helper)
- [ ] Live insurer portal automation (Momentum first) — needs the real portal address; portals need broker 2FA

## Step 4 polish (Oct 2026)
- [x] Existing cover summary on the client page
- [x] Insurer tabs as real tabs in legend colours, no counts, login progress ring
- [x] PIN / email verification pops up as a window (no inline box)
- [x] Black product headers, white text; removed "requests quotes from six insurers" line
- [x] Browser add-on login/challenge and same-origin PDF capture implemented; live insurer validation tracked below

## Step 4 quotes — Oct 2026
- [x] Existing cover prominent with insurer per policy; Since/Last seen under email
- [x] Insurer tabs in solid legend colours; aligned product table columns
- [x] Quote-request email on each insurer's App Integrations card
- [x] Insurer option dictionary (from public product guides) shown per insurer tab
- [ ] Confirm dictionary against live insurer quote screens — blocked: needs broker login + PIN
- [x] Browser add-on for insurer login / PDF capture implemented; live portal validation tracked below
- [ ] Send quote requests by email to the saved address

## Insurer login add-on (Oct 2026)
- [x] Browser add-on: opens portal, fills saved login, relays PIN/email prompt to Holarc
- [ ] Test against each live portal — Momentum/Bidvest addresses invalid; selectors unverified
- [x] Capture quote PDF into Working Window + Documents; verified with Georgia Demo upload

## Holarc Wealth Companion — agreed Oct 20 updates
- [x] Editable per-broker insurer portal URLs
- [x] Restore insurer legend colours, retain orange ordinary badges
- [x] 15-minute Password Protector unlock and expiry tests
- [x] One-time Companion setup and open-portal / PDF-upload fallback
- [x] Automatic quote PDF attachment via Companion for same-origin portal downloads; other sources use upload
- [x] Verify UI and attachment pipeline with Georgia Demo, including duplicate readback and Working Window PDF preview
- [ ] Real insurer login / quote-form / download validation — requires broker-installed Companion, correct portal URL and broker verification; no external insurer requests made

## Discovery and Momentum walkthrough — Oct 21
- [ ] Install Companion in the broker's browser — requires the broker's local installation approval
- [ ] Save verified Discovery and Momentum URLs per broker — requires Password Protector unlock
- [ ] Validate login, quote form and PDF capture with Georgia only — requires broker verification; no quote submissions without confirmation

## Companion discovery — Oct 21
- [x] Obvious setup button and live installation status at the top of App Integrations, including the locked screen
- [x] Reuse the one-time setup dialog and Companion download

## Companion background portals — Oct 21
- [x] Keep login and OTP portal tabs inactive
- [x] Allow HTTPS Discovery Partner redirects within discovery.co.za only
- [x] Close managed portal tabs only after successful PDF-save acknowledgement
- [x] Test routing, background behaviour and capture acknowledgement; rebuild download (11 isolated tests; no real insurer requests)
- [ ] Live Discovery quote walkthrough — blocked: broker-installed updated Companion and broker verification required

## Discovery field verification — Oct 21
- [x] Add read-only quote-screen scan and compact results in Step 4; never collect field values or credentials
- [x] Test scan privacy, routing and empty/login-screen handling; rebuild Companion v1.3.0 (18 tests pass; authenticated Georgia Demo UI checked with simulated scan, not a live Discovery session)
- [ ] Validate Discovery's actual quote fields — requires broker-installed updated Companion and legitimate portal verification; no live quote submission

## Hidden portals + auto-connect, all insurers — Oct 21
- [x] Every insurer opens in a minimised background window (Companion v1.5.1)
- [x] Auto-connect the visible insurer tab when the 15-minute unlock is active
- [x] Always-visible status ring per insurer (setup / unlock / connecting / connected)
- [ ] Live check in broker browser — requires reinstalling Companion v1.5.1

## FICA as a normal step — Nov 8
- [x] Upload proof of address and bank letter inside the step (no Documents detour); upload ticks the step
- [x] No red "On hold" for normal FICA items; signed Disclosure+LOA count as mandate, Didit KYC counts as ID

## Dashboard, quote progress, referrers — Nov 9
- [x] Remove dashboard To-Do list; Live Workspace rows show the actual waiting task
- [x] Two-card quote progress: connected tick, insurer-coloured bar, product letter ticks (L/D/I/C/H), non-blocking "OTP waiting"; insurers run side by side
- [x] Referrers: invited referrers with telephone, Pending sign-up status, add/edit/resend/delete

## Dashboard, footer, Marvin, standard variables — Nov 9
- [x] Footer reads Elysian Digital (Pty) Ltd
- [x] Briefing 2/3 and Upcoming 1/3 of Live Workspaces height; Pipeline + Earnings on next row
- [x] Seed Marvin Madly test financials so Benefit Amounts fill in
- [x] Per-insurer required variable list mapped to one standard Elysian name (spreadsheet)
- [ ] Rename the app’s internal field keys to the agreed Elysian names — awaiting user approval of the list
## Consultation & transcript — Nov 9
- [x] Transcript PDF with header, footer, bold Wealth Manager / regular client dialogue
- [x] Compact question dropdowns; meeting tab with questions on the right; financial profile in its own tab
- [x] Consultation button at any step; each capture records a summary of changes on the consultation
- [ ] Live recording + change summary readback with Georgia Demo — needs a signed-in Wealth Manager meeting
