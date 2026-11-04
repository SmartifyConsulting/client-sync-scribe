# Compulsory insurer quote inputs — evidence checklist

Updated: 5 November 2026 (South Africa). Purpose: collect compulsory rating information before the broker requests quotes, without inventing answers or making optional fields mandatory.

## Confirmed: Old Mutual life cover

Evidence: the live OM Adviser → Standalone Quote → Protection → Anonymous/guest → OMP Life journey inspected on 4 November 2026. Asterisks identify required controls; the portal also explicitly blocked continuation for an incomplete work split and missing income. This is evidence for this product and route, not all Old Mutual products.

| Compulsory field | Condition / validation observed | Holarc today | Work needed for needs analysis / quoting |
| --- | --- | --- | --- |
| Date of birth | Required on guest personal-details screen | Exists: clients.dob | Require a saved value for this quote route; already in the client payload. |
| Gender | Required on guest personal-details screen | Exists: clients.gender | Included in the quote payload; require a saved value. |
| Smoker status | Required: Smoker / Non-Smoker | Exists: Personal Information → Smoker; clients.smoker | Require an explicit answer, not a blank; map Holarc Yes/No to the insurer's choices and exact field label. |
| Marital status | Required on insured-person details | Exists: clients.marital_status | Validate and map the insurer's allowed choices. |
| Education | Required: insurer NQF choices | Exists: Highest Level of Education; clients.highest_education, free text | Map the existing answer to an insurer education code; ask the broker if the match is ambiguous. |
| Professional membership | Required; an explicit None is a valid choice | No dedicated quote/needs field found | Add explicit None or named membership, with the insurer's supported choices. A blank must not silently mean None. |
| Occupation | Required; must resolve to an insurer occupation entry | Exists: Employer → Occupation; clients.occupation, free text | Reuse the existing answer and resolve the provider's occupation code. Free text alone is not a completed provider selection. |
| Industry | Required after the selected occupation; General was supplied by the portal | No dedicated quote/needs field found | Store/confirm the provider industry choice where this route requires it. Do not assume General for every occupation. |
| Admin work (%) | Required for the selected Programmer and Analyst occupation | No dedicated field found | Add conditionally when that insurer occupation requires a work split. |
| Physical work (%) | Required for the selected occupation | No dedicated field found | Admin + physical + travelling must total 100%; zero is a valid explicit answer. |
| Travelling (%) | Required for the selected occupation | No dedicated field found | Same 100% rule; do not infer a work split from the occupation name. |
| Gross taxable monthly income | Portal blocked the selected self-employed occupation until income was entered | Financial Information already has cash_flow.gross_income; current client quote payload does not pass financial income | Confirm that the saved amount has the insurer's required taxable/earned/monthly basis, then map it. Do not silently equate aggregate cash flow with taxable earned income. |
| Salary Payment Day | Required on Build Quote; a day of the month | No dedicated field found | Add the day, with the insurer's supported range; keep it distinct from the insurer's first-premium due date. |
| Cover amount | Required for OMP Life | Already exists: Step 4 option Benefit amount | Validate the product option before submission. Keep this in quote options, rather than adding a duplicate personal-information field. |

## Distinguish missing fields from incomplete or unmapped fields

New dedicated inputs identified: professional membership, industry (conditional), work split (conditional) and salary payment day.

Existing inputs needing completeness checks or mappings: birth date, gender, smoker status, marital status, education, occupation and gross monthly income. Self Employed also exists in Holarc, but the test selected Self-employed before continuing; we have not proved that the separate Employment type control itself is compulsory, so it is not added to the required-field checklist.

The demo's blank smoker, education and occupation fields caused additional questions even though those fields already exist in the app. Answers entered into the insurer during the walkthrough have not automatically updated the Holarc client profile.

## Confirmed: Momentum Myriad life cover

Live successful quote on 5 November 2026 established rating requirements for smoking status, education, occupation selection, gross monthly income and marital status. Married reveals spouse gross monthly income (minimum 1; zero rejected) and spouse education. The latter lacks an HTML required marker but the Benefits page explicitly blocks adding cover until it is supplied. Treat both spouse fields as conditional, not compulsory for everyone. The occupation must be selected from the insurer's autocomplete results, not merely typed.

Applicant setup also requires insurer package/tax-status and identity choices. Keep product/policy selections in quote setup. Contact details showed missing-item badges, but calculation and report generation succeeded without completing them; do not make them compulsory for this quotation route. See momentum-myriad-mapping.md for exact controls and approved demo choices.

New gaps identified here: spouse gross monthly income and spouse education, conditional on the married route. Insurer-specific education and occupation mappings remain necessary even where Holarc already stores a value.

## Other insurers — required-only evidence still to collect

| Insurer | Current evidence / next check |
| --- | --- |
| Momentum | Life-cover route verified above. Additional benefits and alternative rating branches remain unverified. |
| BrightRock | Manuals show proposal navigation and example capture. Mandatory vs optional rating fields still need live validation for each selected product. |
| Discovery | Quote-field structural checks exist; a complete successful life-cover capture has not established the compulsory field set. |
| Bidvest Life / FMI | Login route inspected; quote capture and its compulsory fields remain unverified. |

These are verification gaps, not assertions that those insurers need no further inputs. Do not run repeated password attempts to collect the evidence.

## Proposed pre-quote validation rule (not implemented by this note)

Validate only the selected insurers, selected products and applicable occupation/employment conditions. Show the broker exactly which required answers are missing, with links to the existing Personal or Financial Information field. Add new fields only where there is no equivalent. Keep provider codes/mappings alongside the broker-confirmed answer. Validate required choice values, work-split totals and income basis before sending a quote request.

Complete inputs prevent missing-information blocks; login expiry, provider outages and unsupported portal mappings still need separate handling. The existing Old Mutual automatic quote adapter is not yet mapped end to end: this checklist does not claim that collecting these fields alone enables automatic Old Mutual quotation.

## Evidence and implementation references

- Live Old Mutual walkthrough recorded in this chat, 4 November 2026: guest personal details, Build Quote, insured-person details and actual blocking notices.
- src/features/clients/components/ClientDetailsEditor.tsx — current Personal Information and Employer fields.
- src/features/wealth-workflow/map/portalPayload.ts — current client field mappings.
- src/features/wealth-workflow/map/needsProducts.ts — existing gross-income source used by needs calculations.
- docs/automation/live-quote-navigation-2026-11-03.md — earlier navigation review; its Old Mutual access limitation was superseded by the 4 November walkthrough above.
