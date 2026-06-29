## Goals

Five tightly scoped fixes to the doctor and patient experience.

---

### 1. Add Partner — proper modal with visible search

**Problem:** The "Add Partner" inline form on `/my-practice` doesn't surface the search-existing-doctor field clearly, so users never see it.

**Change in `src/pages/MyPractice.tsx`:**

- Replace the inline `showAddPartnerForm` block with a `Dialog` modal (`AddPartnerDialog`) opened by the existing "+ Add Partner" button.
- Modal layout, in order:
  1. **Search existing practitioners** — search input (pre-focused) labelled "Search by name or practice number", live results list with avatar + name + reg number + "Add" button.
  2. Divider with "or".
  3. **Invite by email** — full name, registration number, mobile (with `PhoneNumberInput`), email → sends invite.
  4. Divider with "or".
  5. **Share invite link** — read-only link + Copy button.
- Reuse existing state (`partnerSearch`, `partnerSearchResults`, `addExistingPartner`, `addPartner`, `partnerShareLink`). No backend changes.

---

### 2. Language icon on the Hero/Landing page

**Problem:** Unauthenticated visitors on `/` cannot change language; the app auto-picks language from browser/country.

**Changes:**

- `src/pages/Landing.tsx`: mount `<LanguageSwitcher />` in the top-right of the hero (same royal-blue pill style already used in the app bar). It works without `user` — the existing component already no-ops the profile save when there is no user.
- `src/i18n/index.ts`: change detection order to `['localStorage']` only (remove `navigator` and any country-derived fallback). Default language stays English. Once a logged-in user has `profiles.preferred_language`, `LanguageSwitcher` continues to adopt it on profile load/switch.
- Result: language follows the user's explicit choice (persisted to localStorage for guests, to `profiles.preferred_language` for signed-in users), never the browser locale or phone country code.

---

### 3. Baseline explainer (one-time, friendly)

**Problem:** Patients don't know what a "baseline" is or that it's a one-time setup.

**Change in `src/features/rewards/components/PillBaselineCapture.tsx`:**

- Rewrite the `DialogTitle` + `DialogDescription` to plain-language copy:
  - Title: "Teach the app how you take **{medication}**"
  - Description: "A baseline is a quick one-time setup. Show the packaging, the tablet, and how you take it. After that, the app recognises your routine and you only need a short daily clip to earn your Vula reward — you won't have to do this setup again."
- Add a 3-bullet "Why we do this" block in the `intro` step:
  - "Helps the AI learn what your medication looks like."
  - "Confirms the right tablet is being taken."
  - "Done once per medication — never repeated."
- Keep all existing capture steps and logic unchanged.

---

### 4. Remove "Round Tables" and "All Sessions" buttons from Patients header

**Problem:** Redundant — Round Tables lives in the sidebar, and "My Sessions" will be the canonical sessions entry under My Practice.

**Changes:**

- `src/pages/Patients.tsx` (lines 404–412): delete the two `Button`s for `patients.roundTables` and `patients.allSessions`. Keep `Import` and `+ Patient`. Change grid to `grid-cols-2` (already correct).
- Sidebar already exposes "My Round Tables" and "My Sessions" — no nav changes needed for this step.

---

### 5. First-visit screen tips — show once, then never

**Status:** `src/lib/screenTips.ts` and `RouteTipHost` already exist and persist dismissals to `user_screen_tips_seen`. Audit + extend so every key screen has a tip and nothing repeats.

**Changes:**

- `src/lib/screenTips.ts`: add missing entries for screens a doctor commonly hits first, each with a concrete navigational hint:
  - `/my-practice` → "Add partners, set service prices, design your letterhead, and configure how patients reach you."
  - `/my-sessions` → "Today's sessions are expanded. Tap a date group to expand last week, last month, or older."
  - `/patients` → update body to: "Use **Import** to bulk-add patients from a spreadsheet, or **+ Patient** to add one manually. Tap any row to open the record."
  - `/doctor/round-tables` → "Multidisciplinary spaces shared across a patient's care team."
  - `/holarchelp` / SOS screens → brief orientation.
- Confirm `RouteTipHost` writes to `user_screen_tips_seen` on dismiss (it does) and only renders if the tip's id is absent for `auth.uid()` — so each tip fires exactly once per user across devices.
- No DB migration needed; the `user_screen_tips_seen` table already stores `(user_id, tip_id)`.

---

## Technical Notes

- No new tables, no new edge functions, no schema migrations.
- `LanguageSwitcher` works pre-auth because its profile update is gated by `if (user)`.
- The Add Partner modal reuses existing debounced search (`profiles.full_name`/`doctor_number`) and existing insert into `practice_partners` — no policy changes.
- Removing the `i18next-browser-languagedetector` `navigator` source is a one-line config change; falling back to localStorage preserves guest choices across reloads.

## Files Touched

- `src/pages/MyPractice.tsx` — extract Add Partner inline form into a `Dialog`.
- `src/pages/Landing.tsx` — mount `LanguageSwitcher` in hero.
- `src/i18n/index.ts` — detection order = `['localStorage']`, fallback `en`.
- `src/features/rewards/components/PillBaselineCapture.tsx` — explainer copy + intro bullets.
- `src/pages/Patients.tsx` — remove Round Tables / All Sessions buttons.
- `src/lib/screenTips.ts` — add/refine tips for new and high-traffic routes.