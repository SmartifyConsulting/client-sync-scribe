

# AI Document Analysis Feature

## Overview
Add the ability to upload medical images (X-rays, MRIs, scans, etc.) to patient documents and request AI-powered interpretation. The interpretation is stored alongside the document for future reference.

## Changes

### 1. New Edge Function: `analyze-medical-image`
**File: `supabase/functions/analyze-medical-image/index.ts`**
- Accepts `imageUrl` and `documentId`
- Uses Lovable AI (Gemini 2.5 Pro — best for image+text reasoning) to analyze the medical image
- Returns structured analysis: findings, observations, disclaimers
- Saves the AI interpretation back to the document record via a new `ai_analysis` column
- Includes medical disclaimer that this is not a substitute for professional diagnosis

### 2. Database Migration
- Add `ai_analysis` (text, nullable) and `ai_analyzed_at` (timestamptz, nullable) columns to the `documents` table

### 3. Update File Upload in `PatientDocuments.tsx`
- Expand the file upload `accept` to include image types (`.jpg,.jpeg,.png,.dicom,.bmp`)
- When an image file is uploaded (not audio/video), save it to `patient-media` storage and create a document record with `media_type: 'image'`
- Add `image` to the `DocType` union and `DOC_TYPE_CONFIG` with an Image icon

### 4. AI Analysis Button on Document Cards
- On document cards where `mediaUrl` exists and is an image type, show a "AI Analyse" button (sparkles icon)
- Clicking it calls the edge function, shows a loading spinner
- Once complete, the analysis text is displayed in an expandable section below the card
- If `ai_analysis` already exists, show "View Analysis" instead, displaying the stored result
- Add a badge "AI Analysed" for documents that have been interpreted

### 5. Analysis Display Dialog
- A dialog/sheet that shows:
  - The uploaded image (thumbnail)
  - The AI interpretation text
  - Timestamp of analysis
  - Medical disclaimer banner
  - Option to re-analyse

## Files Modified

| File | Change |
|------|--------|
| `supabase/functions/analyze-medical-image/index.ts` | New edge function |
| `supabase/config.toml` | Add function config with `verify_jwt = false` |
| Database migration | Add `ai_analysis`, `ai_analyzed_at` to `documents` |
| `src/pages/patient/PatientDocuments.tsx` | Image upload support, AI button on cards, analysis display |

