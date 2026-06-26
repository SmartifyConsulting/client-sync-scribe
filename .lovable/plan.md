## Part 1 — Sample data marker

Visually mark every sample/seeded patient so test users instantly know the record is demo data.

### The mark
A **small** circled "s" badge (like the © symbol), crimson `#DC143C`, lowercase "s", roughly 12px (sm) — sized to sit unobtrusively next to a patient name. Tooltip `Sample data — not a real patient` and matching `aria-label`.

Component: `src/components/patients/SampleBadge.tsx` (presentational, no data fetching).
Helper: `src/lib/samplePatients.ts` → `isSamplePatient(patient)` returns true when any of:
- `patient.is_sample === true` (new optional column)
- `patient.name` matches a known seed name (covers existing rows immediately)
- `patient.metadata?.source === 'seed'`

### DB change (additive)
- `ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS is_sample boolean NOT NULL DEFAULT false;`
- Backfill `is_sample = true` for rows whose name matches the seeded sample set.
- No RLS/GRANT change (column inherits existing policies).

Update seed/insert paths that create demo patients to set `is_sample: true`.

### Where the badge appears
- Doctor: `Patients.tsx` list, `PatientOverview`, `PatientDetailsEditor`, `PatientProfile` header, `UpcomingAppointments`, `RecentActivity`, `DoctorDocumentsTab`, session/invoice/referral/round-table patient lines, notifications referencing a patient.
- Patient: `MyDetails`, `PatientDashboard` header (only if the logged-in account is itself a sample).
- Admin: `UsersTab` next to sample/test users.

---

## Part 2 — App-wide language switcher

Add a **language picker shown as a flag** in the top-right header, **immediately to the left of the Report Bug icon**. Default flag: 🇬🇧 UK. Default app language: English. Clicking the flag opens a dropdown listing supported languages with their flags; selecting one switches the entire app UI.

### UI
- New component: `src/components/layout/LanguageSwitcher.tsx`
  - Trigger: current-language flag (24px), `aria-label="Change language"`.
  - Menu: flag + language name per item; checkmark on the active one.
  - Persists choice in `localStorage` (`app.language`) and applies it on next load.
- Mounted in the top header next to the bug-report button (same component used across doctor, patient, admin, and HolarcHelp shells).

### Supported languages (initial set)
English 🇬🇧 (default), Afrikaans 🇿🇦, isiZulu 🇿🇦, isiXhosa 🇿🇦, Hausa 🇳🇬, Igbo 🇳🇬, Yoruba 🇳🇬, French 🇫🇷, Portuguese 🇵🇹, Spanish 🇪🇸, Arabic 🇸🇦 (RTL).

Reuses the existing `src/lib/languages.ts` list where possible; flags rendered as Unicode emoji (no extra assets).

### i18n wiring
- Add `react-i18next` + `i18next` + `i18next-browser-languagedetector`.
- New folder `src/i18n/` with:
  - `index.ts` — i18next init, default `en`, fallback `en`, detection order `localStorage` → `navigator`.
  - `locales/en.json` — English copy (source of truth).
  - `locales/{af,zu,xh,ha,ig,yo,fr,pt,es,ar}.json` — initially copies of `en.json` so the UI never breaks; real translations filled in incrementally.
- Replace hard-coded UI strings in shared chrome (sidebar, top nav, common buttons, auth pages, dashboards) with `t('key')`. Long-form clinical/AI content stays as-is for now.
- RTL handling: when `ar` is active, set `document.documentElement.dir = "rtl"`.

### Out of scope
- Translating database content, AI outputs, or generated documents.
- Per-user server-side language preference (localStorage only for now).

---

## Technical notes
- All edits are presentation-layer except the additive `is_sample` migration and the seed-path flag update.
- The crimson colour is inline-styled on `SampleBadge` (single-use accent, not a theme token).
- i18n bundle is lazy-loaded per language to keep initial JS small.
