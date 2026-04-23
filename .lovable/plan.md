

# Plan: Three-step baseline capture — Packaging → Tablet → Take it

Restructure `PillBaselineCapture` so the patient explicitly captures three artefacts, in this order, before the baseline is saved.

## New step flow

```text
intro → method → packaging → tablet → ingest → processing
```

### Step 1 — Packaging (new)
- Single still photo of the **box / blister / bottle label**.
- Camera opens rear-facing (`facingMode: "environment"`); patient taps **Capture**, then **Use photo** or **Retake**.
- Helper text: *"Hold the box or blister so the medicine name and strength are readable."*
- AI uses this to OCR the brand/strength and confirm it matches the prescription's `medication` + `dosage`. Mismatch shows a soft warning ("This looks like *Voxra 150mg* but your prescription says *Voxra 300mg* — continue anyway?").

### Step 2 — Tablet close-up (new)
- Single still photo of the **tablet(s) on a flat surface** (palm or table).
- Helper text: *"Place the tablet(s) on your palm or a plain surface and fill the frame."*
- If `quantity > 1` on the prescription, helper reads *"Show all {quantity} tablets together."*
- This replaces the "sharpest frame from first 25%" heuristic — it's now an explicit, deliberate shot, so close-up quality is consistent.

### Step 3 — Take the dose (kept, shorter)
- Front-facing video, **15 seconds** (down from 30s — the close-up is no longer derived from this clip, so we only need ingestion evidence).
- Same MediaRecorder logic as today; 5 evenly-spaced sequence frames extracted client-side, video discarded.
- AI receives the sequence to confirm hand-to-mouth motion.

## What gets stored

| Artefact | Storage path | Kept? |
|---|---|---|
| Packaging still | `pill-references/{user_id}/{rxId}-{ts}-pack.jpg` | Yes — shown next to the close-up on the Chronic Meds card |
| Tablet close-up | `pill-references/{user_id}/{rxId}-{ts}-tablet.jpg` | Yes — primary `reference_image_url` |
| Sequence frames (5) | `pill-references/{user_id}/{rxId}-{ts}-seq-{i}.jpg` | Deleted by edge fn after AI scores ingestion |
| Video blob | never uploaded | Discarded client-side |

`prescription_pill_references` gains one new column: `packaging_image_url text`. The existing `reference_image_url` keeps holding the tablet close-up.

## Edge function `validate-medication-video` (mode `baseline_capture`)

Updated payload:
```ts
{
  mode: "baseline_capture",
  packagingImageUrl,      // NEW
  closeupImageUrl,        // tablet close-up (now explicit, not extracted)
  sequenceImageUrls,      // ingestion evidence
  sequenceFilePaths,      // for cleanup
  intakeMethod,
  prescriptionId,
  expectedMedication,     // NEW: rx.medication
  expectedDosage,         // NEW: rx.dosage
  expectedQuantity,       // NEW: rx.quantity ?? 1
}
```

Returns the existing `observedDescription` + `baselinePatternSummary`, plus a new optional `packagingMatch: { ok: boolean, detectedMedication?: string, detectedStrength?: string, message?: string }`. The client surfaces `packagingMatch.message` as a non-blocking toast when `ok === false`.

## UI niceties

- Step indicator at the top of the dialog: `1 Packaging · 2 Tablet · 3 Take it` with the current step highlighted in teal.
- Each capture step has identical chrome: live preview, big shutter button, post-capture **Retake / Use** pair — so the patient learns the pattern once.
- For the multi-tablet case (`quantity > 1`), Step 2 shows a small badge above the camera: *"Show {quantity} tablets"*. This piggybacks on the structured `quantity` field already added to `CurrentMedication`.

## Files touched

| File | Change |
|---|---|
| `src/components/rewards/PillBaselineCapture.tsx` | Add `packaging` and `tablet` still-capture steps; shorten ingest video to 15s; remove the "extract sharpest early frame" heuristic; pass new payload fields. |
| `supabase/functions/validate-medication-video/index.ts` | Accept `packagingImageUrl` + expected med/dosage/quantity; OCR the packaging via Gemini Vision; return `packagingMatch`. |
| Migration | `ALTER TABLE prescription_pill_references ADD COLUMN packaging_image_url text;` |
| `src/components/rewards/MedicationAdherenceTab.tsx` | When a baseline exists, show packaging thumbnail beside tablet thumbnail on the prescription card. |

## Out of scope

- Re-validating Shannon's existing baselines — old rows just won't have a `packaging_image_url`; the UI degrades gracefully.
- Storing the ingest video for human review — still discarded client-side per the 7-day retention policy.
- Per-tablet packaging (e.g. blister vs bottle for the same drug) — one packaging shot per prescription.

