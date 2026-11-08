# Insurer application field mapping

8 November 2026. This is a draft-preparation mapping. No insurer submission, client consent, signatures or payment authorisations are automated by this specification. No portal selector should be enabled from public form evidence alone.

## How to choose the application

Start from the current signed Record of Advice and the exact insurer quote revisions the client accepted. Build one draft per insurer policy or quote case. A quote may contain several selected benefits, so group by the insurer case reference, and preserve every accepted benefit within that case. An option letter, ranking or insurer name is insufficient to identify the case. Alternatives and planning estimates are excluded. If Holarc's current selections disagree with the signed ROA or the insurer quote PDF, show the discrepancy for the broker to resolve.

Demo Georgia's selected case is Bidvest Life / FMI W3901651, Whole of Life, R1,700,000, R783.25 monthly including the policy fee, Level Premium and 5% annual benefit increase. The Momentum and Discovery files are alternatives on this record. Keep all demo records separate from production insurer applications.

## Shared field mapping

| Insurer application field | Holarc source | Preparation rule |
| --- | --- | --- |
| Applicant, policy owner and insured life | Personal Information and insurer quote role players | Map each role separately. Confirm owner type and relationship, additional lives, or company/trust identity and signatory. An applicant who is also insured must be explicitly confirmed. |
| Name, identity and contact | Client record: title, first and last names, ID/passport, date of birth, gender, phone, email, physical and postal address | Split address only where structured data supports it. Confirm ID type, nationality, passport expiry, tax residence and citizenship if requested. Keep blank when absent. |
| Adviser, brokerage and FSP | My Practice and insurer adviser profile | Use the insurer's registered adviser code and brokerage code where required. A licence number does not identify an insurer adviser code. Confirm commission and remuneration separately. |
| Product, benefit, amount, monthly premium and option terms | Accepted ROA, official quote reference and original quote PDF. Existing Holarc quote mapping supplies benefit and option fields | Prefer the insurer's existing quote-to-application continuation. Reconcile each benefit, start date, premium including fees, payment frequency, escalation, term, guarantees and add-ons with the accepted evidence. |
| Employment and income | Employer and occupation in Personal Information, Financial Information, Requirements Analysis and provider-specific quote inputs | Carry across explicit employer, duties, income basis and work split only when they answer the same question. Confirm insured-life-specific income, passive income, spouse information and occupation subcategory as required. |
| Beneficiary nominations | Client Details beneficiary contacts as a starting point | Confirm nomination per policy or benefit, capacity and relationship, identity or date of birth, and percentage. Do not infer allocations from family relationships or emergency contacts. |
| Current and concurrent cover | Portfolio and confirmed application declarations | Map insurer, policy reference, benefit amounts, employer cover and applications in flight separately. The broker/client confirms the replacement decision and obtains the insurer's replacement record where applicable. |
| Payer, banking and debit date | Verified bank evidence and the Step 5 debit order mandate | Confirm payer separately from owner, account type, branch, account, collection date and quoted amount. Salary day is distinct from preferred debit date. An internal mandate does not sign an insurer's mandate. |
| Identity, address and bank evidence | Documents and Step 5 compliance status | Identify the actual file and verify who it belongs to. Attach only the evidence the insurer calls for through an authorised draft workflow. A completion flag does not supply the document itself. |
| Medical, lifestyle, travel and underwriting | Explicit answers for the insured life or the insurer's private questionnaire | Quote answers are candidates only where the question and lookback period match. Never infer No, reuse fictional values or copy a client's signature into an insurer declaration. Preserve client-only questions as pending. |
| Applicant, insured life, payer and adviser acceptance | The insurer's own declarations, signature or digital acceptance | Keep separate from the Holarc ROA, Disclosure, LOA and debit order record. Preparation leaves insurer attestations to their signers. |

## Product-level preservation

| Accepted product | Fields to reconcile in the application |
| --- | --- |
| Life cover | Lump sum versus income benefit, insured life, cover amount, whole-life versus term, escalation, premium pattern, guarantee and beneficiary allocations. |
| Lump-sum disability | Amount, standalone versus accelerated, occupational definition, benefit term/cease age, growth, premium and any waiver/add-ons. |
| Severe illness | Amount, acceleration, benefit term, severity or payout structure, growth and selected top-ups or ancillary benefits. |
| Income protection | Monthly benefit, waiting period, benefit payment term/cease age, disability definition, escalation in claim where selected and permitted, income evidence and any linked benefits. |

Use the insurer's exact accepted benefit names and options. Do not add products or carry defaults from one insurer or quote variant to another. For other product types, obtain their own application evidence before enabling a mapper.

## Provider evidence and gaps

| Provider | What is mapped or observed | Still needed before portal prefilling |
| --- | --- | --- |
| Bidvest Life / FMI | The Quotes list exposes an **App Form** action per row. Match the exact quote code. Quote-side inputs and benefit variants are in [Bidvest quote mapping](bidvest-quote-mapping.md). | A blank/demo application from the matching package is needed to verify which role, banking, beneficiary, consent and underwriting fields prefill, what saves a draft, and which controls transmit data. The application was not opened on a live case. |
| Momentum Myriad | [Existing mapping](momentum-myriad-mapping.md) records the New QuotaM role players, rating details, policy options, benefits and proposal. The insurer's [beneficiary form](https://sls-fresco.momentum.co.za/files/documents/invest-and-save/beneficiary-form.pdf) distinguishes benefit-level nominations and shares. | Verify the separate application stages, payer, beneficiary, screening, document requirements and acceptance boundary in a test journey. Do not assume a quote-page label or a beneficiary servicing form is the new-business control. |
| Old Mutual Protect | [OMP Life evidence](old-mutual-omp-life-mapping.md) and [observed product options](old-mutual-product-options.md) supply rating fields and quote terms for Life, Severe Illness and Disability Income. [Front Office](https://frontoffice.oldmutual.co.za/) confirms a retail application submission facility. | Identify the current OMP application handoff and exact product-level controls in a test account. Do not assume the legacy Front Office submission route is the same as the OMP quote journey. |
| Discovery Life | The [Life Plan 3.0 application](https://www.discovery.co.za/assets/discoverycoza/financial-advisers-zone/life-insurance/application-for-the-discovery-life-plan.pdf) maps principal and additional lives, applicant/owner, employment and detailed duties, spouse, Discovery memberships and integration, payer and optional PayBack account, beneficiaries, existing and simultaneous cover by benefit, replacement and declarations. | Verify exact Adviser 360 controls and applicability for the current plan. The generic work split lacks Discovery's separate office/site supervision and light/moderate/heavy manual categories. Also confirm source of funds/wealth, insolvency, integration choices and whether a separate PayBack account is used. Do not infer these from existing profile flags. |
| BrightRock | The [underwriting questionnaire](https://forms.brightrock.co.za/full-underwriting-questionnaire) supports mapping policy purpose, occupation, travel/manual-work facts, health and other underwriting history to the intended life. [BrightRock](https://www.brightrock.co.za/media-centre/brightrock-from-zero-to-r2-1bn-in-premiums) describes paperless applications. | Obtain the current new-business form or a test portal walkthrough to map the exact applicant, benefit structure, payer, beneficiary and digital acceptance fields. The underwriting questionnaire alone does not establish those fields. |

For each unverified provider or product, the evidence needed is a blank application, a sandbox walkthrough, or redacted screenshots showing every section and conditional branch. Record required versus optional, field type and choices, dependencies, provenance, draft save behaviour, and the final submission control. Keep the action boundary explicit in the Companion implementation. The map is a preparation reference until those controls are verified.
