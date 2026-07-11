# Typography Consistency Pass + Session AI Fixes

## Part A — Typography Normalization

### Goal
Every screen, tab, Quick Action editor, modal/dialog, and button should match the font scale used in the **Patient Overview tab** (Tailwind `text-sm` = 14px body, `text-base` = 16px card titles, `text-xs` reserved for true meta/eyebrow labels). Eliminate the pervasive `text-[10px] / text-[11px] / text-[12px]` scaling and the shrunken Session Detail / Delete button styling.

### 1. MobileHeader — Holarc logo alignment
`src/components/layout/MobileHeader.tsx`
- Vertically center-align the logo with the header row (bump padding to `py-4`, add `self-center mt-0.5` on `<img>`) so the logo sits on the visual midline of adjacent screen headings.

### 2. SessionDetail page (attached screenshot)
`src/pages/SessionDetail.tsx`
- Back link `text-[11px]` → `text-sm`
- Subtitle row `text-[11px]` → `text-sm`; status pill `text-[10px]` → `text-xs`
- **Delete Session button**: drop `text-[11px]`, use default Button `size="sm"` typography so it matches other primary/destructive buttons in the app
- Quick Actions title `text-[12px]` → `text-base`; Quick Action buttons `text-[11px] h-9` → `text-sm h-10`
- **AI Summary card** body `text-[12px]` → `text-sm leading-relaxed` (fixes tiny post-transcription summary); title → `text-base`; subtitle → `text-sm`
- Session Notes / Private Notes / Session Documents / Action Points cards: titles → `text-base`, subtitles → `text-sm`, body/transcript lines `text-[12px]` → `text-sm`
- Section eyebrows (`AUDIO / TRANSCRIPT / NOTES`) stay uppercase but move to `text-xs`
- Selects/inline buttons: `text-[11px] h-8` → `text-sm h-9`

### 3. Quick Action editors
`src/features/sessions/components/` — `PrescriptionEditor`, `InvoiceEditor`, `MedicalCertificateEditor`, `ReferralLetterEditor`, `GeneralLetterEditor`, `HospitalAdmissionEditor`, `SessionNotepad`, `FollowUpAppointmentDialog`, `StarRatingDialog`, `VisitCategoryDialog`, `TranscriptionReviewDialogs`
- Replace every `text-[10px]/[11px]/[12px]` on labels, inputs, helper text with `text-sm` (or `text-xs` for true meta captions only).

### 4. Admissions dialogs
`src/features/sessions/admissions/*` (AddVitals, AddMedication, AddLabResult, AddImaging, ManualLogAdmission, UploadAdmission, AdmissionsView)
- All `<Label className="text-[11px]">` → `text-sm`; `text-[10px]` helper lines → `text-xs`.

### 5. Global modal/dialog sweep
Normalize `text-[10-12]px` across:
- `src/components/admissions/**`, `src/components/doctor/**`, `src/components/auth/**`
- `src/components/dashboard/**`, `src/components/feedback/ReportFixSheet.tsx`
- `src/components/legal/LegalDocLayout.tsx`, `src/components/holarchelp/PatientIncidentHistory.tsx`
- Patient header stat pills in `src/pages/PatientProfile.tsx` (`text-[10px]` → `text-xs`)

**Do NOT touch** `src/components/ui/*` shadcn primitives — those are baseline library sizes.

### 6. Verification
- `rg -n "text-\[1[0-2]px\]" src/pages src/features src/components/{admissions,dashboard,doctor,auth,feedback,holarchelp,legal}` → near-zero hits.
- Playwright screenshots at 1280×1800 for: Session Detail, Overview tab, Documents tab, each Quick Action modal, AddVitals dialog. Confirm body copy matches Overview and Delete Session matches other buttons.

### Mapping rule
| Old | New |
|---|---|
| `text-[10px]` | `text-xs` (eyebrow/badge only) |
| `text-[11px]` | `text-sm` (body/labels), `text-xs` (meta) |
| `text-[12px]` | `text-sm` |
| Section titles `text-[12px] font-semibold` | `text-base font-semibold` |
| Inputs/selects `h-8` paired with tiny text | `h-9` |

---

## Part B — Session AI Fixes

### B1. Follow-up appointment date extraction bug
**Symptom:** Transcript clearly says "in two weeks' time, let's say around the 23rd of July" but the AI does not schedule the appointment on that correct date.

**Where to fix:** `supabase/functions/summarize-session/index.ts` (and any downstream `extract-followup` / appointment-creation edge function or client code that parses the follow-up).

**Changes:**
1. Update the extraction prompt to:
   - Return an ISO date (`YYYY-MM-DD`) for `follow_up_date`, not a relative phrase.
   - Prefer an explicit calendar date mentioned in the transcript (e.g. "the 23rd of July") over relative phrases ("in two weeks") when both are present. If only a relative phrase exists, resolve it against `sessionDateISO` passed in from the client.
   - Include the current session date + timezone in the prompt context so relative dates resolve deterministically.
2. Pass `clientDate` + `clientTimezone` from `useSessions.ts` into the summarize-session invocation payload (mirror the pattern already used in `process-todo-actions`).
3. Add a Zod/JSON-schema validator that rejects non-ISO date output and re-prompts once.
4. On the client, when creating the follow-up appointment, use the ISO date directly instead of re-parsing the phrase.
5. Add a targeted unit-style test transcript with the exact "23rd of July" phrasing via `supabase--curl_edge_functions` and confirm the returned `follow_up_date` = the correct ISO date.

### B2. AI diagnostic suggestion during recording (not after)
**Current behaviour:** Diagnostic suggestion is generated only after `summarize-session` runs on stop, so the doctor sees it after they have already dictated prescription and diagnosis — too late to be useful.

**Target behaviour:** Stream an evolving diagnostic suggestion while the recording is in progress, updating every ~20 seconds of new transcript.

**Changes:**
1. New edge function `supabase/functions/live-diagnostic-hint/index.ts`:
   - Input: rolling transcript chunk + patient context (age, sex, active meds, chronic conditions).
   - Model: `google/gemini-3-flash-preview` via Lovable AI Gateway.
   - Output: short structured JSON `{ suggestion, differentials[], red_flags[] }`.
   - Cheap/fast: single prompt, no tools, ~200 token cap.
2. Client hook change in `src/hooks/useAudioRecording.ts` (or a new `useLiveDiagnosticHint.ts`):
   - Every ~20s during recording, if partial transcript grew by ≥ N characters, debounce-invoke `live-diagnostic-hint` with the accumulated transcript so far.
   - Cancel in-flight request when a newer one is queued.
   - Stop polling once `stopRecording()` fires (final summary takes over).
3. UI surface on `src/pages/Sessions.tsx` recording panel:
   - Add a subtle "AI hint" card (collapsed by default) that live-updates with the latest suggestion + differentials, styled with the same Overview font scale (`text-sm` body, `text-base` title).
   - Show a small "updating…" pulse while a request is in flight.
4. Guardrail: only fire if visit category is set and patient consent to AI processing is present (same gate the summarizer already uses).
5. Persist the last live hint into the session record so the completed session still shows what was suggested during the visit.
6. Cost note: acceptable because each call is small and infrequent (~3–6 calls per typical 5-min session).

### B3. Verification for Part B
- `supabase--curl_edge_functions` against `summarize-session` with a canned transcript containing "in two weeks' time, let's say around the 23rd of July" and session date 2026-07-11 → assert `follow_up_date` = `2026-07-23`.
- Manually start a recording in the preview, speak a symptom, wait 25s → confirm the live diagnostic hint card appears and updates.
- Stop the recording → confirm the auto-document sequence still runs and Vula awarding is last (regression check on the earlier fix).

## Out of scope
- No color/spacing/layout changes.
- No changes to shadcn UI primitives.
- No copy changes beyond the AI prompt updates required for B1.
- No changes to Vula reward rules or document templates.
