

# Plan: Fix Doctor Search Message & Language-Aware Narration/Translation

## 1. Fix "No healthcare providers found" false negative

**File:** `src/pages/patient/MyDoctors.tsx` (lines 76-97, 185-188)

**Root cause:** When a patient searches for "Dea", the query finds "Dean Allie" but line 91 filters out already-connected doctors. The filtered result is empty, so the UI shows "No healthcare providers found" — which is misleading since the doctor was found but is already connected.

**Fix:** Track how many results came back before filtering vs after. Show a distinct message when results were found but all are already connected:
- `searchResults.length === 0` AND pre-filter count > 0 → "All matching providers are already on your profile."
- `searchResults.length === 0` AND pre-filter count === 0 → "No healthcare providers found matching your search."

Add a `totalFound` state variable set alongside `searchResults`.

## 2. Auto-translate briefing text based on primary language

**File:** `src/components/dashboard/TodaysBriefing.tsx` (lines 265-317, 340-398)

Currently `generateBriefingSegments()` produces English-only text. The narration function (`narrate-briefing`) just reads whatever text it receives — OpenAI TTS can pronounce any language, but the text itself is always English.

**Fix:**
1. In `handleNarrate`, fetch the doctor's `preferred_language` from profiles
2. If the language is not `"en"`, call the Lovable AI gateway edge function (or a new translation step) to translate each segment's text before sending to TTS
3. Use the existing `narrate-briefing` edge function as-is (OpenAI TTS handles multilingual text natively)
4. Also translate the displayed segment text in the UI so the on-screen text matches the narration

**Implementation:** Add a translation step using the `summarize-session` or a lightweight AI call to translate `segments[].text` into the user's `preferred_language` before narration. Use the Lovable AI gateway model (`google/gemini-2.5-flash`) via an edge function for translation.

## 3. Create a translate-text edge function

**File:** `supabase/functions/translate-text/index.ts` (new)

A simple edge function that accepts `{ text: string, targetLanguage: string }` and returns `{ translatedText: string }` using the Lovable AI gateway. This will be reusable for briefing narration and any future translation needs.

## 4. Auto-translate session summaries when language changes

**File:** `src/pages/Sessions.tsx`

The session detail view already has a "Translate to English" button for non-English summaries. Ensure the reverse also works — when a doctor's primary language is non-English, the AI diagnosis/summary text should offer translation to their preferred language (not just English). Update the translate button logic to use the doctor's `preferred_language` as the target.

---

## Files Modified

| File | Changes |
|------|---------|
| `src/pages/patient/MyDoctors.tsx` | Distinguish "already connected" from "not found" in search results |
| `src/components/dashboard/TodaysBriefing.tsx` | Translate briefing segments to preferred language before narration |
| `supabase/functions/translate-text/index.ts` | New edge function for AI-powered text translation |
| `src/pages/Sessions.tsx` | Update translate button to target preferred language (not just English) |

