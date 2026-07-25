## Add DISC Personality Profile (doctor-only) to Patient Overview

### Feature
Derive a longitudinal DISC personality profile for each patient from the accumulating session transcripts and AI summaries, and surface it in the Patient Overview — visible only to authenticated doctors, positioned to share the row directly beneath the AI Patient Summary with the existing Allergies & Conditions block.

### Scope

**1. Storage — `patient_disc_profiles` table**
- Columns: `patient_id` (FK, unique), `dominance`, `influence`, `steadiness`, `conscientiousness` (int 0–100), `primary_trait`, `secondary_trait` (text), `dominance_rationale`, `influence_rationale`, `steadiness_rationale`, `conscientiousness_rationale` (text), `sessions_analyzed` (int), `last_session_id` (uuid), `generated_at`, `updated_at`.
- RLS: SELECT/UPDATE/INSERT only for users with `doctor` role who have active `doctor_patient_access` to the patient; service_role full access. Patient role has NO access.
- GRANT to `authenticated` + `service_role`.

**2. Edge function — `analyze-patient-disc`**
- Input: `patient_id`.
- Auth: verify caller is a doctor with access to the patient (reuse the pattern from `summarize-session`).
- Loads the patient's session transcripts + AI summaries (all sessions, capped at the most recent N to stay under token limits) and any prior stored DISC row.
- Calls Lovable AI (`google/gemini-2.5-pro`) with a strict JSON schema asking for the four DISC scores (0–100), primary/secondary traits, and one short evidence-based rationale per trait grounded in transcript excerpts.
- Upserts into `patient_disc_profiles`.

**3. Auto-refresh trigger**
- After each session's AI summary completes successfully (existing `handleSessionComplete` chain in `useSessions.ts`), enqueue a background call to `analyze-patient-disc` for that patient. Runs after all auto-documents and before/independent of Vula awarding — it must not block the session-close pipeline (fire-and-forget with error logging only).

**4. UI — `PatientOverview.tsx`**
- New component `DiscPersonalityCard` rendered ONLY when `useUserRole().isDoctor === true`.
- Layout: convert the existing "Allergies & Conditions" row (currently full width) into a 4-column grid: **col 1 = Allergies & Conditions (current content), cols 2–4 = DISC card** spanning three columns, matching the reference screenshot (header row with "Primary: X · Secondary: Y", then a 2×2 grid of D/I/S/C tiles, each with a colored progress bar, score in top-right, and rationale text).
- On mobile the DISC card stacks below allergies (single column).
- Colors reuse existing semantic tokens: D = destructive/red, I = amber, S = primary/teal, C = blue accent.
- Manual "Refresh" button on the card (doctor only) invokes the edge function; shows generated-at timestamp and `sessions_analyzed` count.
- Empty state: "Not enough sessions yet — DISC profile will generate after the next completed consultation."

**5. Translations**
- Add `patientProfile.disc.*` keys (title, primary, secondary, trait names, tile labels, refresh, empty state, generatedAt) to `src/i18n/locales/en.json`.

### Non-goals
- No patient-facing surface anywhere in the app.
- No changes to session recording flow beyond the fire-and-forget hook.
- No historical/trend chart in v1 — single current snapshot only.

### Files touched
- New migration for `patient_disc_profiles` + RLS + GRANTs.
- New `supabase/functions/analyze-patient-disc/index.ts` + `config.toml` entry.
- `src/features/patients/components/PatientOverview.tsx` — insert `DiscPersonalityCard` and re-grid the allergies row.
- New `src/features/patients/components/DiscPersonalityCard.tsx`.
- `src/hooks/useSessions.ts` — post-summary DISC refresh call.
- `src/i18n/locales/en.json` — new keys.

### Verification
- Build passes.
- As a doctor viewing a patient with ≥1 session: DISC card renders to the right of Allergies with the 2×2 tile grid.
- As a patient viewing their own record: DISC card absent; RLS blocks direct table access.
- Manual Refresh triggers the edge function and updates the tiles.