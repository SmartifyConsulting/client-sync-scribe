# Insights feature (AI layer placeholder)

This folder is the future home of the AI processing layer.

Today it exposes a thin facade (`services/insights.ts`) that forwards to existing edge functions. Tomorrow it will own:

- prompt templates
- model selection (Lovable AI Gateway)
- structured-output schemas
- caching + replay of insights
- per-patient insight history

Edge functions currently powering insights:
- `summarize-session`
- `analyze-medical-image`
- `ai-clinician-diagnosis`
- `check-medication-conflicts`
- `lookup-medical-codes`
- `summarize-patient-history`

**No live wiring in Phase 1.** The stub returns `{ data: null, error: 'not-implemented' }`.
