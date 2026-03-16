# Add Preferred Language for Multilingual Transcription

## Overview

Currently the `transcribe-audio` edge function sends audio to OpenAI Whisper without specifying a language, relying on auto-detection. This works but can be unreliable for non-English languages. The fix is to add a `preferred_language` field to the user's profile and pass it through the transcription pipeline.

## Database Migration

Add `preferred_language` column to `profiles`:

```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS preferred_language text DEFAULT 'en';
```

## Changes

### 1. Profile model & UI (`src/hooks/useProfile.ts`, `src/pages/Profile.tsx`)

- Add `preferred_language` to the `Profile` interface
- Add a "Preferred Language" dropdown in Profile settings (near the voice selector) with major international languages:
  - English, Afrikaans, Zulu, Xhosa, Sotho, Tswana, French, German, Greek, Spanish, Portuguese, Italian, Dutch, Arabic, Hindi, Mandarin Chinese, Japanese, Korean, Russian, Turkish, Swahili, Hebrew, Polish, Ukrainian, Thai, Vietnamese, Indonesian, Malay

### 2. Pass language to transcription (`src/hooks/useAudioRecording.ts`, `src/pages/TodoList.tsx`)

- Read `preferred_language` from the user's profile
- Pass `language` in the body when invoking `transcribe-audio`

### 3. Edge function (`supabase/functions/transcribe-audio/index.ts`)

- Accept `language` parameter from the request body
- Pass it as the `language` parameter to OpenAI Whisper API (`formData.append('language', language)`) — Whisper uses ISO-639-1 codes (e.g., `en`, `af`, `zu`, `fr`, `de`, `es`)
- If no language provided, omit the parameter (Whisper auto-detects)

## Files Modified


| File                        | Change                               |
| --------------------------- | ------------------------------------ |
| Migration                   | Add `preferred_language` column      |
| `useProfile.ts`             | Add field to interface               |
| `Profile.tsx`               | Add language dropdown                |
| `useAudioRecording.ts`      | Pass language to transcribe function |
| `TodoList.tsx`              | Pass language to transcribe function |
| `transcribe-audio/index.ts` | Accept and forward language param    |
