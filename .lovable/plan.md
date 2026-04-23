

# Plan: Safe, incremental refactor of Holarc Health

A full directory rewrite of a 200+ file production app would risk every existing feature (auth flows, sessions, prescriptions, invoices, document resolver — all just stabilised). Instead, this plan delivers the same goals — structure, deduplication, separation of concerns, AI-readiness — through **non-breaking, incremental moves**, all behind import re-exports so nothing breaks at runtime.

## Guiding rules

- Zero behaviour change. Every page, route, hook and component keeps its current public surface.
- Moves are done with **re-export shims** at the old paths, so existing imports keep working.
- No DB schema changes. No route changes. No removed features.
- Done in 6 small phases, each independently testable.

## Phase 1 — Establish the new structure (additive only)

Create new directories alongside the existing ones:

```text
src/
  features/
    patients/        (hooks + components + services for patient domain)
    sessions/
    documents/       (incl. invoice / prescription / certificate logic)
    rewards/
    appointments/
    admin/
    insights/        (placeholder for AI layer — empty index.ts + README)
  services/          (Supabase + edge-function wrappers, no UI)
  types/             (shared TS interfaces extracted from inline use)
  hooks/             (only truly cross-feature hooks remain here)
  utils/             (only generic helpers remain here)
  lib/               (kept for shadcn `cn` + tiny primitives)
  components/        (only generic / shared UI; ui/ untouched)
  pages/             (unchanged route entry points)
```

Nothing is deleted in this phase.

## Phase 2 — Extract a real services layer

Centralise Supabase calls currently embedded in hooks/components:

- `services/supabase/patients.ts`, `sessions.ts`, `documents.ts`, `invoices.ts`, `prescriptions.ts`, `profiles.ts`, `appointments.ts`, `rewards.ts`, `admissions.ts`.
- Each exports typed functions like `fetchPatientById`, `listPatientsForDoctor`, `createInvoiceForSession`, etc.
- `services/edge/` for edge-function callers (`summarizeSession`, `transcribeAudio`, `translateText`, `analyzeMedicalImage`, `parsePatientImport`, `narrateBriefing`, `processTodoActions`, etc.) so all `supabase.functions.invoke` calls live in one place with consistent error handling.
- Existing hooks (`useSessions`, `usePatients`, `useDocuments`, …) are refactored to **call these services** instead of inlining queries — their public API stays identical, so every page/component keeps working.

Result: API calls disappear from UI components and from the bottom half of fat hooks.

## Phase 3 — Move feature code into `features/`

Move (not rewrite) into feature folders, with re-export shims at the old paths:

- `components/patients/*` → `features/patients/components/*` + shim `components/patients/index.ts`
- `components/sessions/*` → `features/sessions/components/*`
- `components/documents/*`, `lib/fillDocumentPlaceholders.ts`, `lib/invoiceHtml.ts`, `lib/paidInvoice.ts`, `lib/resolveDocumentPreviewContent.ts`, `utils/documentExport.ts`, `utils/documentFormatting.ts` → `features/documents/`
- `components/rewards/*`, `hooks/usePatientRewards.ts` → `features/rewards/`
- `components/appointments/*` → `features/appointments/`
- `components/admissions/*`, `hooks/useHospitalAdmissions.ts` → `features/sessions/admissions/`
- `pages/admin/*` + admin components → `features/admin/`

Each move keeps a 1-line re-export at the old path so no existing import path breaks.

## Phase 4 — Standardise types

- Extract `Patient`, `Session`, `Document`, `Invoice`, `Prescription`, `Profile`, `Appointment`, `Reward` interfaces (currently inline in 30+ files) into `types/`.
- Consume `Database` types from `integrations/supabase/types.ts` (untouched — auto-generated) where appropriate.
- Remove ad-hoc `any` in service signatures.

## Phase 5 — Targeted cleanup (the "🧼" tasks)

Conservative, file-by-file:

1. **Dead code**: only remove imports/components that have **zero references** found via project search. Anything ambiguous stays.
2. **`console.log` audit**: keep `console.error` / `console.warn`. Wrap remaining debug logs in a tiny `services/logger.ts` (`logger.debug`, gated by `import.meta.env.DEV`).
3. **Naming**: only rename obvious unclear locals (no exported APIs, no component names, no route paths).
4. **Error handling**: standard wrapper `safeInvoke()` in `services/edge/` so every edge-function call returns `{ data, error }` with toast-friendly messages — adopted incrementally where each call already does ad-hoc try/catch.
5. **UI dedup**: extract repeated patterns (page header, empty-state, loading spinner, section accordion, “PAID” stamp wrapper) into `components/shared/`. Keep teal-border + form-field standards from the Style Manifest intact.
6. **Uploads isolation**: gather scattered storage-bucket logic (`patient-media`, `session-audio`, `health-photos`, `cpd-certificates`, `logos`, `avatars`) into `features/uploads/` with one `useUpload(bucket, options)` hook, while preserving the 5MB/100MB limits, signed-URL behaviour, and bucket choices already in place.

## Phase 6 — AI-readiness scaffolding (no behaviour change)

Create the empty seams the user wants, with no live wiring:

- `features/insights/` with `services/insights.ts` exposing a typed `runInsight(kind, payload)` stub that today simply forwards to existing edge functions (`summarize-session`, `analyze-medical-image`, `ai-clinician-diagnosis`, `check-medication-conflicts`, `lookup-medical-codes`, `summarize-patient-history`).
- `services/ingestion/` for future raw-record pipelines — `ingestRawRecord({ source, payload, patientId })` that today just stores in existing tables; documented as the future ingestion entry point.
- README in each new folder describing intended responsibility so future AI work has a clear home.

## What is explicitly **not** changing

- `src/integrations/supabase/client.ts` and `types.ts` (auto-generated, hands-off).
- Routes, route params, page filenames in `pages/` (App.tsx untouched).
- Database schema, RLS policies, edge functions.
- Style Manifest rules, teal borders, mobile compaction, role-based nav.
- Existing user flows (auth, signup, sessions, prescriptions, invoices, dashboard, admin).
- `components/ui/*` (shadcn primitives).
- The recent fixes: medical certificate dates, prescription preview resolver, invoice layout, PAID stamp.

## Risk mitigation

- Every phase is independently revertable from chat history.
- Every move keeps a re-export shim, so a broken import is impossible at the path level.
- No phase touches authentication, RLS, or Supabase config.

## Suggested execution order (one phase per chat turn)

1. Phase 1 — create folders + READMEs + `insights/` seam.
2. Phase 2 — services layer extraction (highest leverage, biggest win).
3. Phase 3 — move features (mechanical, large diff but low risk via shims).
4. Phase 4 — extract shared types.
5. Phase 5 — cleanup (dead code, logger, error wrapper, UI dedup, uploads hook).
6. Phase 6 — AI/ingestion scaffolding.

Reply with which phase to start, or "start with Phase 1" to proceed top-to-bottom.

