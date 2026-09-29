# Fintech revamp: remove every medical trace

Goal: the whole app looks and feels like a serious, professional fintech platform (think private banking / investment dashboards): navy-black, slate grey, deep blue and a restrained teal accent. No pink, no clinical visuals, no medical icons or wording.

## 1. Visual system (one place, applied everywhere)
- New palette: near-black navy for headers/sidebar, slate greys for surfaces, deep blue primary, teal as secondary accent, muted gold only for "premium"/awards. Crimson, terracotta, pink and "Maeve" colours are remapped to the new palette.
- Full dark mode to match (currently still old teal).
- Typography: Sora for headings, Manrope for body, tabular numbers for all money and figures.
- Tighter, sharper look: smaller corner radius, hairline borders, subtle shadows, denser data tables.

## 2. Remove medical imagery and icons
- Swap medical icons (stethoscope, heart pulse, pills, syringe, hospital, activity/heartbeat — about 116 files outside hidden modules) for finance equivalents (briefcase, line chart, wallet, shield, landmark, file-check).
- Replace any remaining health photos/illustrations and the old logos with the Holarc Wealth logo and a new fintech hero graphic.
- Remove leftover medical colour cues (e.g. "clinical" section colours become neutral finance section colours).

## 3. Key screens restyled
- Landing page: new hero (dark navy, portfolio/workflow dashboard visual), trust strip (FSP compliance, encryption, POPIA), features, footer.
- Sign-in, forgot/reset password pages.
- Sidebar, top bar and mobile nav: dark navy with the logo.
- Dashboards (wealth manager and client): KPI cards, "Your Wealth" / "Upcoming Reviews" styling.
- Client list, client profile, Live Workspace, Workflow Map, documents, calendar, settings.
- Documents/letterhead and emails: new logo and neutral fintech styling.

## 4. Remaining wording sweep
- Final search for medical words in visible text (e.g. two medication-alert settings, support email, copyright "Holarc Health") and replace; legal pages flagged, not rewritten.

## 5. Check
- Screenshot landing, sign-in, dashboard and client profile in light and dark mode and fix contrast issues.

## Technical details
- Tokens in `src/index.css` + `tailwind.config.ts`; hardcoded colour classes (`bg-white`, `text-blue-800`, `bg-green-50`, etc.) in shared components converted to tokens.
- Icon swaps via a small `src/lib/icons.ts` map where reused.
- Hidden healthcare modules keep their code; only styling tokens affect them.
- No database or route changes.
- Note: this is a large job and will use noticeably more credits than recent small edits; it will be done in batches (tokens -> layout/nav -> landing/auth -> dashboards/client screens -> icons sweep -> docs/emails).
