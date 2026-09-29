# Fintech revamp: remove every medical trace

Goal: the whole app looks like a trustworthy fintech platform, but still friendly and warm. The middle ground between an approachable app and a serious private bank: calm colours, clean lines, softly rounded shapes. No pink, no clinical visuals, no medical icons or wording.

## 1. Visual system (one place, applied everywhere)
- Palette, balanced: deep navy/ink for the sidebar and headings (serious), soft slate-grey backgrounds (calm), confident mid-blue for buttons (trust), friendly teal for positive states and highlights (warmth). Black only for text and key figures. Crimson, terracotta, pink and "Maeve" colours are remapped to the new palette.
- Full dark mode to match (currently still old teal).
- Typography: Sora for headings, Manrope for body (both friendly but crisp), tabular numbers for all money and figures.
- Shapes and lines, middle ground: medium corner rounding (about 10px on cards, 8px on buttons — not pill-shaped, not sharp), thin 1px borders instead of heavy teal frames, soft low shadows, generous spacing so it doesn't feel dense.
- Small friendly touches kept: soft tinted icon circles, gentle hover and fade-in motion, warm plain-language empty states.

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
