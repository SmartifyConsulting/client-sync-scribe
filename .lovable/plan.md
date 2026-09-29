# Client menu, greeting and Consultation screen clean-up

## 1. Client menu: "My Future" instead of "My Business"
- Clients never see "My Business" (or any other Wealth Manager/firm item) in the side menu, the bottom menu or the profile switcher.
- Add a new **My Future** menu item for clients, with five tabs:
  - **My Cover:** life, disability, severe illness and short-term policies, from the client's issued policies and their Existing Risk Portfolio.
  - **My Investments:** discretionary investments and tax-free savings.
  - **Retirement:** retirement annuities, pension and provident funds, and target retirement age.
  - **Claims:** a list of claims plus "Log a claim" (details and an optional document). The adviser can see these too.
  - **Documents:** the client's signed documents (Record of Advice, mandate, policy schedules).
- Tabs with no information show a short, friendly empty message telling the client what to do.

## 2. Client greeting
- The greeting uses the client's real first name ("Good evening, Georgia"), never their email name ("georgia.client").
- If the account has no name saved, it falls back to the client record's name, then to a plain "Good evening".
- Georgia's demo account gets her full name saved.

## 3. Consultation screen: wording
- "Select a patient" becomes "Select a client". The subtext mentions clients and consultations only.
- The search box searches your clients, and its placeholder says "Search clients…".
- "Start Session" becomes **Start Consultation** everywhere.

## 4. Consultation screen: rebuilt for adviser–client meetings (your screenshot)
- **Title and subtext:** "Consultation Mode: record, transcribe and summarise client consultations."
- **Recording card:**
  - The privacy line says "client" instead of "patient".
  - The pastel green person icon changes to #9CC7DD.
- **Client Overview** (replacing Conditions / Current meds / Allergies / Recent visits):
  - Current stage in the client's journey and the next action
  - Existing cover and total monthly premiums
  - Net worth, from Assets & Liabilities
  - Risk profile and goals
  - Last consultation date
  - The summary line is written about the client's financial position, not their medical history.
- **Live AI Consultation Assistant:**
  - The disclaimer reads: "Private: only visible to you. Not shared with the client or other advisers. AI notes support your advice and must be reviewed before you rely on them."
  - The AI's live analysis shifts from clinical notes to adviser notes: needs raised, products mentioned, follow-up actions and points to disclose.
- **Personal Notes and Drawing Pad:** no change.

## 5. Pastel green icons
- Remaining pastel green icon backgrounds and colours (like the person icon above) change to #9CC7DD across client and adviser screens.

## Open question
You said three tabs but listed five names: My Cover, My Investments, Retirement, Claims and Documents. The plan uses all five. Tell me if you want fewer.

## Technical details
- Sidebar.tsx / BottomNav.tsx: add a `/my-future` item to patientNavItems. Filter any `/practice` item out for the patient role, including in the preference-reorder and profile-switcher paths.
- New page `src/pages/MyFuture.tsx` with Tabs, and a route in App.tsx:
  - My Cover, My Investments and Retirement read `client_financial_profiles` and `wealth_applications` (issued).
  - Documents reads `documents` by patient_id.
- New `wealth_claims` table: patient_id, policy/application id, type, description, status, attachment path.
  - GRANTs, RLS via `can_view_patient_record`, timestamps trigger.
  - Attachments go in the existing private compliance-docs bucket.
- PatientHeroCard.tsx: name fallback chain full_name → patients.name → none; drop the email fallback. Set profiles.full_name for the Georgia demo user with run_sql.
- Sessions.tsx:
  - Idle selector copy and search placeholder; the patient list filter stays the same data, relabelled.
  - Client Overview block replaced by a wealth summary from the workflow, financial profile and applications.
  - Disclaimer copy.
- Edge function for the live analysis: swap the prompt to adviser-note fields and update the renderer labels. Redeploy.
- en.json / uiTranslations.ts: "Start Session" → "Start Consultation", "Select a patient" → "Select a client". Only English is updated.
- Colour: add a `--sky-soft` token (#9CC7DD) in index.css. Replace `bg-accent`/pastel teal-green icon chips with it where they render as pastel green.
- Record the claims table rule and the My Future module in AGENTS.md.
