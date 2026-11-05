# Old Mutual product choices observed 5 November 2026

These are portal observations, not inferred translations of Holarc's generic labels.

## OMP Life

- Premium increases: 0% Annual Increase; 5% Annual Increase; Increase with Age.
- Cover increases: 0% fixed rate; 5% fixed rate; 10% fixed rate; Inflation-linked; Currency-linked.
- Inflation adjustments: Inflation -2%, -1%, +0%, +1%, +2%, +3%.
- Currency choices: Rand/GB Pound +%; Rand/US Dollar +%; Rand/Euro +%. Further conditional controls have not been verified.
- Underwriting: No medical tests - only questions; Medical tests, questions or both.
- Guarantee: 5, 10, 15 years. Premium term: Retirement; Benefit term.
- Inflation control: `selectInflationLinkedOptionModal`; saved display normalises to `Inflation-linked Inflation -1%` for the tested choice.

Demo Georgia B completed unattended with Companion 1.7.8: quote 117397255, cover R1,700,000, 5% premium increase, 10% fixed cover increase, five-year guarantee, benefit-term premiums, medical underwriting, R549/month including R61 cashback. Result persisted as companion-verified. PDF generation requested but not filed.

Demo Georgia C was manually verified in the portal: quote 117397336, R1,700,000, Increase with Age, Inflation-linked Inflation -1%, five-year guarantee, benefit-term premiums, medical underwriting, R410/month including R46 cashback. Reference and portal-verified result persisted in Holarc. PDF generation requested but not filed. This does not prove the Companion's inflation route.

## OMP Severe Illness

Observed in separate draft 117397433 (not a final B/C result):

- Cover R2,050,000 was accepted.
- Underwriting: Medical tests, questions or both (only choice).
- Benefit term: Whole-life.
- Premium increases: 0% Annual Increase; 5% Annual Increase; Increase with Age.
- Guarantee: 5 years; 10 years (no 15-year choice).
- Premium term: Retirement; Benefit term.
- Initial cover increase: Inflation-linked Inflation +0%; other growth choices need product-specific verification.
- Optional unchecked add-ons on Build Quote: Cashback, For Women Benefit, Child Illness Benefit, Top-up Benefit, Returning Illness Benefit, Mild Illness Benefit; premium protection has a separate action.
- The default calculation was R1,720/month at 5% annual premium increase, before approved B/C insurer-specific choices. Do not file it as a completed requested option.

## OMP Disability Income

Observed in separate mapping draft 117397635, not a final B/C result: R19,000 monthly benefit, seven-day waiting period, same approved rating facts.

- Waiting periods: 7 days; 1, 3, 6, 12, 24 months.
- Cover increases: 0% fixed rate; 5% fixed rate; Inflation-linked. No 10% or currency-linked choice.
- Guarantee: 1 year; 5 years. Premium term: Benefit term only.
- Underwriting: No medical tests - only questions; Medical tests, questions or both.
- Premium increases: 0% Annual Increase; 5% Annual Increase; Increase with Age.
- Benefit term displays 19 years for this demo; no editable two-year term was observed. User decision requested before treating it as a requested option.
- Optional add-ons: Cashback, Income Extender Benefit, Sickness Benefit, Family Support Benefit. All initially unchecked.
- The initial calculation R822/month uses insurer defaults and is not a completed B/C result.

Life and Severe Illness currency-linked controls were both checked: USD and Euro allow +0%, +5%, +10%, or their respective inflation; GBP allows +0%, +5%, +10%, or UK Inflation. UI fields are conditional on Currency-linked. No currency-linked calculation has been verified.

## Other observed products

Disability category: OMP Disability Income; OMP Disability; OMP Functional Impairment Inc; OMP Functional Impairment; OMP Physical Impairment; OMP Accidental Dth or Disb; OMP Business Expenses.

Do not map Extended/Core, Comprehensive/Standard or Age-rated to these products without checking the actual product controls. Preserve legacy values separately until explicit insurer choices are selected.
