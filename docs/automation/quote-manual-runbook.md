# Provider quote journeys - manual-backed RPA runbook

For newer screens inspected directly in Chrome, see [Live quote navigation review](live-quote-navigation-2026-11-03.md). In particular, the current Momentum catalogue exposes a Myriad card rather than the older Life insurance entry. The live review distinguishes inspected screens from downstream steps that remain unverified.

Reviewed 3 November 2026. This is the Companion's implementation and broker-review reference. It is not a claim that every portal can already be automated end to end.

## Evidence and coverage

| Provider / application | Supplied evidence | Executable coverage | Remaining checkpoint |
| --- | --- | --- | --- |
| Momentum life insurance | Part 1, pages 2-6; screenshots and narrative | Calculator navigation, new quote, uniquely labelled approved fields, calculate, report generation, report download | Live selectors, case/policy/role-player inputs, benefit selection and occupation lookup must be verified. Investment quoting is not demonstrated. |
| BrightRock | Part 2, pages 2-5 | New cover proposal, approved native controls, calculation, Copy for alternatives | Initial fields and exact live controls remain incomplete. The illustrated export is email; sending is not automatic. Download manually when available and upload the PDF. |
| Bidvest Life / FMI | Part 2, page 6 | Existing username/password login only | No completed login or quote journey is shown. Quote automation must stop and request a walkthrough. |
| Discovery, Liberty, Old Mutual and unnamed investment platforms | Mentioned or outside supplied coverage | No quote click path authorised by these manuals | Obtain a provider-specific quote walkthrough. Existing login support is separate from quote support. |
| Xplan / Masthead | Part 3, pages 1-5 | Discovery/reference only | CRM/compliance interactions are incomplete and do not establish any investment-quote workflow. |

Sources: 2026-11-03-Phase-2-recording-part-1.pdf; 2026-11-03-Phase-2-recording-part-2.pdf; 2026-11-03-Phase-2-recording-part-3.pdf. Do not copy sample identities, amounts, passwords, OTPs or session URLs from the screenshots into automation defaults.

## Common start and completion conditions

1. Use the provider URL and authorised credentials from App Integrations. Pause for the broker's legitimate OTP/email verification when required.
2. Work against the correct client and approved fact-find. Check that Disclosure and LOA authority are complete before requesting a real-client quote.
3. Use only broker-approved scenario inputs. Case category, person/company status, policy start date, payment settings, adviser/preparer, rating selections and product choices are not inferred from screenshot examples.
4. Match a single visible control. Duplicate buttons, ambiguous product sections, occupation search results, custom controls or required missing data stop with an actionable message.
5. Scenario A/B/C are numbered per provider and retain their own inputs and saved PDFs. A pending or late PDF cannot be assigned to the next scenario.
6. Completion requires the generated PDF to be saved and acknowledged by the authorised Documents service. Portal navigation, a clicked Calculate button or a visible premium alone is not completion.
7. The broker must check client identity, provider, quote reference, cover, premiums, term and increase choices in the generated report before using it for comparisons.
8. Never accept a quote, complete/finalise an application, claim screening discounts or email a client as a side effect of collecting quotes. Preparing recommendations and delivering approved comparison documents are separate reviewed steps.

## Momentum - Part 1

| State | Action / expected result | Data and stop rule |
| --- | --- | --- |
| start | Content Calculators / Quotes & calculators | The supplied journey is life insurance, not investment/wealth quoting. |
| type | Life insurance | Confirm the quote type before entering client details. |
| launch | Get a Quote | Detect the new quote window. An unfamiliar origin requires broker verification. |
| workspace | New Quote | Start a fresh case. The screenshot also shows Create quote; no assumption is made about duplicate or substitute controls. |
| capture - client | Select the approved case category and natural-person/company status. Capture title, names, ID and email, then role players. | These choices are required from case data. Do not default everyone to Personal or Natural Person. |
| capture - policy | Policy start date, payment frequency/method, preparer and adviser; Save and Continue. | Pause if not supplied or if outstanding-item validation remains. |
| capture - rating | Smoking, education, occupation and its lookup result, marital/contact details. | A typed occupation is not proof that a required occupation-result choice was selected. Screening completion must be shown by the provider. |
| capture - benefits | Benefits and Proposals; select required benefits/variants; populate each scenario's cover, premium pattern, guarantee and cover-increase choices. Calculate. | Premium increase and benefit increase remain different fields. No universal best/medium/third settings are invented. |
| report | Generate Quote Report | Broker reviews quote totals and any required projections before export. |
| download | Download | The generic Download action is allowed only in this Momentum post-report state, as shown on Part 1 page 6. Await saved-PDF acknowledgement. |

## BrightRock - Part 2

1. Authenticate at the approved portal. If new-location verification is offered, the broker selects/enters the legitimate OTP. No OTP is logged.
2. Open the quote area and choose New cover proposal (visible on page 2). The screenshot contains more than one such control, so a live unique selector is required; do not click an arbitrary first match.
3. Choose the approved needs category, then capture who is covered and identifying details from the client record. Exact initial field order is not established by the manual.
4. In Policy details, enter the approved policy date, yearly base increase, premium increase and settlement option. Additional age-related increases are explicit scenario decisions.
5. Follow the demonstrated Finish - See the cover action only after approved input has been captured and required displayed fields are resolved; custom controls still need a live map. Preserve the distinction between asset protection/whole-life and income protection/term benefits.
6. Enter approved cover, term and payout choices. Resolve age/term validation; do not copy the sample numbers.
7. Calculate premium, then compare returned cover, premium and increases with the scenario inputs. A matching visible required field must be resolved before calculation.
8. Preserve the first saved/locked proposal. For another scenario, use Copy and change only the approved alternative parameters, then recalculate. A distinct reference/scenario identity must be reviewed.
9. The manual demonstrates email export, not a verified PDF-download click path. No email is sent automatically. A broker can retrieve the report using an approved method and upload its PDF to the corresponding scenario.

## Bidvest and missing provider journeys

Part 2 ends after username Continue while locating the password. It contains no client, benefit, Calculate or report screens for Bidvest. Part 3 adds no investment quoting screens. Do not borrow BrightRock/Momentum click paths for these apps.

For every additional provider, obtain: approved start URL; login/verification states; every screen and uniquely identifiable action; required inputs and option lists; validation/error states; scenario-copy behaviour; calculated quote/reference; export/download behaviour; and final saved-document evidence.

## Implemented alignment in Companion 1.6.2

- Recognise BrightRock's documented New cover proposal and Finish - See the cover labels and retain unique-match blocking.
- Recognise Momentum's documented Download action only after report generation.
- Apply explicitly supplied native benefit toggles; do not tick unmapped consent/application checkboxes.
- Stop on required unselected radio groups and missing/unmatched required benefit fields.
- Keep application, finalisation and email actions outside the executable click set; block automatic BrightRock exports because its demonstrated email-only flow is not an approved automated PDF path.

Tests use synthetic local portal DOMs. No real client data was submitted, no real quote was calculated, and no provider email was sent during implementation. The broker-installed Companion still requires live verification against each provider's current DOM before end-to-end success can be claimed.
