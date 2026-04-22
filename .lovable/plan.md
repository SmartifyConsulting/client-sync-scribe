

# How verification works today + proposed two-step flow with confetti

## How the current verification works

When a patient taps **Take Medication**, the camera opens for up to 30 seconds. After they stop (or 30s elapses), the client extracts **5 evenly-spaced JPEG frames** (at 10%, 30%, 50%, 70%, 90% of the clip), uploads them to storage, and sends the URLs to the `validate-medication-video` edge function.

That function asks Gemini Vision to check **all of these criteria across the sequence**:

1. **Person visible** — same person across frames
2. **Medication visible** — pill / tablet / capsule / liquid shown in early frames
3. **Ingestion action** — placed into mouth in middle frames
4. **Completion** — open/empty mouth in final frames

Gemini returns a JSON verdict (`isValid`, `confidence`, `description`, `medication_detected`, `ingestion_detected`, etc.). Only if **all four** pass does the row flip to `completed` and +5 Vulas are awarded.

**What it does *not* do today:** it doesn't check that the pill matches the *prescribed* medication — only that *some* medication-shaped object is visible. A patient could film themselves taking a sweet and (if shaped right) it might pass.

## Proposed: two-stage verification with explicit pill match + celebration

### Stage 1 — "Show me the pill"

Before recording, show a **pill capture screen**:
- Patient holds the pill up to the camera and taps **Capture pill**.
- A single still is sent to a new lightweight call (`validate-medication-video` extended with a `mode: "pill_check"` branch) that asks Gemini:
  > "Is a tablet/capsule/liquid medicine clearly visible in this image? If so, describe its colour, shape, and any visible markings or text."
- The function compares the description to the prescription's `medication` (and `dosage` if shape/colour hints exist) using a second Gemini call:
  > "Prescription: {medication, dosage}. Observed pill description: {…}. Could these plausibly be the same medication? Reply isMatch true/false with a one-sentence reason."
- **Outcomes:**
  - **Match** → green check, "Looks right — proceed to take it." Unlocks Stage 2.
  - **Uncertain** (no clear markings, generic white tablet, etc.) → yellow note: "Couldn't confirm the exact pill, but a tablet is visible — proceeding." Still unlocks Stage 2 (we don't want to block legitimate doses for generics).
  - **No pill detected** → red, "We couldn't see a pill. Hold it closer and try again." Allow re-capture of *this stage only* (pill check, not the ingestion clip — overdose safety preserved because no dose has been logged yet).

### Stage 2 — "Now take it"

- Camera switches to record mode, 30s clip (existing flow).
- Frames extracted and validated against criteria 1, 3, 4 (person, ingestion, completion). Criterion 2 (medication visible) is downgraded — Stage 1 already confirmed the pill, so we don't re-fail people who quickly pop it in.
- Submit button locks the dose after one attempt (existing overdose-safety rule, unchanged).

### Stage 3 — "Great job!" celebration

On a successful `isValid: true` response:
- Replace the current toast with a **full-dialog success state**:
  - 🎉 **Confetti animation** using `canvas-confetti` (lightweight, 5KB) firing for ~2 seconds from the centre.
  - Big green check icon with a gentle scale-in.
  - Headline: **"Great job!"** (gradient blue→teal text matching the Vula brand).
  - Subline: "+5 Vulas earned · {streak}-day streak"
  - Auto-close after 3s, or **Done** button.
- The fallback path ("recorded for review") gets a softer success — same confetti is **not** fired, neutral toast remains.
- The failure path ("verification failed") stays as-is — no celebration.

## Files touched

| File | Change |
|---|---|
| `src/components/rewards/MedicationAdherenceTab.tsx` | Add Stage 1 pill-capture UI before recording; add `pillCheckResult` state; gate the **Start recording** button on Stage 1 pass; replace success toast with a confetti success dialog |
| `supabase/functions/validate-medication-video/index.ts` | Add `mode: "pill_check"` branch that takes a single image + prescription medication string and returns `{ isPillVisible, observedDescription, isMatch, matchReason }` via two Gemini calls |
| `package.json` | Add `canvas-confetti` (~5KB) and `@types/canvas-confetti` |
| `src/components/rewards/SuccessCelebration.tsx` (new) | Reusable confetti + "Great job!" dialog content, takes `vulasEarned` and `streak` props |

## Decisions to confirm

1. **Pill-match strictness** — should an uncertain match (generic white tablet, no markings) **block** or just **warn and proceed**? My recommendation: warn and proceed, because most generics have no markings and we'd block legitimate doses. Strict mode would frustrate patients on cheap generics.
2. **Confetti everywhere or just first time per day?** Recommendation: every successful verification — small dopamine reward reinforces the daily habit, which is the whole point of the tab.

## Out of scope
- Storing a "reference photo" of the pill from the doctor (would let us do exact visual matching instead of description matching — bigger build, separate task).
- Confetti on streak milestones (currently a notification; could be its own reward moment later).
- Doctor-side review of `pending_review` rows (still pending from earlier plan).

