# Agent rules
- Wealth workflow state is derived and changed only by DB functions (wealth_*); UI never writes stage directly. Why: keeps stage truthful to records and every change audited.
- Healthcare-only modules are hidden via `WEALTH_HIDDEN_MODULES` in src/lib/terminology.ts (nav filter + App route guard; admins bypass). Why: code retained, wealth users never reach it.
- User-facing wealth terminology comes from src/lib/terminology.ts; DB/route identifiers keep healthcare names. Why: copy-only transformation, no renames.
- Client-facing wealth views (client dashboard, My Future) read data only through `useClientWealth` in src/features/wealth-workflow/client. Why: one source for cover, investment, beneficiary and claim figures.
- Clients are blocked from /practice and /patients in both the sidebar and WealthRouteGuard. Why: firm screens must never reach client accounts.
- Onboarding (Step 1) moves on only via `wealth_onboarding_refresh`, called by the didit-webhook/didit-session/sign-wealth-document functions; signed documents are insert-only with a SHA-256 seal. Why: KYC result and signatures must be tamper-evident and server-recorded (IP captured server-side).
- Shared page styles live in src/index.css `@layer components` (page-title, frame, tab-brand, data-table, empty-state) plus `PageHeader`; new screens use them instead of one-off sizes. Why: one consistent look across every screen.
- Wealth Manager disclosure data lives in `wealth_practice_info` (one row per Wealth Manager) and feeds the LOA via the workflow owner. Why: documents always match the saved firm profile.
- Claim status changes by clients are blocked by the `wealth_claims_status_guard` trigger. Why: only the firm sets claim outcomes.
