# Plan: Rename moola → vula + Vula-brand the 6Dot50 launch

## Part A — Rename moola → vula everywhere

### Database migration (single migration, ALTERs only — preserves data)

**Tables renamed:**
- `moola_partner_apps` → `vula_partner_apps`
- `moola_transfers` → `vula_transfers`
- `moola_adherence_configs` → `vula_adherence_configs`

**Columns renamed (where they exist):**
- `doctor_rewards.moolas_count` → `vulas_count`
- `*.moolas_awarded` → `vulas_awarded`
- `*.moolas_reward` → `vulas_reward`

RLS policies, indexes, triggers, FKs and constraint names that embed `moola` are renamed in the same migration. After it runs, `src/integrations/supabase/types.ts` regenerates automatically.

### Code rename (mechanical, ~17 files)

- All identifiers: `moola*` → `vula*`, `Moola*` → `Vula*`, `MOOLA*` → `VULA*`
- All UI strings: "Moola"/"Moolas" → "Vula"/"Vulas"
- Edge function directory: `supabase/functions/sync-moola-partner-apps/` → `sync-vula-partner-apps/`, plus `supabase/config.toml` and any `functions.invoke()` callers
- Secrets renamed: `MOOLA_PARTNER_API_KEY` → `VULA_PARTNER_API_KEY`, `MOOLA_PARTNER_API_URL` → `VULA_PARTNER_API_URL` (you'll need to re-add the secret values once)
- README updates in `src/features/README.md` and `src/features/rewards/README.md`

**Files touched:** `GamificationAdmin.tsx`, `EmoticonSender.tsx`, `ActivityProofCapture.tsx`, `PrescriptionEditor.tsx`, `StarRatingDialog.tsx`, `useSessions.ts`, `Dashboard.tsx`, `TodoList.tsx`, `DoctorRewards.tsx`, `MyRewards.tsx`, `PatientDashboard.tsx`, `PatientTasks.tsx`, `paypal-subscription/index.ts`, `summarize-session/index.ts`, `sync-moola-partner-apps/index.ts` (renamed), 2× README, 1 migration.

---

## Part B — Present 6Dot50 as "Vula" (no login bypass)

You want the partner portal to **feel like Vula** while the actual login still happens on `secure.6dot50.com` / `portal.6dot50.com`. We do NOT touch their login form, credentials, or session — we just wrap the launch in Vula branding.

### Honest capability check (so the demo story is accurate)

`secure.6dot50.com/lite` ships:
```
X-Frame-Options: SAMEORIGIN
Content-Security-Policy: frame-ancestors *.6dot50.com;
```

That means:
- ❌ We **cannot** iframe their page inside Holarc (browser blocks it)
- ❌ We **cannot** inject CSS/JS into their page (cross-origin policy)
- ❌ We **cannot** hide their logo on their domain
- ✅ We **can** brand everything *up to and around* the handoff
- ✅ We **can** open their site in a fresh, chromeless tab so the user lands on it after seeing only Vula branding

### What we'll build

**1. `VulaPortalLaunch.tsx` — full-page branded interstitial** at route `/vula/portal`:

```
┌──────────────────────────────────────┐
│  [Vula symbol]                       │
│                                      │
│        Vula Wallet                   │
│        Powered by 6Dot50             │
│                                      │
│  Sign in to redeem your Vulas at     │
│  participating retailers.            │
│                                      │
│  [ Continue to secure sign-in → ]    │
│                                      │
│  🔒 You'll be taken to our partner's │
│     secure login page.               │
└──────────────────────────────────────┘
```

- Uses Vula symbol (`@/assets/vula-symbol.png`) and teal primary tokens
- Single CTA opens `https://portal.6dot50.com/` in `target="_blank"` (mobile: same tab is fine, controlled by a viewport check)
- Discrete "Powered by 6Dot50" line keeps it legally honest
- The 6Dot50 login itself is unchanged — your credentials, their session, their security

**2. Replace existing direct 6Dot50 buttons** in `DoctorRewards.tsx` and `MyRewards.tsx`:
- "Redeem from 6Dot50 with Vula Vouchers" → "Open Vula Wallet"
- Buttons now route to `/vula/portal` instead of opening `portal.6dot50.com` directly
- Card copy reworded to lead with "Vula"; 6Dot50 demoted to small partner credit
- Toast/copy on the partner-sync button: "Sync Vula retailers" (back-end still calls 6dot50)

**3. Route + nav**
- Add `/vula/portal` route in `src/App.tsx`
- No new nav item — entry stays via the Redeem section in the existing rewards pages

### What we are deliberately NOT doing

- Not proxying or rehosting 6Dot50 (would handle credentials = liability + ToS violation)
- Not skinning their actual login form (impossible without their cooperation)
- Not removing 6Dot50's name from their own page

---

## Files affected

**Part A:** 1 migration · 12 source files · 2 edge functions · 1 directory rename · `supabase/config.toml` · 2 READMEs · secrets re-add.
**Part B:** `src/pages/VulaPortalLaunch.tsx` (new) · `src/App.tsx` · `src/pages/doctor/DoctorRewards.tsx` · `src/pages/patient/MyRewards.tsx`.

## Out of scope
- Renaming the user-visible "Vula" currency (already correct in UI; this cleanup just aligns code/DB)
- Any modification to the 6Dot50 login flow itself
