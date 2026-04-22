

# Plan: Video baseline + monthly confidence auto-approval (revised)

## 1. Baseline = a full first-dose video, not just two photos

Replace the 3-step photo wizard with a **single guided video capture** the first time a patient opens **Take Medication** for a chronic Rx (and again whenever the prescription's medication or dosage changes).

### Capture flow in `PillBaselineCapture.tsx`

1. **Intro card** — "We'll record your first dose as a baseline. This helps us recognise your routine over time. The video is **not stored** — only a description and a snapshot of the tablet are kept."
2. **Intake method picker** (the one we agreed earlier): Swallow whole / Chew / Crush and mix / Dissolve in liquid / Gummy.
3. **Camera-guided recording** (up to 30s, same MediaRecorder pipeline as daily doses):
   - Live framing guide + brightness gate before recording starts.
   - Patient films themselves taking the dose end-to-end (showing the tablet, then ingestion).
4. **AI processing** — extract 5 evenly-spaced frames + 1 dedicated "tablet close-up" frame (the sharpest of the first 25% of frames), upload **only those frames** to storage, then call `validate-medication-video` with `mode: "baseline_capture"` + `intakeMethod`.

The video blob is **discarded client-side** as soon as the frames are uploaded — never written to storage. Same policy applies to all subsequent dose recordings (already the case today; we make this explicit in copy).

### What gets persisted (revised `prescription_pill_references` migration)

| col | type | source |
|---|---|---|
| `reference_image_url` | text | the tablet close-up frame |
| `observed_description` | text | Gemini description of the tablet |
| `intake_method` | text | patient pick |
| `baseline_pattern_summary` | text *(new)* | Gemini summary of the full ingestion sequence — e.g. "Right hand, tablet placed on tongue, sip of water, head tilt back, ~3 second swallow." Used as a textual reference for pattern recognition. |
| `medication_snapshot`, `dosage_snapshot`, timestamps | unchanged |

The `label_image_url` and `label_text_extracted` columns from the previous plan are **dropped** — no separate packaging photo. Pharmacy-relabelled bottles are common and the tablet description + ongoing pattern matching is enough.

The existing `mark_pill_reference_stale` trigger is extended to also null `intake_method` and `baseline_pattern_summary` when medication or dosage changes, forcing a fresh baseline video.

## 2. Per-dose verification = method-aware + confidence score

Every daily dose is recorded the same way as the baseline (≤30s clip, frames extracted, blob discarded). The `validate-medication-video` ingestion mode:

1. Loads the prescription's `intake_method`, `observed_description`, and `baseline_pattern_summary`.
2. Asks Gemini to compare the new frames against the baseline pattern + tablet description, with required/disqualifying signals tailored to the declared method:

   | Method | Required | Disqualifying |
   |---|---|---|
   | swallow | hand-to-mouth + swallow action | repeated chewing motion |
   | chew | hand-to-mouth + chewing + swallow | swallowed whole, no chewing |
   | crush | powder/broken tablet + spoon/liquid | whole tablet into mouth |
   | dissolve | tablet in liquid + drinking | tablet directly into mouth |
   | gummy | hand-to-mouth + chewing | none — chewing is correct |

3. Returns `{ isValid, confidence (0-100), pattern_match_score (0-100), description, disqualifying_signal }`.

### Decision tree (replaces the previous pass/fail)

| Outcome | Condition | Storage row |
|---|---|---|
| **Confirmed** | `confidence ≥ 75` AND no disqualifying signal | `status: completed`, +5 Vulas + confetti immediately |
| **Hard fail** | any disqualifying signal at high confidence | `status: failed_verification`, locked, "contact your doctor" toast |
| **Provisional** | `confidence` between 30 and 74 | `status: provisional`, **+5 Vulas awarded immediately** so the patient isn't punished, but the row is flagged for end-of-month reconciliation |
| **Too low** | `confidence < 30` | `status: failed_verification`, no Vulas |

A new `medication_adherence` column `confidence_score numeric` is added to store the value. The previous `pending_review` status is replaced by `provisional`.

## 3. Monthly auto-reconciliation — no doctor involvement

A new daily **`reconcile-adherence-monthly`** scheduled edge function (runs once per day, processes the previous calendar month on the 1st of each month, and also retroactively on demand):

- For each prescription, gather all `provisional` rows from the month being reconciled.
- Compute the **average confidence** across those rows.
- If `avg ≥ 50` → bulk-update them to `status: completed`, set `auto_approved_at = now()`, and add a `reconciliation_note` ("Auto-approved: monthly average confidence {x}% across {n} doses").
- If `avg < 50` → bulk-update them to `status: failed_verification`, no Vula clawback (Vulas were already paid; we don't punish retroactively — keeps trust intact). Add a soft notification to the patient: *"{n} doses last month couldn't be confirmed clearly. Try to film the moment you swallow next month."*

New columns on `medication_adherence`: `auto_approved_at timestamptz`, `reconciliation_note text`.

Scheduling is done via the existing pg_cron pattern in Supabase (a new migration registers the daily job pointing at the function endpoint with the service-role JWT).

## 4. Patient-visible UI

- **Chronic Meds tab** — each prescription row shows a small confidence ring next to today's dose, e.g. "Confidence 82% · Confirmed" or "Confidence 58% · Provisional, will be confirmed at month-end if your average stays above 50%."
- **Wins and Streaks tab** — new compact line under each month: "{x}/{y} doses confirmed · {avg}% average confidence." If a month was auto-approved by reconciliation, badge it: **"Auto-approved"** in muted teal.
- **Recapture banner** — when the trigger nulls the baseline, the Chronic Meds card shows: *"{medication} updated — record a new baseline video before your next dose."*

## 5. Privacy copy reinforcement

A small line under the camera in both `PillBaselineCapture` and the daily ingestion view:
> *"Your video isn't saved. We only keep a short text description and a single still of the tablet."*

This sets expectations and matches the implementation (frames-only upload, blob discarded).

## Files touched

| File | Change |
|---|---|
| Migration | `prescription_pill_references`: drop `label_image_url`/`label_text_extracted` from the previously-approved set; add `intake_method` (text) + `baseline_pattern_summary` (text). Extend `mark_pill_reference_stale` trigger to also null those two. `medication_adherence`: add `confidence_score numeric`, `auto_approved_at timestamptz`, `reconciliation_note text`; allow `status: 'provisional'`. Register a daily pg_cron job calling `reconcile-adherence-monthly`. |
| `src/components/rewards/PillBaselineCapture.tsx` | Replace 3-step wizard with: intro → intake method picker → guided video recording → frame extraction → upload frames + close-up still → call `mode: "baseline_capture"`. Discard video blob client-side. |
| `src/components/rewards/MedicationAdherenceTab.tsx` | Show confidence ring + provisional copy on each dose row; render "video not saved" privacy line; route to baseline when `intake_method`/`baseline_pattern_summary` is null; show recapture banner on staleness. |
| `src/pages/patient/MyRewards.tsx` (Wins and Streaks tab) | Per-month adherence summary line + "Auto-approved" badge when `auto_approved_at` rows exist. |
| `supabase/functions/validate-medication-video/index.ts` | `baseline_capture` mode now ingests frames from the full first-dose video, returns `observed_description` (tablet) + `baseline_pattern_summary` (sequence). Ingestion mode switches required/disqualifying signals on `intake_method`, returns `confidence`, applies the new four-way decision tree (`completed` / `provisional` / `failed_verification`). Drops the previous `pending_review` path. |
| `supabase/functions/reconcile-adherence-monthly/index.ts` *(new)* | Daily job: groups previous-month `provisional` rows per prescription, averages `confidence_score`, flips to `completed` if ≥50% else `failed_verification`; writes `auto_approved_at` and `reconciliation_note`; emits one consolidated patient notification per prescription. |
| `supabase/config.toml` | Register `reconcile-adherence-monthly` (no `verify_jwt` change needed; in-code service-role check). |
| `src/integrations/supabase/types.ts` | Auto-regenerated. |

## Out of scope

- Doctor-side dashboards for `provisional` doses (no longer needed — auto-reconciliation removes them from the doctor's plate).
- Vula clawback on failed monthly averages (intentionally not implemented — Vulas already paid stay paid).
- Storing the actual video — explicitly forbidden by this plan.
- Multi-pill regimens / weekly pillboxes.

