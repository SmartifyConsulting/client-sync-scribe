

# Session Enhancements: Language, Transcription, Compactness, Auto-End, and AI Narration

## Changes

### 1. AI Clinician generates in session language + Translate to English button
**File:** `supabase/functions/ai-clinician-diagnosis/index.ts`
- Accept a `language` parameter in the request body
- Add to the system prompt: "Respond in {language}" (e.g., "Respond in Afrikaans")
- Default to English if no language specified

**File:** `src/pages/Sessions.tsx` (lines 198-231, 1090-1140)
- Pass the doctor's `preferred_languages[0]` or session language to the edge function
- Add a "Translate to English" button next to the AI Clinician output
- On click, call `summarize-session` with `action: 'translate'`, `targetLanguage: 'English'` to translate the diagnosis text
- Show translated text inline with an "Original" toggle button

### 2. Colour-code transcription: doctor in teal, patient in black
**File:** `src/pages/SessionDetail.tsx` (lines 569-586)
- Already partially implemented — doctor lines use `text-primary-dark`. Change to `text-primary` (teal) explicitly
- Patient lines stay `text-foreground` (black)

**File:** `src/pages/Sessions.tsx` (lines 947-959, completed state transcript)
- Parse transcript lines by speaker label (lines starting with "Dr"/"Doctor" = teal, others = black)
- Apply same colour logic as SessionDetail

### 3. Compact the completed session frames (Transcription, AI Summary, Action Points)
**File:** `src/pages/Sessions.tsx` (lines 946-1013)
- Reduce padding from `p-6` to `p-3` on all three cards
- Reduce `mb-4` to `mb-2` on headers
- Reduce icon sizes from `h-5 w-5` to `h-4 w-4`
- Reduce `max-h-[250px]` to `max-h-[150px]`
- Remove numbered circles on action points, use simple bullets

### 4. Compact the All Sessions list (50% smaller records)
**File:** `src/pages/Sessions.tsx` (lines 1212-1297)
- Reduce `p-4` to `p-2` on each session row
- Reduce avatar from `h-10 w-10` to `h-7 w-7` with `h-4 w-4` icon
- Use `text-sm` for session title, `text-xs` for meta
- Reduce `gap-4` to `gap-2`

**File:** `src/components/patients/SessionCard.tsx`
- Reduce `p-5` to `p-3`
- Reduce clock icon container from `h-10 w-10` to `h-7 w-7`
- Reduce summary/action points spacing

### 5. Auto-detect "end of session" in transcript to end session
**File:** `src/pages/Sessions.tsx` (around lines 340-360, `onTranscriptionComplete` callback)
- After receiving transcript text, check if the last ~100 characters contain end-of-session phrases: "end of session", "that brings us to the end", "end session", "we'll end here", "that concludes"
- If detected, automatically trigger `endSession()` (same as clicking End Session button)
- Show a toast: "Session ending detected from voice"

### 6. AI Clinician narration (text-to-speech)
**File:** `src/pages/Sessions.tsx` (lines 1090-1140)
- Add a "🔊 Narrate" button next to the AI Clinician output
- On click, call the existing `narrate-briefing` edge function (already exists for dashboard briefing narration) with the AI diagnosis text
- Play the returned audio using an `<audio>` element
- Show a stop button while playing

**File:** `supabase/functions/narrate-briefing/index.ts`
- Verify it accepts arbitrary text (it likely already does for the dashboard briefing)
- If it's hardcoded to briefing content, generalize to accept any text input

## Files Modified

| File | Change |
|------|--------|
| `supabase/functions/ai-clinician-diagnosis/index.ts` | Accept `language` param, generate in session language |
| `src/pages/Sessions.tsx` | Translate button, colour-coded transcript, compact frames, compact session list, auto-end detection, narration button |
| `src/components/patients/SessionCard.tsx` | Compact card layout |
| `src/pages/SessionDetail.tsx` | Colour-coded transcript (teal for doctor) |

