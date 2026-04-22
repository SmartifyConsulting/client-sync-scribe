

# Plan: Duplicate close icon, Rewards restructure, no-retake medication, fix AI validation 400

## 1. Remove the duplicate `×` from the Vula explainer dialog

**`src/components/rewards/VulaExplainerDialog.tsx`**

Shadcn's `DialogContent` already renders a built-in close button in the top-right. The component adds a *second* custom round close button — that's the "xx" in the screenshot. Delete the custom button (lines 22–29) and the now-unused `X` import. Result: a single, standard close icon.

## 2. Restructure My Rewards tabs: merge Overview + Wins + Streaks; replace Assigned Tasks with grouped Vula history

**`src/pages/patient/MyRewards.tsx`**

Final tab strip: **Overview** · **Chronic Meds** (when chronic) · **Vulas**.

### 2a. Merge "Wins" and "Streaks" into Overview
- Remove the `<TabsTrigger value="milestones">` ("Wins").
- Move both the Milestones (Wins) `<Card>` and the Health Streaks `<Card>` from `<TabsContent value="milestones">` (lines 570–692) into `<TabsContent value="overview">`, placed after "Recent Rewards" and before the new history section. Delete the now-empty `milestones` TabsContent.
- Update fallback so legacy `"milestones"` / `"history"` / `"streaks"` route to `"overview"`.

### 2b. Replace "Assigned Tasks" with "Vula History" (accordion grouped by week/month)

The current "Assigned Tasks" card (lines 521–565) duplicates `My Tasks` and is removed.

In its place, render a new **"Vula History"** card containing an accordion grouped chronologically:
- Use existing `rewards` (positive earnings from `useMyRewards`) **plus** `transfers` (negative outflows already in scope) merged by date into one timeline.
- **Grouping rules:**
  - **This Week** — items dated within the current ISO week (Mon → Sun). Open by default.
  - All other items grouped by **calendar month** (`MMMM yyyy`, e.g., "March 2026"). All collapsed by default.
- Use the existing `Accordion` (`@/components/ui/accordion`) with `type="multiple"` and `defaultValue={["this-week"]}`.
- Each row shows: icon (`Vula` logo for earn, `ArrowRightLeft` for transfer), label (`visit_category` for earnings, partner app name for transfers), date (`MMM d, yyyy`), and a coloured amount badge (`+N` green for earnings, `-N` blue for transfers).
- Empty state: "No Vula activity yet."

This card replaces the Assigned Tasks card in the Overview tab.

### 2c. Drop now-unused code
- Remove `tasks`, `tasksLoading`, `refetchTasks`, `pendingActivityTasks`, `getPriorityColor`, `getStatusIcon`, the `patient-assigned-tasks` query, the `PatientTask` interface, and the `ActivityProofCapture` import (no longer rendered on this page).

## 3. Disable retaking proof of medication (overdose-safety)

**`src/components/rewards/MedicationAdherenceTab.tsx`**

Two retake paths exist; both are removed so a patient cannot record a second video for the same scheduled dose.

- **Failed AI validation retry (lines 264–278):** instead of clearing `recordedBlob` and restarting the camera, close the recording dialog and show a toast: *"We couldn't verify this dose. Your medication intake was logged but not auto-confirmed — please contact your doctor if this was an error."* Then mark today's `medication_adherence` row as `"failed_verification"` (new status) so the row is locked and the **Take Medication** button no longer appears for today (treat any non-`pending` status as locked: line 377 already only hides on `completed` — extend to also hide on `failed_verification` and `missed`).
- **Manual "Retake" button after recording (lines 430–432):** delete the `<Button>Retake</Button>` entirely. Once the patient has recorded a clip, the only options are **Submit Proof** or **Cancel** (close dialog). Cancelling discards the clip but, critically, does **not** consume the dose — so a patient who fumbles can still record once. The lock kicks in only after a Submit attempt.

This guarantees: one Submit attempt per scheduled dose. No retake → no possibility of double-recording → no overdose risk from repeated "take medication" interactions.

## 4. Fix the edge function 500 ("AI validation failed: 400") so evidence is actually saved

**Root cause** (confirmed in edge logs): the client uploads a `.webm` video and the edge function passes that URL straight to Gemini as `image_url`. Gemini's vision endpoint accepts only PNG/JPEG/WebP/GIF — it returns `400 Unsupported image format` on any video URL, which the function then rethrows as a 500 to the client.

Fix in **two layers**:

### 4a. Client-side — extract still frames before upload

In `MedicationAdherenceTab.tsx` `handleSubmitProof`:
1. Build a hidden `<video>` from the recorded blob, decode metadata to get duration.
2. Sample **5 frames** at evenly-spaced timestamps (10%, 30%, 50%, 70%, 90% of duration) by drawing each onto an offscreen `<canvas>` and exporting `toBlob('image/jpeg', 0.85)`.
3. Upload each JPEG to `patient-media/medication-proof/${user.id}/${ts}-frame-${i}.jpg`.
4. Invoke the function with `{ imageUrls: [...publicUrls], filePaths: [...paths], prescriptionId, patientId }` — matching the multi-frame contract the edge function already supports (lines 27–31 of the edge function).
5. Skip uploading the original webm — keeps us inside the 5MB cap and removes the unsupported format from the request entirely.

### 4b. Edge function — never lose evidence on AI failure

Currently when the AI call fails, frames are deleted and an error is thrown — the patient sees "Edge function failed" and **no record exists**. Update `supabase/functions/validate-medication-video/index.ts`:
1. Wrap the AI call in a try/catch. On any non-OK status (including 400 / 429 / 402) **and** on parse failure:
   - Insert/update a `medication_adherence` row for today with `status = 'pending_review'`, `taken_at = now()`, and `proof_url` set to the **first frame's** public URL (kept, not deleted) so a doctor can review the evidence later.
   - Skip the storage cleanup for that single first-frame file; delete the rest.
   - Return `200 OK` with `{ ok: false, fallback: true, message: "Verification temporarily unavailable — your dose has been recorded for doctor review." }` so the client surfaces a friendly toast instead of a 500.
2. Still award **0 Vulas** in the fallback path; only valid AI-confirmed ingestion awards +5.
3. Keep the existing happy path (valid → award + delete frames) unchanged.

### 4c. Client toast handling

In `handleSubmitProof`:
- `validation?.isValid === true` → existing success toast.
- `data?.fallback === true` → blue info toast: "Recorded for review — your doctor will verify this dose."
- `validation?.isValid === false` (AI ran successfully but said "no") → existing destructive toast, but **do not restart the camera** (per §3); close the dialog and lock the row.

## Files touched

| File | Change |
|---|---|
| `src/components/rewards/VulaExplainerDialog.tsx` | Remove the custom round close button + unused `X` import (shadcn dialog already renders one) |
| `src/pages/patient/MyRewards.tsx` | Drop "Wins" tab; move Milestones + Streaks cards into Overview; replace "Assigned Tasks" card with "Vula History" accordion (This Week open, monthly groups collapsed); remove tasks query and dead code |
| `src/components/rewards/MedicationAdherenceTab.tsx` | Delete the post-recording "Retake" button; on failed verification close dialog + lock today's row; hide "Take Medication" button when status is anything other than `pending`; client-side: extract 5 JPEG frames from the webm and POST `imageUrls` instead of `videoUrl` |
| `supabase/functions/validate-medication-video/index.ts` | On AI failure (any non-2xx) save a `pending_review` adherence row with first-frame URL preserved and return `200 { ok: false, fallback: true }` instead of throwing 500 |

## Out of scope
- Doctor-side review UI for `pending_review` adherence rows (rows are persisted; building a reviewer panel is a separate task).
- The `My Tasks` page itself (untouched — Assigned Tasks remain available there).
- Vula transfer flow (partner-app section under the Vulas tab is unchanged).

