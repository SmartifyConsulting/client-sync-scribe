## Goal
1. Make every "Primary Language" / "Language" dropdown in the app show the same full list of 25 languages used by the top-right flag switcher (including Igbo, Hausa, Yoruba, Shona, isiZulu, isiXhosa, Kiswahili, Afrikaans, etc.).
2. Make the entire UI (headings, labels, buttons, menus, table headers, dialog titles) actually re-render in the selected language — not just a handful of nav items.

## Part 1 — Unify the language list (small, low-risk)

Replace the three divergent language lists with one source of truth: `SUPPORTED_LANGUAGES` from `src/i18n/index.ts` (25 langs, includes Igbo/Hausa/Yoruba/Shona/Zulu/Xhosa/Swahili/Afrikaans/Arabic/Hebrew/etc.).

Files to update:
- `src/lib/languages.ts` — re-export `LANGUAGES` derived from `SUPPORTED_LANGUAGES` (`{ code, name }`). Keep `COMMON_SPECIALTIES` untouched.
- `src/pages/MyPractice.tsx` — delete the local `LANGUAGES` array (lines 120–149); import from `@/lib/languages`. The Primary Language `<Select>` (line ~1222) then renders all 25 options.
- `src/features/patients/components/PatientDetailsEditor.tsx` — already imports from `@/lib/languages`, so it picks up the new list automatically.
- `src/pages/patient/MyDoctors.tsx` — same, no change needed beyond the shared list expanding.

Result: Igbo, Hausa, Yoruba, Shona (and the rest) appear in every Primary Language picker.

## Part 2 — Make the whole UI translate when the flag changes

Today only a subset of strings go through `t()`. Everything else is hardcoded English, so switching languages looks like nothing happened. The fix is a systematic sweep, done in priority order so the user sees change immediately:

### 2a. Expand the shared UI dictionary
Grow `src/i18n/uiTranslations.ts` with keys for the chrome that appears on every screen, in all 25 languages (machine-translated baseline, English fallback retained):
- Sidebar / TopBar items not yet keyed
- Common buttons: Save, Cancel, Delete, Edit, Add, Send, Search, Close, Submit, Back, Next, Continue, Upload, Download, Print, Share
- Common labels: Name, Email, Phone, Address, Date, Time, Status, Notes, Description, Type, Category, Actions, Loading…, No data
- Common headings: Settings, Profile, Dashboard, Overview, Details, History, Documents, Messages, Notifications
- Auth screen: Sign in, Sign up, Create your free account, Forgot password, Password, Email, Show/Hide password
- Toast/empty states: "No results", "Saved", "Updated", "Deleted", error/success generics

### 2b. Wire `t()` into the high-traffic screens
Sweep these screens to replace literal strings with `t("namespace.key")`:
- `src/components/layout/*` (Sidebar, TopBar, ProviderSidebar, PatientSidebar) — fully
- `src/pages/Dashboard.tsx`, `src/pages/Settings.tsx`, `src/pages/Profile.tsx`, `src/pages/MyPractice.tsx` (tab labels + section headings + Primary Language label)
- `src/pages/Auth.tsx`, `src/pages/Landing.tsx`, `src/pages/ForgotPassword.tsx`, `src/pages/ResetPassword.tsx`
- `src/pages/Patients.tsx`, `src/pages/PatientProfile.tsx` (tab labels + buttons)
- `src/pages/patient/PatientDashboard.tsx`, `MyDetails.tsx`, `MyDoctors.tsx`, `MyRewards.tsx`, `PatientDocuments.tsx`
- `src/pages/doctor/*` (page headers + tab labels + table headers)
- `src/modules/holarchelp/pages/provider/**` — section headers, tab labels, buttons (Hospital, Ambulance, ER portals)
- Common shared components: `PageHeader`, empty-state, confirm dialogs, `ProvidersScreen` tabs (Doctors/Nurses/ER), `AffiliatedHospitalsScreen`

For deeply nested content (clinical free-text, AI output, user-entered data) we will NOT translate — only chrome (labels, buttons, headings, tab titles, table headers, menu items, toasts).

### 2c. Force a re-render on language change
- Verify `i18n.changeLanguage` triggers re-render. `react-i18next` does this automatically when components call `useTranslation()`. The reason screens don't update today is that they don't call `t()` at all — Part 2b fixes that.
- Keep the `applyLang` handler in `src/i18n/index.ts` (sets `--lang-scale`, `dir`, `lang`) — already correct.

### 2d. Persistence stays as-is
`LanguageSwitcher` already saves `profiles.preferred_language` and rehydrates on profile switch — no change.

## Out of scope
- Translating user-entered clinical content, AI narrations, patient notes, document bodies.
- Translating server-side / edge-function output (emails, PDFs).
- Adding new languages beyond the 25 already in `SUPPORTED_LANGUAGES`.

## Acceptance
- Open Profile / My Practice → Primary Language dropdown lists 25 options including Igbo, Hausa, Yoruba, Shona, isiZulu, isiXhosa, Kiswahili, Afrikaans.
- Click the flag (top-right) → pick Yorùbá → sidebar, top bar, page headers, tab labels, common buttons, settings labels, auth screen all switch to Yorùbá. English remains only for free-text content explicitly out of scope.
- Refresh the page → language persists. Switch profile → adopts that profile's saved language.
