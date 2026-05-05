## Goals

Six fixes/improvements to the medication adherence + Vula rewards flow.

---

### 1. Multi-tablet capture (e.g. 2 capsules per dose)

**Problem**: Daily-take flow only captures one pill image; no count check.

**Plan**
- Pull `quantity_per_dose` from `prescriptions` (add column if missing: `quantity_per_dose int default 1`). Fall back to parsing dosage strings like "2 tablets" / "two capsules".
- In `MedicationAdherenceTab.tsx`'s pill-check stage:
  - Show banner "Show all N tablets in frame".
  - Pass `expectedQuantity` to `validate-medication-video` (`pill_check` mode).
  - If AI detects fewer than expected, show "We saw 1 of 2 — please show all tablets" with a Retake button.
- Allow user to capture multiple stills sequentially (Add another pill → keeps stage open until count met) as a fallback when single frame can't fit them all.
- Edge function (`validate-medication-video`): extend `pill_check` and ingestion validation to count tablets and require `observedCount >= expectedQuantity`.
- `PillBaselineCapture.tsx` already accepts `quantity` — wire it from prescription record so baseline captures all expected tablets too.

### 2. Mirror the selfie preview

**Problem**: Front-camera preview is not mirrored, hard to align.

**Plan**
- Add a real `.mirror { transform: scaleX(-1); }` utility in `src/index.css` (currently the class is referenced but undefined).
- Apply `mirror` to the live `<video>` (front-camera only) in:
  - `MedicationAdherenceTab.tsx` (already references the class — just needs CSS).
  - `PillBaselineCapture.tsx` ingest step (`facing === "user"`).
  - `ActivityProofCapture.tsx`.
- Recorded playback `<video>` stays unmirrored so it shows the true recording.

### 3. Baseline pill markings requirement

**Problem**: Baseline tablet photo doesn't enforce showing imprint/score lines.

**Plan**
- Update tablet step copy in `PillBaselineCapture.tsx`: "Turn the tablet so any printed letters, numbers, or score lines are clearly visible."
- Add a "Markings visible?" inline AI check after capture: call `validate-medication-video` with new `mode: "baseline_tablet_check"` that returns `{ markingsVisible: boolean, suggestion: string }`. If false and the tablet is a type that normally has imprints (non-gummy, non-dissolve), prompt "We can't see any markings — flip the tablet and retake" with Retake / Use anyway buttons.
- Edge function: new branch returning the marking assessment via Gemini Pro vision.

### 4. Swallow-action verification

**Problem**: Ingestion check sometimes accepts videos with no swallow.

**Plan**
- Edge function `validate-medication-video` already encodes per-method requirements; tighten the `swallow` rule so the response must include `swallowDetected: true` (jaw/throat movement OR mouth-closes-then-relaxes across at least 2 frames). For methods that require swallowing (`swallow`, `crush`, `dissolve`), reject with `validation.isValid = false` and `reason: "We couldn't see the swallow — please retake."` when not detected.
- For `chew`, require `chewingDetected` plus `swallowDetected`.
- Surface the reason cleanly in the UI toast.

### 5. Video replay broken

**Root cause**: We record `video/webm`, which Safari/iOS cannot play back. Also `URL.createObjectURL(recordedBlob)` is called in JSX without revocation, and on iOS the blob URL is rejected with `NotSupportedError`.

**Plan**
- Pick a supported `mimeType` at runtime via `MediaRecorder.isTypeSupported`, preferring `video/mp4;codecs=avc1` then `video/webm;codecs=vp9` then `video/webm`.
- Store the chosen mime in state and reuse it for both the `Blob` and the playback `<video src>`.
- Memoise the object URL with `useEffect` and revoke on unmount/replace, instead of recreating on every render.
- Apply in both `MedicationAdherenceTab.tsx` and `PillBaselineCapture.tsx`.
- Add `playsInline controls` to playback element (already there) and handle `onError` with a friendly fallback.

### 6. Prompt to activate the Vula partner / retailer API

**Problem**: Tapping the Vula logo shows the explainer; user wants to see retailers where vouchers can be redeemed. Currently `moola_partner_apps` table is empty and no integration is configured.

**Plan**
- In `VulaExplainerDialog.tsx` change CTA label to "See where I can use my Vulas" and route to `/patient/rewards#partners`.
- In `MyRewards.tsx`, when `partnerApps.length === 0`, show a setup card: "Activate the Vula rewards network to see all retailers where vouchers can be redeemed" with an **Activate now** button.
- Activation flow: shows a dialog explaining we need a `MOOLA_PARTNER_API_KEY` (or chosen partner). Clicking Continue triggers the secret-add tool so the user can paste the key. Once stored, a new edge function `sync-moola-partner-apps` is invoked to populate `moola_partner_apps` and the section refreshes.
- Add the edge function `sync-moola-partner-apps` (server-side fetch of the partner catalogue + upsert into `moola_partner_apps`).
- Until the user supplies the key, gracefully fall back to "No retailers connected yet".

---

## Technical / file summary

- **DB migration**: `prescriptions.quantity_per_dose int default 1`.
- **Edge function changes**: `validate-medication-video` — new `baseline_tablet_check` mode; tighter swallow/chew detection; `expectedQuantity` enforcement.
- **New edge function**: `sync-moola-partner-apps`.
- **CSS**: add `.mirror` utility in `src/index.css`.
- **React components**:
  - `MedicationAdherenceTab.tsx` — multi-tablet pill check, mirror, replay fix, swallow reason surfacing.
  - `PillBaselineCapture.tsx` — markings prompt + AI check, mirror on ingest, replay fix, multi-tablet wording.
  - `ActivityProofCapture.tsx` — mirror.
  - `VulaExplainerDialog.tsx` — CTA copy + route.
  - `MyRewards.tsx` — empty-state activation card + dialog wired to secret + sync.
- **Secret**: request `MOOLA_PARTNER_API_KEY` only when user clicks Activate.
