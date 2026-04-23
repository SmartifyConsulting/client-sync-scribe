

# Plan: Medication editor — quantity, units, repeats/day, in-section edit, chronic refresh, and multi-tablet AI capture

## 1. Extend `CurrentMedication` shape

In `src/hooks/usePatients.ts`, add three optional fields to the `CurrentMedication` interface:

| field | type | notes |
|---|---|---|
| `quantity` | `string` | tablets/units per dose (e.g. "1", "2") |
| `units` | `string` | defaults to `"mg"`; selectable |
| `times_per_day` | `string` | repeats/day, integer-as-string |

Stored in the existing `patients.current_medications` JSON column — no DB migration needed.

## 2. Medication add/edit form (in `PatientDetailsEditor.tsx`)

In the existing "Allergies, Medication & Conditions" accordion, replace the single free-text **Dosage** input with a structured row:

- **Quantity** — number input (default `"1"`)
- **Strength** — number input
- **Units** — small `<Select>` with options: **mg, mcg, g, ml, IU, %, drops, puffs, tablets, capsules** (default `"mg"`)
- **Times per day** — number input (default `"1"`, min `1`, max `12`)

The form keeps the existing **Status / Start date / End date / Chronic** controls. `handleAddMed` and `handleEditMed` are updated to read/write the four new fields, and the legacy `dosage` string is auto-composed for display + backwards compatibility (e.g. `"1 × 500 mg, 2× daily"`).

The medication list rows render the composed string so older entries (which only have `dosage`) still display correctly.

## 3. Inline edit buttons on every collapsible section header

`SectionHeader` currently shows only label + chevron. Add an optional `onEdit` prop and, when in view-only mode, render a small **pencil button** between the label and chevron that:

- `e.stopPropagation()`s so it doesn't toggle the collapsible
- flips the editor into edit mode and scrolls the section into view

Apply this to every collapsible: Personal Info, Contact, Address, Employment, Medical Aid, Vitals, Allergies/Medication/Conditions, Surgeries, Family History, Next of Kin, Pharmacies, Organ Donor.

The existing top-of-page **Edit** button stays; the per-section edit pencils are an additional shortcut.

## 4. Auto-promote chronic meds into the `prescriptions` table

In `PatientDetailsEditor.tsx` `handleSave`, after the patient `.update()` succeeds:

1. Diff `currentMedications` against the previous saved list.
2. For each medication where `is_chronic === true`, **upsert** a row into `prescriptions` keyed on `(patient_id, medication, doctor_id)`:
   - `medication` ← `name`
   - `dosage` ← composed `"{quantity} × {strength}{units}"`
   - `frequency` ← `"{times_per_day}× daily"`
   - `status` ← `"active"` (or `"completed"` if the medication was un-chroniced / deleted)
   - `doctor_id` ← `auth.uid()` when a practitioner edits; when the patient edits their own self-record, fall back to their primary doctor or skip with a toast.
3. When a medication is **un-chroniced** or removed, mark the matching `prescriptions` row `status = 'cancelled'`.

This sync happens once per save and uses one `upsert` + one `update` call.

## 5. Refresh every "current medications" surface

After save, invalidate the React Query caches that consume this data:

- `["chronic-prescriptions", patientId]` — Chronic Meds tab
- `["medication-adherence", patientId]` — adherence stats
- `["pill-references", patientId, …]` — baseline references
- `["patient", patientId]` — patient overview
- `["patients"]` — patient list
- `["active-prescriptions", patientId]` — Sessions prescription editor

Add a lightweight `medicationSyncBus` (a tiny `EventTarget` in `src/lib/utils.ts`) that emits `"medications-updated"` on save. `MedicationAdherenceTab`, `Sessions`, and `PatientOverview` listen and call `queryClient.invalidateQueries` so views refresh in real time across role layouts.

In `src/pages/Sessions.tsx`, convert `fetchActivePrescriptions` to a `useQuery` keyed `["active-prescriptions", patientId]` so it can be invalidated.

## 6. Multi-tablet AI capture *(new)*

When a chronic prescription's `quantity > 1`, the baseline + daily ingestion flow records **one short clip per tablet** so the AI can confirm every dose unit was actually taken.

### Capture orchestrator (in `PillBaselineCapture.tsx` + `MedicationAdherenceTab.tsx` ingestion path)

1. Read `quantity` from the prescription (fallback `1`).
2. Render a **"Tablet 1 of N"** header above the camera, with an N-segment progress bar.
3. After each clip is recorded, frames are extracted and sent to `validate-medication-video` with two new payload fields: `tabletIndex` (1-based) and `tabletTotal`.
4. The edge function returns `detectedTabletCount` (how many tablets it can see in the close-up frames). The orchestrator uses this to:
   - **Pass** — if `detectedTabletCount >= 1` and ingestion signals match the declared `intake_method`, mark this tablet as captured and prompt: *"Tablet {i} confirmed. Ready for tablet {i+1}? "* with a **Record next tablet** button.
   - **Multi-detect shortcut** — if `detectedTabletCount >= tabletTotal` in a single clip (patient took all tablets together) and ingestion signals are clear, accept the clip as covering all tablets and skip the remaining steps.
   - **Retry** — if no tablet is detected, show: *"We couldn't see a tablet. Please try again with the tablet visible before you swallow."*
5. Only after all `N` tablets are confirmed (or covered by the multi-detect shortcut) does the dose row get written. The combined `confidence_score` is the **average** across all sub-clips.

### Storage rows

A single `medication_adherence` row per dose with two new columns:
- `tablet_count_expected integer` — the prescription's `quantity` at time of capture
- `tablet_count_detected integer` — sum of `detectedTabletCount` across sub-clips, capped at expected

If `detected < expected`, status downgrades by one tier (e.g. `completed` → `provisional`) with a `reconciliation_note` explaining the shortfall.

### Edge function changes (`validate-medication-video`)

- New input fields: `tabletIndex`, `tabletTotal`, plus existing `intakeMethod`, `mode`.
- Gemini prompt extended: *"Count distinct tablets/capsules visible in the close-up frames. Return `detectedTabletCount` (integer)."*
- Response shape adds `detectedTabletCount` (integer, 0 if none).
- The four-way decision tree (`completed` / `provisional` / `failed_verification`) runs unchanged on each sub-clip; the orchestrator combines results client-side.

### UI copy

- Baseline intro updated: *"You're prescribed {N} tablets per dose — we'll record each one briefly so we can recognise them later. Your videos aren't saved."*
- Per-tablet header: **"Tablet {i} of {N}"** with the segmented progress bar.
- Between-tablet prompt: *"Tablet {i} confirmed ✓ — get the next one ready, then tap Record."*
- Multi-detect toast: *"We detected all {N} tablets in one clip — you're done."*

## 7. Display

Med list rows render:
```
Metformin · 1 × 500 mg · 2× daily   [Current] [Chronic]
```
falling back to legacy `dosage` when structured fields are absent.

## Files touched

| File | Change |
|---|---|
| `src/hooks/usePatients.ts` | Add `quantity`, `units`, `times_per_day` to `CurrentMedication`. |
| `src/components/patients/PatientDetailsEditor.tsx` | Structured med form; per-section edit pencils on every `SectionHeader`/Collapsible; chronic→prescriptions sync; query invalidation + event emit on save. |
| `src/pages/Sessions.tsx` | Convert `fetchActivePrescriptions` to React Query and listen for `medications-updated`. |
| `src/components/rewards/MedicationAdherenceTab.tsx` | Listen for `medications-updated` and invalidate `chronic-prescriptions`; orchestrate multi-tablet capture loop using prescription `quantity`. |
| `src/components/rewards/PillBaselineCapture.tsx` | Multi-tablet baseline loop with "Tablet i of N" header, segmented progress, multi-detect shortcut, between-tablet prompts. |
| `src/components/patients/PatientOverview.tsx` | Listener + invalidate. |
| `src/lib/utils.ts` | Export `medicationSyncBus` (`EventTarget`). |
| `supabase/functions/validate-medication-video/index.ts` | Accept `tabletIndex`/`tabletTotal`; return `detectedTabletCount`; extend Gemini prompt to count tablets. |
| Migration | Add `tablet_count_expected integer` and `tablet_count_detected integer` to `medication_adherence`. |

## Out of scope

- Splitting `current_medications` into its own table.
- Per-time-of-day schedule (morning/noon/evening) — `times_per_day` is a single integer for now.
- Patient-side ability to mark a med chronic from outside the doctor flow.
- Distinguishing tablet identities (e.g. red vs white pills) within the same prescription — `detectedTabletCount` is a count only.

