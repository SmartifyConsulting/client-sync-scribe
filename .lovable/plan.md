

# Video Recording with Multi-Frame AI Validation

## Problem
A single photo cannot prove medication ingestion. The AI needs to see the full sequence: tablet shown, placed in mouth, swallowed, empty mouth. The previous video attempt failed because the Gemini API (via OpenAI-compatible gateway) doesn't accept raw `.webm` video URLs through the `image_url` field.

## Solution
Record a short video (up to 15 seconds) on the client, then **extract 4-5 key frames from the video using canvas** before uploading. Send these frames as a sequence of images to Gemini, which analyses them as a temporal sequence proving ingestion.

This gives true video-based validation without hitting API format limitations.

## Changes

### 1. Video recording + frame extraction in PatientTasks.tsx
- Replace the photo capture UI with a **video recording** interface (MediaRecorder, 15s max, countdown timer, stop button)
- After recording stops, **extract 5 evenly-spaced frames** from the video using a hidden `<video>` element + canvas (seek to 0%, 25%, 50%, 75%, 100% of duration)
- Show the recorded video for review (play/retake)
- On submit: upload all 5 frame JPEGs to `patient-media` storage, send all 5 public URLs to the edge function
- Display recording progress with a visual timer bar

### 2. Update edge function for multi-frame sequential validation
**File:** `supabase/functions/validate-medication-video/index.ts`
- Accept `imageUrls` (array) in addition to single `videoUrl`
- Send all frames to Gemini in a single prompt as an ordered image sequence
- Updated AI prompt instructs Gemini to analyse the temporal sequence:
  - Frame continuity: same person throughout
  - Early frames: medication/tablet visible in hand
  - Middle frames: medication being placed into mouth
  - Late frames: swallowing action, empty mouth
- Delete all frame files from storage after validation (privacy)
- Return the same validation result structure

### 3. Frame extraction technique
```text
Record video (MediaRecorder, 15s max)
         ↓
Stop → create object URL → load in hidden <video>
         ↓
Seek to 5 timestamps (0s, 25%, 50%, 75%, 100%)
         ↓
For each: draw frame to canvas → toBlob(JPEG)
         ↓
Upload 5 JPEGs → send 5 URLs to edge function
         ↓
Gemini analyses sequence → validates ingestion
         ↓
Delete all 5 files from storage
```

## Files Modified

| File | Change |
|------|--------|
| `src/pages/patient/PatientTasks.tsx` | Replace photo capture with video recording + frame extraction |
| `supabase/functions/validate-medication-video/index.ts` | Accept array of image URLs, sequential validation prompt |

