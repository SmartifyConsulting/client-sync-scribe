# Live quote navigation review — 3 November 2026

This reference records screens actually inspected in the broker's Chrome session. It supplements the supplied recording manuals; it does not certify complete quote automation. No passwords, authentication URLs, unrelated client information or quote references are included here.

## Entry point and verified tools

Momentum AdviserConnect → Quotes & calculators → Quotes. Each card's Get a quote must be scoped to its product title: the page contains multiple identically named buttons. New tools can open asynchronously in separate tabs. A signed-in AdviserConnect session does not prove a newly entered password was accepted.

| Purpose | Actual card / entry | Observed destination | Verification reached |
| --- | --- | --- | --- |
| Personal life/risk and alterations | Myriad New Business and Alterations - New QuotaM → Get a quote | recurring.momentum.co.za/myriadacquisitionui/quotes | Quote list and blank Create Quote form |
| Business assurance needs analysis | Fulcrum → Get a quote | fulcrum-api.momentum.co.za | Dashboard and FNA details, Client, Parties, Needs tabs |
| Guaranteed retirement income | Guaranteed Annuity Quote → Get a quote | wealth.momentum.co.za/annuities/intermediary/proposal | Proposal navigator and unsaved Add new client form |
| With-profit annuity | Golden Series With-Profit Annuities → Get a quote | eb.momentum.co.za/employerPortal/Controller/ARRIVE | Signed-in annuity terms/confidentiality gate; no agreement accepted |
| Investment proposal | Wealth Quote → Get a quote | wealth.momentum.co.za/wealth/intermediary/tools/quote/new | Embedded client list, Add Client and Person form |
| Investo | Investo Quote → Get a quote | investoquota.momentum.co.za/dashboard | Blank page; no visible form or embedded iframe at review |
| Health | Health Group Quote; Health Retail Quote | Not launched | Catalogue descriptions only; not part of the wealth quote traversal |

These are observed UI destinations, not a proposal to replace configured login URLs or persist SSO query strings.

## Myriad / QuotaM

The quote list offers Create quote, filters for New Business/Alterations, search by identity, passport, reference, policy, description, personal details, legal entity or registration; and All, Quotes, Applications, Submitted, In Force tabs. Existing client cases were not opened or changed.

Create quote opens a form before any identifying values are entered. It exposes New Business Quote and Alteration Quote choices, quote description, package and tax status.

Verified package navigation:

- Personal: Personal/Estate duty; Security for loan/bond; Other.
- Business: Keyperson; Business overheads; Debtor's cover; Loan account protection; Buy-and-Sell Insurance - Traditional Structure; Buy-and-Sell Insurance - Alternative Structure; Buy-and-Sell Insurance - Share Buy Back; Income replacement; Contingent Liability.
- Other package tabs visible: Homeloan package, Student package, Option policy. Their downstream product screens were not traversed.

Initial identity controls: Title, Name, Surname, Identity number, Id type (RSA, Namibia, Passport), Date of birth, Gender; Applicant is also an insured life checkbox; Cancel and Ok. Tax status includes natural person, sole proprietor/partner, company/close corporation, non-taxable institution and trust beneficiary categories.

No package, tax status, gender, insured-life role or identity value should be inferred merely because the portal displays a default. No Ok/Create submission was made. Policy setup, benefits, calculation, scenario copy and report download remain documented by the older manuals but are not newly live-verified in this review.

## Fulcrum business assurance

Dashboard sections and left navigation: Clients, Needs analyses, Quotes, Reports. New offers Client (Legal Entity), Client (Natural Person), Financial Needs Analysis, Report.

Important behaviour: New on the Financial needs analyses screen automatically allocates a blank draft before a client is selected. During this review it created one unassigned draft; no client information was entered. Do not assume opening New is read-only or call it repeatedly while waiting for navigation.

Draft FNA tabs:

1. FNA details: description, broker identity fields, Next.
2. Client: Choose client; selected client tax status and identifying details.
3. Parties: Choose parties; representative life and relationship.
4. Needs: separate Start actions for Suretyship protection (Contingent Liability), Key person cover, Business continuity (Buy-and-Sell).

This is a business needs-analysis path, not the personal-risk Myriad quote form. No need, premium or client selection was fabricated; no report or application was submitted.

## Guaranteed annuities

Quotes → Proposal construction / Completed proposals.

Verified navigator order: Client → Annuity product → Annuity scenarios → Save and complete proposal. Downstream steps are disabled until a client is chosen.

Client can be searched by name/identification number, or added. Add new client requires first name(s), surname, identity type and identity number; DOB and gender were disabled while RSA-ID was selected. Email/contact number also appear. The new-client form was inspected and cancelled without saving. Product/scenario selections and completion were not traversed with a client.

## Wealth investment proposal

The quote tool is embedded in an iframe. The client list offers search and ADD CLIENT. Add Client exposes Person / Organisation choices before showing identifying fields.

Person exposes surname, first name, initials, identity type (RSA-ID / Passport / No ID or Passport), DOB, gender, email and cell phone. The screen explicitly says DOB is required for living-annuity, retirement-annuity and retirement-preservation quotes. Save client is distinct from starting a proposal. No client was saved. Product selection, allocation, fees, projection and export remain unverified.

Custom Person/Organisation controls do not appear as standard radio inputs in the inspected accessibility tree; selectors need visible-state validation rather than generic input assumptions.

## Retirement and planning calculators

AdviserConnect → Quotes & calculators → Calculators has Investment, Risk and Tax filters. Many entries are downloadable tools, not browser forms.

Income Illustrator (opened live): wealth.momentum.co.za/income-illustrator/home. Upcoming / History / New clients; New clients → New client opens:

1. Set client objectives: name/ID, DOB/gender derived from ID, investment amount, initial/ongoing adviser fees, net investment, SARS tables vs preferred tax rate, required monthly income before/after tax, yearly increase, planning age, inheritance importance, risk tolerance.
2. Build income scenarios (disabled before initial inputs).
3. Compare scenarios (disabled before initial inputs).

No initial defaults for fees, tax treatment, risk tolerance or inheritance importance were accepted as advice, and no illustration was calculated or saved.

Future Income Review (opened live): wealth.momentum.co.za/wealth/intermediary/tools/incomereviewlist. Only the shell/header rendered; its review controls were not available during inspection.

Other visible investment tools: Cash flow, Cash flow (Living Annuity), Education Builder, Financial Projections, Investment Projection Calculator, Investment Wealth Creation, Investo Medical Prefunder, Investo summary scheduler, Living Annuity, Living Annuity vs Life Annuity, New Investo Projection, Regulation 28 / Asset Exposure, Retirement Fund Contributions, Retirement Gap Forecaster.

Visible risk tools: Accrual, EPB sales illustrative tool, Life Planning, Limited Right in Estate Planning, Loan Repayment, Premium Pattern Projection. Visible tax tools: Capital Gains Impact (CGT), Capital Gains Tax, Tax on Lump Sums, Tax on Lump Sums Withdrawal. Catalogue presence is not evidence that these tools were run or their calculations validated.

## Old Mutual and remaining gaps

Only the MyOldMutual login screen was accessible, describing portfolio, rewards, wealth and unit trusts. No signed-in adviser quote catalogue was available. Do not infer that successful access to the personal portfolio site gives access to adviser quotations.

Next evidence required: correct signed-in adviser quote portal, available product catalogue, blank case/client capture, required policy and rating inputs, scenario generation/copy, premium output, PDF/report export. No automatic login or password retry was performed during this review.

## RPA implications

- Current Companion has a manual-backed Momentum Life insurance route; the newly observed catalogue instead exposes the precise Myriad card. This is a verified navigation mismatch to address before calling that route automated.
- Select Get a quote within the named card and wait for the actual launched tool, rather than choosing the first matching button or assuming an immediate tab.
- Keep life/risk, business assurance, investment, annuity and income-illustration workflows separate; their inputs and outputs differ.
- Preserve required role, tax and product decisions for the broker. Do not translate defaults into approved client choices.
- Terms/confidentiality acceptance requires the user's action-time approval. Golden Series remains stopped at that gate.
- Future Income Review and Investo rendering gaps, and Old Mutual authentication, are unresolved. No end-to-end quotation or PDF capture was proven by this navigation review.
