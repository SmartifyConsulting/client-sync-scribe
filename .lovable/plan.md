# Biolog: Ageing Trajectory & Biological Age (+ conditional My Shifts)

## 1. My Shifts visibility for doctors

"My Shifts" currently sits unconditionally in the doctor sidebar under My Holarprac. It will only render when the signed-in doctor has an active hospital affiliation (checked against the existing doctor/hospital affiliation records). Nurses and hospital staff keep it as-is.

## 2. New "Ageing" tab in Biolog

The existing Biolog tabs (Today, History, Insights, Programmes, Customise) stay exactly as they are and keep working. One new tab, **Ageing**, is added at the end (before Customise), rendered in both the standalone `/biolog` page and the patient-profile Biolog panel, using the same teal pill tab styling.

The Ageing tab is composed of these blocks, in this order:

1. **Your Ageing Trajectory** — header row with Chronological age (from date of birth), Biological age, Ageing pace. Each label has a small info tooltip with the wording supplied in the brief. Missing values show "Not yet available" plus an "Add biological-age assessment" action.
2. **Biological Age card** — large number and a dynamic caption: "X years younger than chronological age" / "X years above chronological age" / "Aligned with chronological age", plus "Based on your most recent biological-age assessment."
3. **Ageing Pace card** — value with interpretation ("Slower than / Around / Faster than the reference pace") driven by configurable thresholds, not hard-coded in the component.
4. **Since your last assessment** — biological age change, pace change, and interval between assessments, computed from the two most recent records.
5. **Ageing Trajectory chart** — biological age vs chronological age over time, with 6 months / 1 year / 3 years / All time ranges, built with the chart library already used in Biolog Insights. Elegant empty state when fewer than two assessments exist.
6. **What's changing alongside your ageing trajectory?** — two groups, "Potentially positive patterns" and "Areas to watch", derived by comparing existing Biolog daily data (exercise, sleep consistency, mood, stress, medication adherence, weight) across the interval between the last two assessments. Strictly associative language ("associated with", "coincided with"). Nothing renders unless there is enough data.
7. **Your Ageing Story** — AI narrative summary generated from the patient's real assessment and Biolog data, with an explicit non-causation statement. Shows "Not enough data yet" instead of inventing insight.
8. **DNA Methylation** — subtitle "A molecular view of ageing", the explanatory paragraph, list of stored methylation assessments, and an "Add DNA methylation assessment" dialog capturing: test date, laboratory/provider, test name, biological age result, ageing pace (optional), model/algorithm (DunedinPACE, DNAmGrimAge, DNAmPhenoAge, Horvath, Other validated provider), sample type, reference population, source, notes and a private report upload. Empty state as specified.
9. **Biological Assessments** — table of all assessments: date, biological age, chronological age, difference, pace, type, provider, data-quality badge.
10. **Healthspan** — "How well are you ageing?" multidimensional read across physical function, metabolic health, sleep, mental wellbeing, activity, nutrition, adherence, symptoms, biomarkers and biological-age trend, resolving to a configurable trajectory state: Improving / Stable / Needs attention. No invented precision score.

**Data quality** badges (High / Moderate / Limited) appear on each result, with reasons (single assessment, long interval, mixed models/labs). Where the model or provider changes between assessments, the chart and table mark the transition and avoid presenting the values as directly equivalent.

**No mortality language anywhere**: no predicted lifespan, years remaining, or death date.

## 3. Clinician view

On the patient profile's Biolog panel (read-only for the care team) the Ageing tab renders a condensed "Ageing Profile" card first — chronological/biological age, pace, trend, latest methylation date, key longitudinal observations — with the full patient view expandable underneath. Clinicians cannot add or edit a patient's assessments unless they are an authorised practitioner for that patient.

## 4. Empty states

- No biological-age data: trajectory header shows "Not yet available" with the add CTA.
- One assessment only: "Your trajectory is just beginning".
- No methylation record: "Not measured yet." with add button.
- Thin daily data: "More data will strengthen your insights".

## Technical notes

- **Migration** (single migration, with GRANTs then RLS then policies):
  - `biolog_biological_age_assessments` — `patient_user_id`, `assessment_date`, `chronological_age`, `biological_age`, `ageing_pace`, `assessment_type` (`dna_methylation` | `clinical` | `other`), `model_name`, `provider_name`, `laboratory_name`, `sample_type`, `reference_population`, `source`, `report_path`, `notes`, timestamps + updated_at trigger. `age_difference` as a generated column.
  - `biolog_ageing_insights` — `patient_user_id`, `assessment_id`, `insight_type`, `title`, `description`, `evidence` (jsonb), `confidence`, `generated_at`, `status`.
  - `biolog_ageing_config` — single-row configurable thresholds for pace bands and healthspan trajectory rules, admin-writable, readable by authenticated users.
  - No trajectory table: the trajectory is derived from the assessments rows.
  - RLS mirrors the existing Biolog model (`biolog_can_view`): owner full access; practitioners with active or historical patient access read-only; admins per existing rules.
  - New **private** storage bucket `biolog-ageing-reports` with owner/authorised-clinician policies and signed-URL access only — never public URLs.
- **No biological-age calculation is performed by the app.** Values are stored exactly as supplied by the testing provider; the `model_name`/`provider_name` fields record the methodology. A service boundary is left in place for future validated epigenetic-age integrations.
- **New code**, all additive under `src/features/biolog/ageing/`: `useAgeing.ts` (queries/mutations), `ageingMath.ts` (deltas, pace banding, data-quality scoring — pure and unit-testable), `AgeingTab.tsx` plus card/chart/table/dialog components, reusing existing shadcn cards, tooltips, `SectionAccordion`, recharts wrappers and existing colour tokens.
- **AI**: new edge function `biolog-ageing-insights` following the pattern of `biolog-suggest-correlations` (Lovable AI, `google/gemini-2.5-flash`, JSON output), fed real assessment + daily entry aggregates, with a prompt that forbids causal and lifespan claims and returns nothing when data is insufficient.
- `Biolog.tsx` and `BiologPanel.tsx` gain the one extra tab; no existing tab, hook, table or component is modified beyond adding the tab entry.
- Sidebar change is limited to a conditional filter in `Sidebar.tsx` backed by a small affiliation query hook.
