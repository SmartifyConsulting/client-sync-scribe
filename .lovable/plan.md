# Generic Header/Footer Template + Full UI Auto-Translation

## Part 1 — Generic Header/Footer Template for All Doctors

Take the exact layout/structure of Dr Dean's "Header and Footer" template (Border Orthopaedics) and turn it into a generic starter template every doctor receives, with the real practice data replaced by `Insert Data here` placeholders.

### Template structure (preserved from Dr Dean's)

```text
┌───────────────────────────┬──────────────────────────┬──────────────────────────┐
│ LEFT (practitioners)      │ CENTER (practice +       │ RIGHT (contact)          │
│                           │  address)                │                          │
└───────────────────────────┴──────────────────────────┴──────────────────────────┘
```

- **Header left** — practitioner roster
  ```
  Dr. [Insert Data here]: MP [Insert Data here]
  [Cell: Insert Data here]
  Dr. [Insert Data here]: MP [Insert Data here]
  [Cell: Insert Data here]
  ```
- **Header center** — practice block
  ```
  [INSERT PRACTICE NAME]
  ADDRESS: Insert Data here
  Insert Data here
  Insert Data here
  ```
- **Header right** — contact
  ```
  CONTACT DETAILS:
  Practice Contact Number: Insert Data here
  ```
- **Footer center**: `REGISTRATION NO.: Insert Data here`
- Font family: `sans`

### Implementation
1. Migration adds `seed_default_header_footer_template(_user_id uuid)` — inserts the generic template as `is_default = true` only when the doctor has none. Idempotent.
2. Wire the seed into the existing `handle_new_user` flow when a doctor profile is created.
3. One-time backfill for every existing doctor with no header/footer template. Dr Dean's existing record is untouched.
4. No frontend changes — doctors edit it from `MyPractice` → Templates and replace `Insert Data here` with their real details.

---

## Part 2 — Full UI Auto-Translation When Language Changes

Today only a subset of strings honour the language picker. The user expects EVERY visible label, heading, button, tab, menu item, placeholder, toast, dialog title, table header, empty-state message, tooltip, badge, and user-facing dynamic content to switch immediately when a language is chosen via the flag icon (top right).

### Scope
Apply to all roles/portals:
- Doctor portal (Dashboard, Patients, Sessions, Documents, To-Do, Calendar, Invoices, Rewards, MyPractice, Settings, Connections, Round Tables, CPD Certificates, Profile)
- Patient portal (MyDetails, MyDoctors, MyRewards, PatientDashboard, Tasks, Documents, Health Album, Calendar, Prescription History, Round Table, Access Management, Invoices)
- HolarcHelp / Emergency Provider portal (all hospital, ambulance, dispatch, SOS, fleet, telematics, shift teams, admin screens)
- Admin portal (Users, Hospital Network, Pricing, Gamification, Provider Approvals, Bulk Password Reset)
- Shared chrome (Sidebar, BottomNav, MobileHeader, TopBarIcons, Footer, PageHeader, modals, toasts, ScreenTip, EarlyReleaseNotice)
- Auth flow (Auth, ProviderSignup, ForgotPassword, ResetPassword, verify email, subscription gate)

### What gets translated
1. **Static UI text** — every heading, label, button, tab, placeholder, tooltip, empty state, helper text, validation/toast message.
2. **Enum-style dynamic text** — role names, severity levels, status badges, document types, frequency labels, telematics shift states, notification categories.
3. **Sample/seed content** — sample patient names stay as-is (proper nouns), but their clinical descriptors, sample task titles, sample notification bodies, sample template names ("Header and Footer", "Referral Letter", etc.) are localized.
4. **User-generated free text** (notes, transcripts, document body, chat messages) — NOT auto-translated by default; instead add a per-row "Translate" affordance (already exists for sessions via `translate-text` edge function) and reuse it on patient notes, round-table posts, and documents.

### Implementation
1. **Translation key sweep**
   - Add a script `scripts/i18n-scan.ts` that walks `src/**/*.{ts,tsx}` and reports raw JSX strings + string-prop attributes (`placeholder`, `title`, `aria-label`, toast `title`/`description`) so we have a checklist.
   - Replace each finding with `t("namespace.key", "English fallback")`. Use stable hierarchical namespaces (`doctor.dashboard.*`, `patient.documents.*`, `holarchelp.dispatch.*`, `admin.users.*`, `common.*`, `forms.*`).

2. **Locale files**
   - English (`en.json`) is the source of truth. Add every new key here first.
   - Mirror new keys into all 24 other locales (`af, ar, de, el, es, fr, ha, he, hi, ig, it, ja, ko, nl, pl, pt, ru, sn, sw, tr, xh, yo, zh, zu`). For locales where a clean translation is missing, fall back to the English string AND emit a build-time warning rather than shipping empty values.
   - Translation pass uses Lovable AI Gateway (Gemini) via a one-off `scripts/i18n-translate.ts` to bulk-translate missing keys.

3. **Live re-render**
   - `i18next` already triggers re-render via `react-i18next`. Audit components that cache strings in `useMemo` without depending on `i18n.language` and add it as a dep.
   - `AutoFitText` is already wired to re-measure on `languageChanged`.
   - Confirm `LanguageSwitcher` persists to `profiles.preferred_language` (already does) AND immediately fires `i18n.changeLanguage` (already does) — verified path is preserved.

4. **Dynamic content helpers**
   - New `useT()` wrapper exposing helpers: `tEnum(domain, value)` for status/severity/role enums, `tDate(value)` for localized date formatting via `date-fns/locale`, `tNumber(value, currency?)` for currency/number formatting via `Intl`.
   - Replace hardcoded `toLocaleString()`, `format(date, "MMM d")`, currency `R` prefixes, etc. with these helpers.

5. **RTL polish**
   - Add `dir="rtl"` on `<html>` when language is `ar` / `he`. Audit padding/margin utilities that assume LTR (use `ms-` / `me-` instead of `ml-` / `mr-` on flagged spots).

6. **Verification**
   - Snapshot test: Playwright walks Dashboard, Patients, Documents, Sessions, To-Do, Hospital Network, Live SOS, Admin Users in `en`, `yo`, `zu`, `ar` and screenshots each for visual diff.
   - Manual sweep checklist captured in `docs/i18n-coverage.md`.

### Out of scope
- Translating historical user-generated content (notes/transcripts) on demand without explicit user action.
- Translating uploaded PDFs/images.
- Translating Dr Dean's existing custom template content (Part 1 leaves it alone).
