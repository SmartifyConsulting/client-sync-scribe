# Services

Centralised data + integration layer. **No UI, no JSX, no React imports** (except types).

- `supabase/` — typed wrappers around `supabase.from(...)` queries, one file per table/domain
- `edge/` — typed wrappers around `supabase.functions.invoke(...)` with a shared `safeInvoke()` error wrapper
- `ingestion/` — future raw-record pipeline entry point
- `logger.ts` — tiny dev-gated debug logger

Phase 1 only scaffolds the folder. Phase 2 extracts existing queries into here.
