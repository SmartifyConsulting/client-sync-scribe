# Holarc Wealth cleanup pass

## What changes
1. **Brand name** – every "Indigro" becomes "Holarc Wealth" (sign-up box "Join Holarc Wealth", menus, headers, install prompts, 404 page, emails, page titles). The sign-up box shows the Holarc Wealth logo above the title.
2. **Vula removed** – all Vula wording, logos, reward badges and explainers hidden from menus, dashboards, client records and nurse/rating screens.
3. **Dashboard greeting** – the line "You're doing well. Nothing needs your attention right now." under the greeting is removed.
4. **Beta pop-up** – the MVP Beta message is switched off (kept in code so it can be turned back on).
5. **Profiles** – the grey pill heading at the top of every profile is removed.
6. **Wealth Manager menu** – "My Firm" becomes "My Business".
7. **Client record tabs (My Clients)** – remove Admissions, Round Table, Upload Admission Form and Programmes.
8. **Wealth Managers list on a client** – shows only a history of past Wealth Managers (no connect/invite actions).
9. **"Unknown Doctor"** becomes "Unknown Wealth Manager" everywhere.
10. **Overview tab** – remove every medical frame and label (allergies, blood type, medications, vitals, medical aid, GP, lab results etc.). Physical State and Emotional State are merged into one **Financial Health Summary** panel.
11. **Next of Kin** becomes **Beneficiaries**, and the Employer section moves above it.

## Technical details
- Brand: `BRAND` in src/lib/terminology.ts → "Holarc Wealth"; replace literals in ~30 src files, en.json/uiTranslations.ts, and email functions (_shared/email.ts, send-* functions, inform-document) then redeploy those functions together with brandEmail.ts.
- Sign-up dialog in Auth.tsx: add holarc-wealth-logo asset above the title.
- Vula: add `/vula`, rewards routes already hidden; additionally remove VulaLogoBadge/LollipopDisplay/VulaExplainerDialog/RateNurseControl renders from dashboards, sidebar, profile popover and client record; replace "Vula" copy strings in en.json.
- Greeting: drop subtext render using emotionalState "good" message on the dashboard hero (PatientHeroCard / MyPersonalDashboard).
- EarlyReleaseNotice: guard with a `SHOW_BETA_NOTICE = false` constant.
- Grey pill: remove the role/section pill in profile headers (Profile.tsx, PatientProfile header, MyDetails).
- Sidebar/ProviderSidebar/MyPractice title: "My Firm" → "My Business".
- PatientProfile tabs: remove admissions, round-table, programmes triggers and the Upload Admission button (code retained).
- DoctorsOnProfile: read-only historical list; label "Unknown Wealth Manager".
- PatientOverview: strip medical sections; new combined Financial Health Summary card replacing Physical + Emotional state cards (reuse existing emotional/relationship data, wealth wording).
- PatientDetailsEditor / EmergencyContactsInline: relabel Next of Kin → Beneficiaries (copy only, same DB columns), reorder Employer before it.
- Verify with the build log and a Playwright screenshot of the sign-up box, dashboard and a client record.
