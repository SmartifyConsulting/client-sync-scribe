# Step 5: Wealth-management copy and terminology (Indigro)

## Decisions
- **Brand:** Indigro everywhere users see a name: the landing page, sign-in, emails, page titles and documents.
- **Healthcare-only features are hidden from wealth users.** They are removed from menus, the landing page and dashboards, but the code stays in the app. This covers:
  - SOS and emergency (ambulances, hospitals, incidents)
  - Hospital admissions and wards
  - Prescriptions and medications
  - Lab results, imaging and vitals
  - Biolog
  - Medication rewards (Vulas)
  - Ask Maeve and Round Tables
- **English first.** Only the English text is rewritten now. The other 24 languages keep their current text until a later re-translation pass.

## 1. Terminology dictionary
A single glossary becomes the source for every screen, so each concept has exactly one name:
- **People:** Client, Wealth Manager, Firm, Firm Member, Firm Assistant.
- **Consultations:** Consultation and its variants (history, notes, summary, recording, transcript). Clinician Notes become Wealth Manager Notes.
- **Planning:** Wealth Plan, Financial Goals, Financial Needs Analysis, Financial History, Client Record and Client Profile.
- **Workflow:** the 15 workflow stage names used in the Workflow Map and Live Workspace.
- **Client-friendly versions** of technical terms, shown to clients only:
  - "Record of Advice (ROA)"
  - "Identity and regulatory verification (FICA)"

## 2. Navigation and page structure
- Sidebar, mobile menu and role switcher use wealth labels: Clients, Consultations, Live Workspace, Documents, Calendar, Actions, Remuneration and Settings.
- Menu entries for the hidden features are removed. Links straight to those pages send users back to the dashboard.
- Page titles and the browser tab title are updated in the same way.

## 3. Screen-by-screen rewrite (English)
Each shared screen is rewritten for its meaning, not by swapping words. This covers headings, buttons, labels, helper text, tooltips, empty states, loading states, confirmations and errors on:
- Dashboards: "Wealth Overview", "Financial Goals", "Upcoming Reviews"
- Client list and client profile
- Consultations
- Documents and templates
- Calendar, actions (tasks), notifications and messages
- Settings and firm management
- Sign-up, sign-in, forgot password and reset password

## 4. Billing becomes remuneration and fees
- **Clients see:** Advice Fee, Fees, Charges, Premium and Contribution. No commission is shown to clients.
- **Wealth managers see:** Remuneration as the overall heading, plus Commission, Advice Fee and Commission Statement labels.
- Only wording changes here. No new billing features are added.

## 5. Onboarding and tour
Rewrite the guided tour and screen tips to cover these steps:
- Create a client profile
- Record their financial position and goals
- Complete the needs analysis and risk profile
- Review existing products
- Prepare the recommendation and ROA
- Complete compliance
- Submit the application
- Track progress and annual reviews

## 6. Marketing and landing page
- Rewrite the landing page (hero, features, benefits, calls to action, FAQ and footer) to position Indigro as a professional wealth-management platform.
- Keep claims factual, for example "Manage your clients, recommendations, applications and ongoing reviews in one place".
- Use no healthcare wording and no generic AI slogans. AI is only mentioned for features that really exist: consultation transcription and summaries.
- Update the landing images only if they show clinical scenes. Where that happens, I'll flag it rather than replace them without asking.

## 7. Notifications, emails and system messages
Rewrite the text of:
- In-app notifications
- Reminder messages
- Email templates, including the sign-in emails
- Error messages, so each one says what happened, what is missing and what to do

## 8. Final check
- A search for leftover healthcare words that users can see: patient, doctor, clinician, medical, health, treatment, diagnosis, prescription, hospital, clinical, lab and vitals.
- Read through the app as each role: client, wealth manager and firm admin.
- Report anything left over that cannot be changed safely.

## Technical details
- **Scope:** only text users can see changes. Table names, columns, function names, routes and file names stay the same, following the standing no-rename rule.
- **Glossary:** a new file, `src/lib/terminology.ts`, holds the English terms. All rewritten English text goes into `src/i18n/locales/en.json` and `uiTranslations.ts`. Hardcoded strings in components are edited in place; the existing `find_hardcoded_strings.mjs` script lists them.
- **Hiding features:**
  - A single `WEALTH_HIDDEN_MODULES` list removes the entries from `Sidebar`, the mobile nav and the landing page.
  - A small route guard in `App.tsx` redirects those routes.
  - The `holarchelp` module routes are unmounted from the nav registry.
- **Database text:**
  - Notification text written by database functions gets a migration that updates only the message strings.
  - Email templates in the backend functions are updated and redeployed.
- **Head tags:** `index.html` gets Indigro title, description and og tags.
- **Order of work:** because the job is large, it runs in batches:
  1. Glossary and navigation
  2. Dashboards and client screens
  3. Consultations and documents
  4. Remuneration and settings
  5. Onboarding
  6. Landing page
  7. Notifications and emails
  8. Final search
