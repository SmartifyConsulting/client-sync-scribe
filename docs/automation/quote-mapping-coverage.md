# Quote automation POC coverage

Updated 5 November 2026. Current priority: Old Mutual and Momentum for Demo Georgia.

An option is verified only after a live run confirms the selected inputs, insurer reference, premium, and saved document. Navigation or a unit test alone is not end-to-end verification. Never infer an insurer's product equivalence from generic Holarc labels.

| Insurer | Life cover A / B / C | Lump sum disability A / B / C | Severe illness A / B / C | Income protection A / B / C |
|---|---|---|---|---|
| Old Mutual | A manually calculated; guest calculation adapter awaiting live test. B/C not verified | Not mapped | Not mapped | Not mapped |
| Momentum | Catalogue and Myriad entry observed; full capture and export not verified | Not mapped | Not mapped | Not mapped |
| Discovery | Login and structural field checks only | Not mapped | Not mapped | Not mapped |
| Bidvest Life / FMI | Login only; quote route not mapped | Not mapped | Not mapped | Not mapped |
| BrightRock | Manual-backed proposal navigation; no complete live calculation/export | Not mapped | Not mapped | Not mapped |

## Old Mutual scope in Companion 1.7.6

The first guest driver is restricted to OMP Life, self-employed Programmer and Analyst, General industry, explicit None membership, and fixed growth. It requires all supplied rating answers, refuses existing drafts at start, verifies a newly created quote identity, and rechecks rating/benefit values. It returns a calculation result separately from a saved PDF. It never advances into an application or sends email. It pauses the remaining batch after calculation until the document process is resolved.

The live manual test is not proof that this adapter has run successfully. The blob-based PDF route is not a verified automatic filing mechanism. No workaround for a tool-denied PDF access is implemented.

## Completion evidence required per provider/product/option

1. Actual offered product and allowed option choices, including conditional fields.
2. All compulsory rating inputs and validation rules, without guessed answers.
3. Unique controls for navigation and capture; asynchronous dependencies verified.
4. Exact post-calculation values, real insurer quote reference and premium breakdown.
5. Authenticated PDF save in the correct Holarc workflow and correct option.
6. Interruption, stop, expired-session and changed-settings tests without duplicate submission.

Do not mark B/C verified because A succeeds. Obtain approved insurer-specific choices where generic Holarc choices have no exact equivalent. POC remains focused on the two insurers with working credentials.
