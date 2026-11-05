# Momentum Myriad mapping evidence

Observed 5 November 2026 in the authenticated broker portal. This records live screens, not a claim that automated quoting is complete.

## Entry and draft creation

AdviserConnect → Quotes & calculators → Quotes → **Myriad New Business and Alterations - New QuotaM** → its own Get a quote button. Scope the button to that exact catalogue card: other products have identically labelled buttons. This opens `recurring.momentum.co.za/myriadacquisitionui/quotes` in a new tab. Never persist SSO query strings.

Create quote opens New Business Quote. Fields: quote description, package, tax status, title, first name, surname, identity number/type, date of birth, gender and Applicant is also an insured life. The approved demo used Personal/Estate duty, Natural Person, Ms, applicant also insured, and the saved demo identity. RSA identity entry populated DOB; verify both rather than assuming success. Click Ok once; draft creation can show a long loading overlay. Do not resubmit while waiting.

The resulting route is `/myriadacquisitionui/edit-quote/NewBusiness/<provider-case-key>/policy`. The case key is not the displayed quote reference. Record it only for navigation continuity; never present it as the insurer quote number.

## Policy

Displayed choices include new-business special-offer discount, start date and payment frequency. The demo explicitly approved the displayed discount, monthly payments and 1 December 2026 start date. Those are demo approvals, not defaults for other clients. Never advance through Accept quote, Complete application or Finalise.

## Personal rating details

Role players → the intended insured life → Rating details.

| Field | Observed control | Verified requirement |
|---|---|---|
| Smoking within past 6 months | inputSmokingStatustrue / inputSmokingStatusfalse | Unanswered initially counted as missing |
| Education | inputEducation | Insurer choices stop at 4-year degree / Professional; demo-specific use approved for Master's Degree |
| Occupation | inputOccupation autocomplete | Explicitly choose COMPUTER PROGRAMMER; typing Program exposes Broadcasting, Computer Programmer and Systems Software Programmer. Do not accept a different highlighted choice on blur |
| Gross monthly income | inputMonthlyIncome | Required; approved demo income entered |
| Self-employed | inputSelfEmployedtrue / inputSelfEmployedfalse | Use explicit answer; wait for occupation selection before touching it |
| Marital status | inputMaritalStatus | Married reveals spouse fields |
| Spouse gross monthly income | inputSpouseMonthlyIncome | Required for this married route; minimum 1, zero rejected |
| Spouse education | inputSpouseEducation | Benefits page explicitly refuses adding benefits until supplied, although HTML does not mark the select required |

Save and continue returns to Role players. The rating badge counts missing items; verify the Benefits page has no outstanding-rating block. Contact details showed two missing items but have not yet been proven compulsory for quotation, so do not label them mandatory yet.

## Verified life-cover calculation and report

Benefits → Add benefit → Mortality benefits → **Death Benefit : Whole life** (WDLS). The generic Death Benefit row is a heading, not the product action.

| Control | Observed choices / behaviour |
|---|---|
| inputBenefitAmount | Positive cover amount; demo 1,700,000 |
| inputPremiumPattern | Level, Compulsory, LifeStage, Aggressive LifeStage. No literal Age-rated choice; never silently substitute it |
| inputGuaranteeOption | Standard, Extended, Ten-year capped |
| select#inputIncreaseOption | None; fixed cover percentage; Rand Depreciation Index; cover CPI; fixed premium percentage; premium CPI. Scope to select because the wrapper shares its ID |
| inputCoverGrowth | Revealed by fixed cover percentage; demo 6 was accepted |

Calculate produced benefit premium R822.29 with Level / Standard / fixed cover growth 6%, and a displayed guarantee term of 15 years. Save and continue persisted the benefit. Save & calculate followed by Proposal displayed **R852.29 including policy fee** (R30 fee). Zero-amount suggested benefits appeared in Benefits; the proposal summary contained only the selected death benefit.

Generate quote report produced quote **761471627110**, 13-page PDF, verified on the downloaded cover page. The optional Investo Retirement Annuity illustration was deselected because no such product was requested. English and benefit premium projections remained selected. This was an agent-operated mapping walkthrough, not a successful Companion automated run.

Spouse income and education were explicit demo answers (80,000 monthly; Matric). Both were saved before calculation. Do not use these as defaults for real clients.

The visible Download button successfully saved the report, although the browser download-event waiter timed out. Verify the actual file/result rather than clicking Download repeatedly. Authenticated Holarc filing remains a separate step and must be acknowledged before reporting completion.

## Still to verify

Other product benefit choices and conditional fields, Options B/C, unattended Companion execution, and authenticated Holarc document filing. Initial navigation or this manually operated successful quote is not complete quote automation.

## Product controls inspected 5 November 2026

Used a separate duplicate, `Holarc Demo Georgia - Product mapping test`; the original life Option A was not edited. Cancelled temporary benefit edits without saving. These are observed controls, not newly calculated quotes.

- Life WDLS: patterns Level / Compulsory / LifeStage / Aggressive LifeStage; guarantees Standard / Extended / Ten-year capped.
- Complete Critical Illness Benefit: Whole Life (HMWF): patterns Level / Compulsory / LifeStage; guarantees Standard / Extended. No Aggressive LifeStage or Ten-year capped on this product.
- Complete Income Protector: retirement ages 55 / 60 / 65 / 70 / Whole life; waiting periods 1 Month / 3 Months / 6 Months / 7 Days / 12 Months / 14 Days / 24 Months; patterns Level / Compulsory / LifeStage. Actual net income(monthly) is a required input; Calculated net income is a separate portal value and must not be substituted. No guarantee selector is shown.
- Exact life/critical increase labels: `- None -`, `Cover Increase: fixed percentage`, `Cover increase: Rand Depreciation Index`, `Cover increase: CPI rate`, `Premium Increase: fixed percentage`, `Premium increase: CPI rate`.
- Income increase labels: `- None -`, `Cover Increase: fixed percentage`, `Cover increase: CPI rate`.
- Fixed cover reveals Cover growth; fixed premium reveals Total growth. Inactive growth answers must not be sent or affect quote identity.

Frontend fields and payloads share these product definitions. They are namespaced to Momentum; no automatic translation from generic Age-rated or 2-year benefit-term values. Other critical illness and income variants exist in the catalogue but their forms have not been verified. These dropdown mappings do not establish unattended automation.
