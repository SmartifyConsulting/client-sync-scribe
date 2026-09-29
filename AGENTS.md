# Agent rules
- Wealth workflow state is derived and changed only by DB functions (wealth_*); UI never writes stage directly. Why: keeps stage truthful to records and every change audited.
- Healthcare-only modules are hidden via `WEALTH_HIDDEN_MODULES` in src/lib/terminology.ts (nav filter + App route guard; admins bypass). Why: code retained, wealth users never reach it.
- User-facing wealth terminology comes from src/lib/terminology.ts; DB/route identifiers keep healthcare names. Why: copy-only transformation, no renames.
- Client-facing wealth views (client dashboard, My Future) read data only through `useClientWealth` in src/features/wealth-workflow/client. Why: one source for cover, investment, beneficiary and claim figures.
- Clients are blocked from /practice and /patients in both the sidebar and WealthRouteGuard. Why: firm screens must never reach client accounts.
