## Translation Sweep — Round 2 (revised)

The screenshots show two problems:

1. **Missing keys** — chrome strings on My Practice, Rewards, To-Do, Documents, Round-Table meta, and SOS landing are still hard-coded English.
2. **Stale renders on language switch** — when the flag changes, only some components re-render. The rest keep the previous locale (or fall back to English), producing the half-Italian/half-Greek/half-English screens.

### Part A — Fix the live language-switch bug

Root cause: components that read translations outside the `useTranslation()` hook (module-scope `i18n.t(...)`, memoized constants, options arrays declared at file top, default props) capture the locale at import time and never update. Suspense fallbacks and `key`-less list renders also freeze the old strings.

Fixes:

- **Force a global re-render on `languageChanged`.** In `src/i18n/index.ts`, after `i18n.init(...)`, attach `i18n.on('languageChanged', lng => { document.documentElement.lang = lng; document.documentElement.dir = RTL.has(lng) ? 'rtl' : 'ltr'; })` and bump a Zustand/Context `langVersion` counter that the root `<App />` consumes so the whole tree re-renders (or wrap `<Outlet />` with `key={i18n.language}`).
- **Replace all module-scope `i18n.t(...)` calls** with in-component `const { t } = useTranslation()`. Audit with `rg "i18n\.t\(" src` and `rg "from .*i18next.*\n.*\.t\(" src`.
- **Move static option arrays** (`PRIORITIES`, tab defs, milestone labels, template card metadata) inside the component body so they re-evaluate on each render, or compute via `useMemo(..., [i18n.language])`.
- **Persist `i18n.changeLanguage` properly** in `LanguageSwitcher` — await the promise, then `await queryClient.invalidateQueries()` so any server-translated content (briefing narration, AI summaries) also refreshes.
- **Guard against suspense flicker** — set `react: { useSuspense: false }` in `i18n.init` so partial trees don't keep stale text while a namespace lazy-loads.
- **Verify with Playwright**: load `/dashboard` in `en`, switch to `it`, assert no English chrome remains; switch to `el`, assert no Italian chrome remains.

### Part B — Add the missing translation keys

Same scope as before. New namespaces in `src/i18n/locales/en.json`:
- `myPractice` — tabs (My Practice / Referrals / Credentials / My Rewards), About Me card, `{n} / 600 words`, Save
- `patientRewards` — Progress to Next Milestone, `{n} / {n} Vulas to "{milestone}"`, `{n} more to go!`, Recent Rewards, empty state
- `todo` (extend) — Add New Task, Tap to record, Or type your task here..., Add, Priority, Low/Medium/High, AI Process, Active/Completed/All tab labels, Approve, `(No matching patient found)`
- `documents` — Documents/Templates/Header & Footer/Content Templates tabs, helper text, + New Content Template, Search content templates..., Create Template, Patient Documents, Search documents..., Letterhead label, Header and Footer / Default values, built-in template name+description keyed by slug
- `roundTablesMeta` — `{count, plural, one {# note} other {# notes}} · Last activity {date}`
- `sos` — Emergency Assistance, Help will be alerted instantly, acknowledge heading + 3 bullets, SOS / TAP FOR HELP, footer caption, Manage emergency contacts, View incident history

Run `/tmp/i18n_extend.py` (Gemini 2.5 Flash) to translate into the other 24 locales.

### Part C — Wire components

`src/pages/MyPractice.tsx`, `src/pages/patient/MyRewards.tsx`, `src/pages/TodoList.tsx` (+ `AddTaskCard`), `src/pages/Documents.tsx` & `src/pages/doctor/DoctorDocumentsPage.tsx`, `src/pages/doctor/DoctorRoundTablesPage.tsx`, `src/modules/holarchelp/pages/HolarcHelpHome.tsx`.

- Replace hard-coded JSX with `t('namespace.key')`.
- Use `new Intl.DateTimeFormat(i18n.language, …)` for the To-Do day headers and Round-Table "Last activity" date so dates flip with the locale too.
- For template display names, look up `t(\`documents.builtin.${slug}.name\`)` with a fallback to the DB name (keeps custom templates untouched).

### Out of scope

User-entered content (About Me paragraph, patient names, dictated task text, document body, invoice numbers, brand words Vula / HolarcHelp / SOS) stays in the language it was authored in.

### Verification

1. `tsgo` clean.
2. Playwright switches `en → it → el → ig → zu` on `/dashboard`, `/doctor/round-tables`, `/todo`, `/documents`, `/patient/rewards`, `/sos`; screenshot each and confirm no mixed-locale chrome.
