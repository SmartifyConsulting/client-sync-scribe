

# Plan: Reference-image pill matching, swallow check, NOK email flag, Wins/Streaks tab, Vula dialog polish

## 1. Medication AI: reference image + swallow-only verification

### 1a. Capture a baseline reference photo per prescription (one-time)

When a patient first opens a chronic prescription's **Take Medication** flow — or whenever the prescription's `medication` or `dosage` changes — they're routed to a **Pill Baseline Capture** screen before any dose recording is allowed.

**New table** `prescription_pill_references`:
| col | type |
|---|---|
| `id` | uuid pk |
| `prescription_id` | uuid → prescriptions.id (unique) |
| `patient_id` | uuid → patients.id |
| `reference_image_url` | text |
| `observed_description` | text *(AI-generated colour/shape/markings)* |
| `medication_snapshot` | text *(prescription medication at capture time)* |
| `dosage_snapshot` | text *(prescription dosage at capture time)* |
| `created_at` / `updated_at` | timestamptz |

If `medication` or `dosage` differs from the snapshot → the existing reference is treated as stale and the patient is asked to recapture before the next dose.

**Camera-guided capture UX** in a new `PillBaselineCapture.tsx`:
- Uses `getUserMedia` rear camera, `aspectRatio: 1`.
- Overlays a **circular framing guide** (~60% of viewport).
- Live quality feedback (every 500ms, lightweight checks on a downsampled canvas):
  - **Brightness** — average luma. Too dark → "Move to better light." Too bright → "Reduce glare."
  - **Sharpness** — variance of Laplacian on a centre crop. Below threshold → "Hold steady — image is blurry."
  - **Subject size** — colour-difference blob detection inside the circle vs background. Subject too small → "Move closer." Too large → "Move further away."
  - All clear → green ring + "Looks great — tap Capture."
- Disable the **Capture** button until all three checks pass for ~600ms continuous.
- After capture: show preview with **Retake** / **Use this photo** (allowed at baseline only — no dose has been logged).
- On confirm: upload JPEG (q=0.9) to `patient-media/pill-references/${user.id}/${prescriptionId}-${ts}.jpg`, then call `validate-medication-video` with `mode: "baseline_capture"` which runs Gemini once to produce `observedDescription` and stores it on the row.

### 1b. Per-dose verification — match against the reference

Replace the existing Stage-1 box requirement.

**New `mode: "pill_check"` payload**: `{ imageUrl, prescriptionId }`. The function:
1. Loads `prescription_pill_references` for that prescription.
2. If **no baseline** → returns `{ requiresBaseline: true }`. Client routes user to `PillBaselineCapture` and blocks dose recording.
3. If **stale baseline** (medication/dosage changed since snapshot) → same `requiresBaseline: true` with `reason: "Medication updated — please capture a new baseline photo."`.
4. Otherwise sends Gemini both images:
   > "Image A is the patient's reference photo of their prescribed medication. Image B is the pill they're about to take now. Are these plausibly the same pill? Compare colour, shape, size and any visible markings. Generic unmarked tablets only need to share colour and shape."
5. Returns `{ isMatch, confidence, matchReason }`.
6. **Outcomes** (client):
   - `isMatch: true` → green check, "Looks like a match — proceed." Unlocks ingestion recording.
   - `isMatch: false` → red, "This doesn't look like your usual pill. Please double-check before taking it." Allow re-capture of *this stage only*; if the patient insists after one retry, allow proceed with a `pending_review` flag.

This removes the box-photo requirement entirely; the only mandatory packaging step is the **one-time baseline** when starting (or changing) a chronic medication.

### 1c. Swallow-only — forbid chewing

Unchanged from previous plan: extend Stage-2 ingestion prompt with a `chewing_detected` criterion. If true → `isValid: false`, message: *"Chewing detected — many tablets must be swallowed whole. Please contact your doctor before chewing or crushing medication."* The dose locks per the existing one-attempt rule.

### 1d. Trigger a baseline recapture on prescription change

In `PrescriptionEditor.tsx` (or wherever active prescriptions are edited), when `medication` or `dosage` changes on an `active` chronic prescription, set `prescription_pill_references.observed_description = null` for that row (server-side via a small RPC) so the next adherence attempt forces a recapture. The patient sees a banner on the Chronic Meds tab: *"{medication} updated — capture a new reference photo before your next dose."*

## 2. Next of Kin — compulsory email + phone, notify on add only, "notified" badge

(Unchanged from previously approved plan §2.)

- New edge function `notify-next-of-kin` sends a Resend email reassuring the recipient: *"Holarc only contacts Next of Kin when the patient adds them. We will never tell you if a patient removes you."*
- `PatientDetailsEditor.tsx` NOK form: Email + Phone become required, with red asterisks; on successful new add, invoke the edge function and stamp `notified_at`.
- Both view + edit lists render a green **"Notified by email"** badge when `notified_at` is set.
- Editing or removing a NOK does **not** send any email. The Bell icon becomes a manual "Resend email" action.

## 3. My Rewards — separate "Wins and Streaks" tab

(Unchanged from previously approved plan §3.)

- Move the Milestones (Wins) and Health Streaks cards out of Overview into a new **Wins and Streaks** tab.
- Tab order: **Overview** → **Chronic Meds** *(if chronic)* → **Wins and Streaks** → **Vulas**.
- Legacy persisted tab values `milestones` / `streaks` / `history` map to `wins-streaks`.

## 4. Vula explainer dialog — rounded, line-break fix, reword

(Unchanged from previously approved plan §4.)

- `<DialogContent>` gets `rounded-2xl`.
- Headline restructured so "but always need" wraps to its own line via an explicit `<br />`.
- Section 2 text becomes exactly: **"Vulas are a simple way to start building value for the future."**

## Files touched

| File | Change |
|---|---|
| Migration | New `prescription_pill_references` table + RLS (patient self-access; doctor with active access can read) |
| `supabase/functions/validate-medication-video/index.ts` | Add `mode: "baseline_capture"` (describe + store) and rewrite `mode: "pill_check"` to compare current frame against reference image; ingestion mode adds `chewing_detected` criterion |
| `src/components/rewards/PillBaselineCapture.tsx` *(new)* | Camera-guided baseline capture with brightness / sharpness / subject-size gating |
| `src/components/rewards/MedicationAdherenceTab.tsx` | Route to `PillBaselineCapture` when no/stale reference; per-dose flow now compares against reference (no box requirement); show "update reference" banner on prescription change |
| `src/components/sessions/PrescriptionEditor.tsx` | On medication/dosage edit of an active chronic Rx, null out the reference's `observed_description` to force recapture |
| `supabase/functions/notify-next-of-kin/index.ts` *(new)* | Resend email to newly-added NOK with the "we won't tell you if removed" reassurance |
| `src/hooks/usePatients.ts` | Add `notified_at` to `NextOfKinMember` |
| `src/components/patients/PatientDetailsEditor.tsx` | Compulsory phone/email on NOK add; invoke notify function and stamp `notified_at`; green "Notified by email" badge; Bell becomes "Resend email" |
| `src/pages/patient/MyRewards.tsx` | Move Wins + Streaks back out into a dedicated "Wins and Streaks" tab |
| `src/components/rewards/VulaExplainerDialog.tsx` | `rounded-2xl` corners; `<br />` wrap fix; reword Section 2 copy |

## Out of scope
- Doctor-side UI to view/approve baseline reference photos (rows are persisted; reviewer panel is a separate task).
- Multi-pill prescriptions (combo pillboxes) — current scope is one reference per `prescription_id`.
- Auto-detecting a new pill brand/colour change without the doctor editing the prescription text — relies on prescription edits as the trigger for recapture.

