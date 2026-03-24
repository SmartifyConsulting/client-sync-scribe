

# Multi-Feature Update: Voice Default, Layout Fixes, Transcription Retention, Doctor-Only Multi-Criteria Ratings

## 1. Default Narration Voice to "Shimmer"
**Files:** `src/pages/MyPractice.tsx` (lines 269, 318), `src/components/dashboard/TodaysBriefing.tsx` (line 330)
- Change all `"nova"` fallbacks to `"shimmer"`

## 2. Widen Practice Frames
**File:** `src/pages/MyPractice.tsx` (line 587)
- Remove `max-w-3xl` from `<TabsContent value="practice">` so frames match tab bar width

## 3. Remove Vertical Scroll on Additional Languages
**File:** `src/pages/MyPractice.tsx` (line 642)
- Remove `max-h-[5.5rem] overflow-y-auto`, keep `flex flex-wrap gap-1.5 justify-center`

## 4. "End Session" Tip for Practitioners
**File:** `src/pages/Sessions.tsx` (after line 831)
- Add tip below recording status: "Say 'End Session' to automatically stop recording"
- Detection already works via `endPhrases` array

## 5. Move Session Notes/Drawing Pad to Left
**File:** `src/pages/Sessions.tsx` (line 785)
- Change grid to `lg:grid-cols-[1fr_300px]`, swap children so Notes are left, Recording Panel right

## 6. Fix "T" Cut Off in Session Notes
**File:** `src/components/sessions/SessionNotepad.tsx` (line 36)
- Change textarea from `p-0` to `p-2`

## 7. Transcription Auto-Delete After 7 Days + Download
**File:** `supabase/functions/remind-audio-retention/index.ts`
- Also null out `transcript` and `notes` for sessions older than 7 days (keep `summary`, `action_points`)

**File:** `src/pages/Sessions.tsx`
- Update retention alert text to mention transcriptions
- Add download button per session for transcript (`.txt` file)

**File:** `src/pages/SessionDetail.tsx`
- Add download buttons for transcript and recording

## 8. Multi-Criteria Doctor Rating (Patients Are NOT Rated)

### Database Migration
```sql
ALTER TABLE public.visit_ratings
  ADD COLUMN IF NOT EXISTS communication_rating smallint,
  ADD COLUMN IF NOT EXISTS expertise_rating smallint,
  ADD COLUMN IF NOT EXISTS professionalism_rating smallint;
```

### File: `src/components/sessions/StarRatingDialog.tsx`
- Only show multi-criteria when `raterRole === "patient"` (patient rating a doctor):
  - Communication (1-5 stars)
  - Expertise (1-5 stars)
  - Professionalism (1-5 stars)
- Overall `rating` = average of 3 criteria
- Store individual values in the new columns
- When `raterRole === "doctor"` (doctor rating visit): keep the existing single overall star rating (no criteria breakdown for patients). Moolas still awarded to patient based on single rating.

### File: `src/pages/Dashboard.tsx` (doctor dashboard)
- Extend rating query to fetch `communication_rating`, `expertise_rating`, `professionalism_rating`
- Display breakdown (Communication, Expertise, Professionalism averages) under the overall rating stat card

### Patient Dashboard — No Rating Card
- Patients are not rated, so no rating display is added to `PatientDashboard.tsx`
- Shannon's existing ratings (from doctor → patient) remain as simple single-star visit ratings with moola rewards but no criteria breakdown

---

## Files Modified

| File | Change |
|------|--------|
| `src/pages/MyPractice.tsx` | Default voice shimmer, remove max-w-3xl, remove scroll on languages |
| `src/components/dashboard/TodaysBriefing.tsx` | Default voice shimmer |
| `src/pages/Sessions.tsx` | Swap grid columns, add end-session tip, update retention text, add transcript download |
| `src/components/sessions/SessionNotepad.tsx` | Fix textarea padding |
| `src/components/sessions/StarRatingDialog.tsx` | Multi-criteria for doctor ratings only; single star for patient ratings |
| `src/pages/Dashboard.tsx` | Doctor rating breakdown display |
| `src/pages/SessionDetail.tsx` | Add transcript/recording download buttons |
| `supabase/functions/remind-audio-retention/index.ts` | Add transcript auto-delete |
| Migration | Add `communication_rating`, `expertise_rating`, `professionalism_rating` columns |

