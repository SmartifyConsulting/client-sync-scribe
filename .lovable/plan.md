

# Fixes: Language Chips Layout, Auto-End Session, Drawing Pad as Tab, and AI Image Comparison

## 1. Compact Additional Languages — 3 Lines Max, Centered

**File:** `src/pages/MyPractice.tsx` (lines 640-669)

The language chip container uses `flex flex-wrap gap-2` which lets chips flow freely. They appear left-aligned and can extend beyond 3 lines.

**Fix:**
- Add `max-h-[5.5rem] overflow-y-auto justify-center` to the `flex flex-wrap` container — this caps it to ~3 rows of chips and centers them
- Reduce chip padding from `px-3 py-1` to `px-2 py-0.5` and use `text-[11px]` to fit more per row

## 2. Fix Auto-Detect End of Session

**File:** `src/pages/Sessions.tsx` (lines 362-373)

The auto-detection logic looks correct in code — it checks the last 150 chars for end phrases. The issue is likely that after `stopRecording()` is called, the `onstop` handler in `useAudioRecording` triggers `transcribeAudio`, which calls `onTranscriptionComplete` again with the final transcript. At that point, `pendingCompletionRef.current` is already `true` from the auto-detect, but `stopRecording` was called while still in the same callback — it may not trigger `onstop` because the recording was already stopping.

**Root cause:** When `detectedEnd` fires, it calls `stopRecording()` but also `return`s immediately. The next `onTranscriptionComplete` callback (after transcription of that final chunk) has `pendingCompletionRef.current = true`, which then shows the visit category dialog correctly. But the issue is that `stopRecording` within `onTranscriptionComplete` creates a race — the recording may have already stopped by the time the callback fires.

**Fix:** After calling `stopRecording()` on auto-detect, instead of returning immediately, set a small timeout to trigger `endSession()` directly:
```typescript
if (detectedEnd && !pendingCompletionRef.current) {
  toast({ title: "Session ending detected", description: "Ending session automatically" });
  pendingCompletionRef.current = true;
  // Use the latest transcript for session completion
  setPendingTranscript(text);
  if (isRecording) stopRecording();
  // Show visit category dialog after a brief delay to allow recording to finalize
  setTimeout(() => {
    setShowVisitCategoryDialog(true);
    pendingCompletionRef.current = false;
  }, 2000);
  return;
}
```

## 3. Drawing Pad as Tab Next to Session Notes

**File:** `src/pages/Sessions.tsx` (lines 888-912)

Currently, Drawing Pad is a toggle button above Session Notes that pushes content down. Convert to a tabbed interface.

**Fix:** Replace the button + conditional render with a `Tabs` component:
```
<Tabs defaultValue="notes">
  <TabsList>
    <TabsTrigger value="notes">Session Notes</TabsTrigger>
    <TabsTrigger value="drawing">Drawing Pad</TabsTrigger>
  </TabsList>
  <TabsContent value="notes">
    <SessionNotepad ... />
  </TabsContent>
  <TabsContent value="drawing">
    <DrawingPad ... />
  </TabsContent>
</Tabs>
```
Remove the `showDrawingPad` state variable and the toggle button.

## 4. Multi-Image AI Comparison Feature

Allow doctors/patients to upload multiple images for AI comparison (e.g., wound progression, before/after surgery).

### New Edge Function: `supabase/functions/compare-medical-images/index.ts`
- Accept an array of `imageUrls` (2-6 images) with optional labels (dates, descriptions)
- Send all images to Gemini 2.5 Pro with a comparison prompt:
  - Identify changes between images
  - Track progression (improvement/deterioration)
  - Highlight key differences
  - Provide timeline-based assessment if dates are given
- Save the comparison result to a new `image_comparisons` table
- Include the standard medical disclaimer

### Database Migration
```sql
CREATE TABLE public.image_comparisons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES public.patients(id) ON DELETE CASCADE,
  doctor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  image_urls text[] NOT NULL,
  image_labels text[],
  comparison_type text DEFAULT 'general',
  ai_analysis text,
  analyzed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.image_comparisons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Doctors can manage their comparisons"
  ON public.image_comparisons FOR ALL TO authenticated
  USING (doctor_id = auth.uid());

CREATE POLICY "Patients can view their comparisons"
  ON public.image_comparisons FOR SELECT TO authenticated
  USING (patient_id IN (
    SELECT id FROM public.patients WHERE user_id = auth.uid()
  ));
```

### New Component: `src/components/documents/ImageComparisonDialog.tsx`
- Dialog with a drop zone for 2-6 images
- Each image slot has a label field (date or description)
- Comparison type selector: "Wound Progression", "Before/After Surgery", "Treatment Progress", "General Comparison"
- "Compare with AI" button that invokes the edge function
- Results panel showing the AI comparison analysis
- Side-by-side or slider image viewer for visual comparison

### Integration Points
- **PatientDocuments page:** Add a "Compare Images" button in the document actions area
- **SessionDetail page:** Allow selecting multiple images from session history for comparison
- Auto-populate image labels with document dates when selecting from existing documents

## Files Modified

| File | Change |
|------|--------|
| `src/pages/MyPractice.tsx` | Compact language chips: max 3 rows, centered, smaller chips |
| `src/pages/Sessions.tsx` | Fix auto-end session timing; convert Drawing Pad to tab alongside Session Notes |
| `supabase/functions/compare-medical-images/index.ts` | New — multi-image AI comparison edge function |
| `src/components/documents/ImageComparisonDialog.tsx` | New — UI for uploading and comparing multiple images |
| `src/pages/patient/PatientDocuments.tsx` | Add "Compare Images" button |
| Migration | Create `image_comparisons` table with RLS |

