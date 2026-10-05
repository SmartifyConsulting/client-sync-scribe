# Step 4 Quotes: AI folders, top 3 with reasons, broker review, affordability

## What already exists (checked)
- Quote list with rank, select tick and commentary per quote.
- Option A (type quotes in by hand) and Option B (indicative six-insurer estimates, ranked by cheapest premium only).
- Affordability check on selected quotes (15% of net income or available surplus), skipped for short-term cover.
- Saved quotes table holds: insurer, product, premium, cover amount, rank, selected, commentary. No cover type, no excess, no AI reason.

## What is missing and will be built
1. **Replace Option A / B** with one "Quotes received" flow. Marlin can still add a quote by hand; each quote now has a cover type and an excess.
2. **Folders by cover type**: Car, Home, Life, Disability, Severe Illness, Other. Each quote is filed into its folder (AI picks the folder from the product name; Marlin can move it). Folders show as tabs with a count.
3. **AI picks top 3 per folder** and writes a short WHY for each: cheapest premium, value of the excess, and any stand-out benefit that favours the client (for example higher cover, waiting periods, extras).
4. **Broker review**: Marlin sees the AI's three with reasons, and either clicks "Accept AI choice" or ticks different quotes. His choice and whether he followed the AI are recorded in the Activity Log.
5. **Affordability check** runs on Marlin's final choices (existing rule kept), then the ROA step unlocks as today.
6. Client view unchanged: still "Marlin is preparing your financial plan".

## Confirmed
- Affordability rule stays: 15% of net income or available surplus.

## Technical details
- Migration: add `cover_type`, `excess`, `ai_rank`, `ai_reason`, `broker_overridden` to `wealth_quotes` (existing RLS and audit trigger cover them).
- New edge function `rank-quotes` (Lovable AI, WM only): classifies cover type and returns top 3 + reasons per folder via structured output; writes `ai_rank`/`ai_reason`.
- `QuotesPanel.tsx`: folder tabs, AI picks card, accept/override; remove Option A/B blocks. `groups.ts` step label becomes "Quotes received, AI ranks top 3".
- Test only with Georgia Demo / demo clients; no external insurer contact.
