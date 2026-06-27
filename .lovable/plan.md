# GitHub sync, first-sign-in tips, simplified doctor accept, working language switcher everywhere

## 1. GitHub sync (no code change)

Lovable ↔ GitHub is bidirectional and automatic — commits to the connected repo's default branch are pulled in by the platform. There is no manual sync action. After the changes below land, I'll confirm the workspace reflects the latest.

## 2. Navigation tips — first sign-in only, all user types

Change `src/components/RouteTipHost.tsx` to gate the entire tip system on a "first sign-in" check:

- Read `profiles.login_count` for the current user (cached via React Query, key `["first-signin-tips", userId]`).
- If `login_count > 1`, the host returns `null` — no tip ever renders for any role, on any route.
- If `login_count <= 1`, keep the existing per-route tip logic so each screen visited during that inaugural session can show its tip.

`useAuth` already bumps `login_count` via `bump_login_count` on every `SIGNED_IN`, so no migration is needed. The gate is one cheap query per session.

## 3. Doctor accepting a patient invite — info modal, no choices

In `src/components/doctor/DoctorAccessRequests.tsx`:

- Remove the four permission checkboxes, `selectedPermissions` state, `togglePermission`, and the `Checkbox`/`Label` imports.
- On **Accept**, always grant the full permission set:
  `["patient_info", "calendar", "session_summaries", "prescription_history"]`
  (run the existing grant + patient notification immediately).
- Replace the selection dialog with a compact **Access granted** modal:
  - Title: "Access granted"
  - Body: "You now have access to {patient name}'s information:" followed by a tight icon list (User / Calendar / FileText / Pill from lucide) of the four items with one-line descriptions.
  - Single **Got it** button to close.

No backend changes.

## 4. Language switcher — present and *actually working* on every profile

### Present everywhere (audit, then close gaps)

`TopBarIcons` already renders `<LanguageSwitcher />` and is mounted in `AppLayout` (doctor/admin), `PatientAppLayout`, `ProviderAppLayout` (hospital, ambulance, blood bank, pharmacy, insurer), and `MobileHeader`. I'll re-check each role's layout chain (including any role-specific wrappers like provider sub-routes and Holarc emergency pages) to confirm the pill renders at the same position with the same royal-blue styling on every profile. Any layout still rendering its own top bar without `TopBarIcons` gets it added.

### Why nothing changes when a language is picked

The switcher correctly calls `i18n.changeLanguage(code)` and persists to `profiles.preferred_language`, but most visible strings across the app are hardcoded English literals, so the UI doesn't visibly update. The fix is to route every high-visibility surface through `t()`.

Scope of the translation pass (presentation only — no logic changes):

- **Sidebars & nav**: `Sidebar.tsx`, `ProviderSidebar.tsx`, `BottomNav.tsx`, `MobileHeader.tsx`, `Footer.tsx`, `ProviderProfileMenu.tsx`, `PatientAppLayout` nav buttons.
- **Top bar / global chrome**: report-bug, notifications, language tooltip, profile menu items, install banner copy.
- **Page headings & tab labels**: Dashboard, My Patients, Sessions, Documents, Calendar, Invoices, Round Table, Settings, Profile, My Practice, My Holarchive (patient), Patient sub-pages (My Doctors, My Rewards, My Tasks, Health Album, Documents, Calendar, Access Management), Provider screens (Telematics, Live SOS, User Admin, Hospital Affiliations, etc.), Admin pages.
- **Primary CTAs** repeated across roles: Save, Cancel, Send, Add, Remove, Approve, Decline, Loading…, common form labels (Name, Email, Phone, Role, Status, Date).

For each string:

1. Add (or reuse) a key in `src/i18n/locales/en.json` under a sensible namespace (`nav.*`, `dashboard.*`, `patient.*`, `provider.*`, `common.*`).
2. Mirror the key in all 25 locale files (`af, ar, de, el, en, es, fr, ha, he, hi, ig, it, ja, ko, nl, pl, pt, ru, sn, sw, tr, xh, yo, zh, zu`) with translated values where we already have translations for that namespace, English fallback otherwise so missing locales degrade gracefully.
3. Replace the literal in the component with `t("key")`.

### Reactivity

`react-i18next` already triggers a re-render on `languageChanged`, so once strings are wired to `t()` the entire UI flips immediately — no reload, no per-profile divergence. The `AutoFitText` primitive and `--lang-scale` CSS variable (already in place) handle font reflow for longer translations.

### Cross-profile persistence

`LanguageSwitcher`'s existing effect already adopts `profiles.preferred_language` on user load. I'll verify it also re-runs when the user switches profile (doctor ↔ patient via the profile switcher) so the flag and applied locale flip together.

## Technical notes

- Tip gate query: `select login_count from profiles where id = auth.uid()` — runs once per session, cached.
- Accept-modal change is contained in `DoctorAccessRequests.tsx`; no other callers touch its permission state.
- Translation pass touches presentation files only; data fetching, mutations, and edge functions are untouched.
- No schema migrations required for any of the four items.
