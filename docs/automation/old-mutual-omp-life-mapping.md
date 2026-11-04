# OMP Life: verified portal behaviour

Verified 5 November 2026 in OM Adviser. This is mapping evidence, not an assertion that the Companion adapter is complete.

## Route

MyOldMutual → Secure Services → OM Adviser → Standalone Quote. Existing drafts are opened by their displayed reference. New guest quotes use Create New Quote → Protection → Anonymous → personal details → OMP Life → Build Quote → Insured persons → Edit Quote.

## Input dependencies

- Guest gender is a custom option control; a text click must be followed by verification of its selected state. Date edits must be committed and reread before continuing.
- Occupation is an asynchronous autocomplete. Select the actual returned option, not just its typed text. Programmer and Analyst exposes Industry and the compulsory Admin/Physical/Travelling split. These percentages must total 100.
- Changing occupation can clear income. Set occupation and employment type before filling income; verify the final values.
- Salary Payment Day is a required number control on Build Quote.
- Required membership accepts None in the verified guest route; continuation and retained state were checked.

## Quote settings

- Premium patterns: 0% Annual Increase, 5% Annual Increase, Increase with Age.
- Cover growth dialog: 0% fixed rate, 5% fixed rate, 10% fixed rate, Inflation-linked, Currency-linked. No 6% fixed rate was offered.
- Inflation adjustments: -2%, -1%, +0%, +1%, +2%, +3%. Currency-linked subchoices remain unverified.
- Underwriting: No medical tests - only questions; Medical tests, questions or both.
- Guarantee terms: 5, 10, 15 years. Premium term: Retirement or Benefit term.
- Cashback is a separately displayed premium; include it in any reported total and do not silently change its inclusion.

## Critical ordering and verification

Selecting a top-level premium-pattern button recalculates and can reset an unsaved cover-growth change. Apply premium pattern first and wait for loading to finish. Open Scheduled yearly cover increase, select the approved option, wait for conditional controls to settle, then Save. Verify the dialog closed and the summary reflects the change. Click Recalculate and wait for completion. Reread cover amount, premium pattern, cover growth, underwriting, guarantee, premium term and cashback. A visible premium before recalculation completes is stale and must not be recorded as a matching quote.

Verified combined configuration: OMP Life, 0% Annual Increase, 5% fixed cover growth, medical tests/questions/both, five-year guarantee and Benefit term. Do not generalise this verification to other combinations or products.

## Document boundary

Generate PDF → Documents and Forms → expand insured-person section → Summary quote. Report generation can leave a stale working banner after the document exists. This mapping does not establish automatic PDF capture or successful Holarc filing. Never advance into an application or send email as part of quote calculation.

## Companion 1.7.8 live verification — 5 November 2026

Demo Georgia Option A completed from the Holarc Get quote button without manual portal edits. Provider quote 117391836: R1,700,000 cover, total R768/month including R85 cashback, with the approved 0% annual premium increase, 5% fixed cover growth, medical tests/questions, 5-year guarantee and benefit-term premiums. The authenticated frontend persisted source companion-verified in the quote spec; database readback confirmed the exact reference, settings and premium. No PDF was filed by this run; no application was submitted. B/C and other products remain unverified.

The previous run showed income visually but left Angular's currency form control pristine. Keyboard-based currency-mask entry in 1.7.8 committed the value and passed provider validation. Occupation autocomplete focus and secure-home root navigation fixes from 1.7.7 also passed in this unattended run.
