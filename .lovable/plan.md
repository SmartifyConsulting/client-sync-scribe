

# Plan: Font Consistency, Calendar Views, Profile Border, Language-Aware AI

## 1. Standardize text field font and size across the app

**Problem**: `Input` uses `text-base` (16px), `Textarea` uses `text-sm` (14px), `SelectTrigger` uses `text-sm`.

**Fix**: Update `Textarea` and `SelectTrigger` to match `Input` at `text-base` (16px). All three core text field components will use `text-base` for consistency.

| File | Change |
|------|--------|
| `src/components/ui/textarea.tsx` | Change `text-sm` to `text-base` |
| `src/components/ui/select.tsx` | Change `text-sm` to `text-base` in `SelectTrigger` |

## 2. Add Week/Month/Year view toggle to both calendars

### Patient Calendar (`PatientCalendar.tsx`)
- Add a `calendarView` state: `"week" | "month" | "year"`
- Add a 3-button toggle (Week / Month / Year) next to the navigation buttons
- **Week view**: Current behavior (7-day strip)
- **Month view**: Full month grid (similar to doctor's `CalendarView.tsx` pattern)
- **Year view**: 12-month mini-calendar grid showing months with appointment dots

### Doctor Calendar (`CalendarView.tsx`)
- Currently only has month view. Add a `calendarView` state toggle
- **Week view**: 7-day strip similar to patient calendar
- **Month view**: Current behavior
- **Year view**: 12-month mini-calendar grid

## 3. Add #E01837 border around all profile avatar images

Update all `Avatar` components that display user profile pictures to have a `border-2 border-[#E01837]` (the brand secondary color).

Locations to update:
- `src/pages/Profile.tsx` (line 449)
- `src/pages/Dashboard.tsx` (line 288)
- `src/pages/patient/PatientDashboard.tsx` (line 302)
- `src/components/layout/Sidebar.tsx` (line 146)
- `src/pages/Auth.tsx` (line 541)

## 4. AI summaries and transcriptions in user's preferred language

### Summarize Session (`supabase/functions/summarize-session/index.ts`)
- Accept a new `language` parameter in the request body
- Append to the system prompt: "Respond in {language}" when a language is provided

### Session completion (`src/hooks/useSessions.ts`)
- Fetch the doctor's `preferred_language` from their profile before calling summarize-session
- Pass the language code in the request body

### Transcription (`src/hooks/useAudioRecording.ts`)
- Already passes `language` parameter — verify it uses the profile's `preferred_language`

### Summarize Patient History (`supabase/functions/summarize-patient-history/index.ts`)
- Accept and use a `language` parameter similarly

## Files Modified

| File | Change |
|------|--------|
| `src/components/ui/textarea.tsx` | `text-sm` → `text-base` |
| `src/components/ui/select.tsx` | `text-sm` → `text-base` in SelectTrigger |
| `src/pages/patient/PatientCalendar.tsx` | Add week/month/year view toggle |
| `src/pages/CalendarView.tsx` | Add week/year view toggle |
| `src/pages/Profile.tsx` | Avatar border `#E01837` |
| `src/pages/Dashboard.tsx` | Avatar border `#E01837` |
| `src/pages/patient/PatientDashboard.tsx` | Avatar border `#E01837` |
| `src/components/layout/Sidebar.tsx` | Avatar border `#E01837` |
| `src/pages/Auth.tsx` | Avatar border `#E01837` |
| `supabase/functions/summarize-session/index.ts` | Accept `language`, add to prompt |
| `supabase/functions/summarize-patient-history/index.ts` | Accept `language`, add to prompt |
| `src/hooks/useSessions.ts` | Fetch user's preferred_language, pass to summarize |

