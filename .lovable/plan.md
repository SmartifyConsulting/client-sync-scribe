

# Plan: AI-Validated Medication Adherence with Auto-Deletion

## Overview

Enhance the medication adherence video flow to:
1. Upload video temporarily to storage
2. Send a frame/thumbnail to AI vision (Lovable AI gateway) for ingestion detection — verifying a person is visibly taking medication
3. If validated: mark adherence as completed, award Moolas, then **delete the video** from storage
4. If rejected: notify the patient the proof was insufficient, delete the video, allow retry

## Approach

### New Edge Function: `validate-medication-video`

Similar to the existing `validate-health-photo` function but with a medication ingestion-specific prompt. The function will:
- Accept: `videoUrl`, `prescriptionId`, `patientId`
- Use Lovable AI (gemini-2.5-flash with vision) to analyze the video thumbnail/frame
- Prompt AI to detect: person visible, medication/pill visible, ingestion action (putting pill in mouth, drinking water with pill, etc.)
- Return: `{ isValid, confidence, description }`
- If valid: update `medication_adherence` to completed, award Moolas, send streak notifications
- **Delete the video file** from storage using the service role client regardless of validation outcome
- Store only the validation result (not the video) in the adherence record

### Client Changes: `MedicationAdherenceTab.tsx`

Update `handleSubmitProof`:
1. Upload video to `patient-media` bucket (temporary)
2. Call `validate-medication-video` edge function with the public URL
3. Show validation result to user (success or retry prompt)
4. No `proof_url` stored permanently — the edge function handles everything server-side and deletes the file

### Key AI Prompt

The prompt will ask the model to detect:
- A human face/person visible in frame
- Medication (pills, capsules, liquid medicine, inhaler, etc.) visible
- Evidence of ingestion (hand-to-mouth action, swallowing, drinking)
- Confidence score for the overall medication-taking activity

### Privacy Benefit

Since the video is deleted immediately after AI validation, no sensitive video data persists in storage. Only the AI's validation result (text description + confidence) is stored.

## Files

| File | Change |
|------|--------|
| `supabase/functions/validate-medication-video/index.ts` | New edge function — AI validation + storage cleanup |
| `src/components/rewards/MedicationAdherenceTab.tsx` | Call validation function instead of directly marking complete; handle validation response |
| `supabase/config.toml` | Register new function |

