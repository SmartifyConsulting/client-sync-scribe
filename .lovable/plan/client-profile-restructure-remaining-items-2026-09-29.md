# Client profile restructure + remaining items

## Part 1: Client profile tabs
The two main tabs on the client profile are **Personal Information** and **Financial Information**. Clicking between them switches between the two sets of sections below. Section headers keep the current blue text and framing, with no icons in front.

**Personal Information tab**
1. Personal Information: name, ID number, date of birth, marital status and marital regime
2. Addresses: residential and postal address, used for FICA
3. Employer: employer, industry and job title
4. Beneficiaries: dependants, relationship and % share. The shares must total 100%.
5. General Notes: adviser notes and consultation comments

**Financial Information tab** (replaces all medical sections)
1. General & Cash Flow: gross income, net salary, fixed and discretionary expenses, tax bracket. The monthly surplus is worked out automatically.
2. Assets & Liabilities: properties, vehicles, home loans, short-term debt. Net worth is totalled automatically.
3. Existing Risk Portfolio: life cover, disability, severe illness and short-term insurance, with insurer, cover amount and premium. Issued policies from the workflow are shown read-only.
4. Investments & Retirement: retirement annuities, pension and provident funds, tax-free savings, with provider, value and monthly contribution.
5. Goals & Risk Profile: target retirement age, financial goals and risk tolerance (Conservative to Aggressive).
6. Estate & Succession Planning: will status and date, trusts, and an estimated estate duty (20% above R3.5m, 25% above R30m). The estimate is marked as a guide only.

Clients see and edit their own information. Their Wealth Manager can view and edit it too.

## Part 2: Items still open from the last plan
- **Workflow guardrails:**
  - later stages stay locked until the mandate is signed
  - an adverse FICA finding blocks onboarding and shows the reason
  - an application can't be submitted unless the Record of Advice was signed before it
- **FICA uploads** are stored privately and attached to the form.
- **Drawn signatures** on the forms, with the typed name kept as a fallback.
- **Commission entry** when a policy is issued, which feeds Targets and Commission.
- **Plan changes cancel the old subscription**, so nobody is billed twice.

Still waiting on you: the real plan prices, which are placeholders for now.

## Technical details
- New table `client_financial_profiles`: one row per patient_id, with jsonb columns `cash_flow`, `assets_liabilities`, `risk_portfolio`, `investments`, `goals_risk`, `estate`, plus timestamps.
  - GRANTs to authenticated and service_role.
  - RLS through `can_view_patient_record(patient_id)`.
- Personal fields such as marital regime, postal address, industry, job title, general notes and the beneficiaries list: reuse existing `patients` columns where they already exist. Anything missing gets added as columns, and beneficiaries go in `jsonb`.
- In PatientDetailsEditor, the tab value stays `medical` internally but is labelled "Financial Information". The medical accordions are no longer rendered, but the code stays. Icons are removed from the AccordionTrigger headers in both tabs.
- New component `features/patients/components/financial/FinancialInformation.tsx` with six section editors that save to the table above through React Query.
- Guardrails go in `wealth_blockers` / `wealth_derive_stage`. A private bucket `compliance-docs` gets storage RLS. The signature pad uses a canvas and saves a PNG. The commission fields go in an "Issued" dialog on the application item. `payfast-checkout` cancels any existing active PayFast subscription through the API before creating the new one.
