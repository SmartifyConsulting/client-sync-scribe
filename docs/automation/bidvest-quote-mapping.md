# Bidvest Individual quote mapping

Observed 5 November 2026 in the authenticated adviser portal and current quote package. Mapping is incomplete; no new quote has been calculated or saved.

## Entry

Adviser portal `https://adviser.fmi.co.za/` → Quotes opens the secure FMI quote package in a new tab. Use the displayed link; do not persist its session query. Choose **Quote for a NEW client**, not an existing real client's quote or Application.

## Step 1: Client details

Observed fields: quote description, title, first name, surname, occupation search, bipolar mood disorder question, employment type, personal/business assurance need, date of birth, gender, commencement date, qualification, smoking/nicotine within the last six months, before-tax monthly income, after-tax monthly income, optional spouse before-tax income. Age next birthday, occupation class and rating category are also shown; editability/derivation and mandatory status still need verification.

- Employment: Salaried / Self-employed / Commission earner / Independent contractor / Secondary occupation.
- Need: Personal need / Buy and sell / Contingent liability / Key person / Bond Cover.
- Gender: Female / Male.
- Qualification: No Matric / Matric / Diploma (3 years or less) / B-Tech/4yr diploma/Adv diploma / 3yr degree / 4yr + degree.
- Smoking/nicotine: No / Yes.
- Bipolar mood disorder: No / Yes; page defaults No, which is not consent or evidence of an answer. Obtain an explicit fictional test answer before progressing.
- Optional Medical Second Opinion Family Benefit checkbox: R10/month, leave unchecked unless requested.
- Adviser details include commission, upfront commission, as-and-when percentages, and Upfront Monthly / Upfront Annualised structure. Do not alter remuneration choices without authority.

## Confirmed entry behaviour

Occupation autocomplete requires clicking the suggestion's inner anchor, not its menuitem container. Verify the selected record before continuing. Dependent AJAX refreshes can clear employment choices: wait for the occupation refresh before employment, then for employment questions before answering. Dismiss the old `Oops, not quite done yet!` validation overlay with X before retrying DONE; otherwise subsequent clicks may not reach the underlying controls.

Portal validation explicitly required occupation, employment and after-tax monthly income. Self-employed reveals hours/week (35 Hours or more / 21 to 34 hours / 16 to 20 hours / 15 hours or less) and weeks not worked in the past two years (13 weeks or less / 14 weeks to 26 weeks / 27 weeks to 52 weeks / 53 weeks or more). Work driving excludes commuting: None / less than 1.5 / 1.5 to 3 / 3 to 4.5 / 4.5 to 6 / 6 or more. These and the explicit health/nicotine questions must be captured in Holarc before automation; that client-input UI is still pending.

Georgia authorised arbitrary fictional demo values and explicitly No for bipolar mood disorder. No real-client defaults may be inferred from these answers.

## Observed cover controls

All annual benefit increases: 0% / 3% / 5% / 7.5% / 10% / CPI.

- TIP: 7/14/30/90-day cover rows, benefit terms 3/6/12/24 months, cease ages 55/60/65/70/75, claim escalation No/Yes, premium patterns 5% Compulsory Increase / Age Rated / Level Premium. Optional CI Income, Future Cover Protector, Waiver of Premium, Spouse Protector.
- EIP: cease 70 / Whole of Life; same three patterns and increases; commutation No / Standard / Plus; waiting period appears as a textbox with dependencies still unverified. Excluded from the first frontend mapping until those are verified.
- Life Lump Sum: Term Life Cover (cease 55/60/65/70) and Whole of Life Cover; patterns include Age Rated Plus in addition to the three above. Life Income is a separate beneficiary-based product, not mapped to lump-sum cover.
- CILS: Standalone/Accelerated rows; cease 65/70/Whole of Life; Top-Up and Extender Yes/No; three premium patterns. CI Income requires TIP and must not be treated as standalone critical illness.
- DLS: Standalone/Accelerated; cease 55/60/65/70/Whole of Life; four patterns including Age Rated Plus; Comprehensive/Occupational definition.

No application action used. Cover dropdown observation is not unattended automation or calculation proof. PDF workflow remains unverified.
