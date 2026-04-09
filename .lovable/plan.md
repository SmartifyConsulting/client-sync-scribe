

# Nine Fixes: Languages, Med Cert Dates, Appointments, Reminders, Pricing, Transcription, Color Coding, Voice Detection, Smart Invitations

## 1. Languages — Justify Alignment

**File:** `src/pages/MyPractice.tsx`
- Change `justify-center` to `justify-start` on the additional languages container

## 2. Medical Certificate — Auto-Detect Start/End Dates from Session

**File:** `src/components/sessions/MedicalCertificateEditor.tsx`
- When `sessionId` is provided, fetch the session's AI summary and parse `medical_certificate.from_date` / `to_date`
- Pre-populate `startDate` and `endDate` state with extracted values

## 3. Appointment — Patient Names as "Surname, First Name"

**File:** `src/pages/CalendarView.tsx`
- Sort patients alphabetically by surname
- Format display as `"Surname, FirstName"` by splitting on space

## 4. Appointment — Improve Date and Time Pickers

**File:** `src/pages/CalendarView.tsx`
- Replace raw `<Input type="date">` with Popover + Calendar component
- Replace `<Input type="time">` with Select dropdown of 15-min time slots (7:00 AM – 6:00 PM)
- Apply same improvements to both new and edit dialogs

## 5. Patient Reminder of Transcription/Recording Deletion

**File:** `supabase/functions/remind-audio-retention/index.ts`
- Update patient notification to include session date: "Your session recording from [date] will be deleted tomorrow. Please download if needed."

## 6. Remove First Consult Badge from Pricing

**File:** `src/pages/MyPractice.tsx`
- Remove the Award icon toggle button from service row actions entirely

## 7. Fix Transcript Duplication

**File:** `src/hooks/useAudioRecording.ts`
- Replace `setTranscript(prev => prev + text)` with `setTranscript(transcribedText)` — set directly, don't append

**File:** `src/pages/Sessions.tsx`
- In `onTranscriptionComplete`, replace `setNotes(prev => prev + text)` with `setNotes(text)` — the hook already returns the full accumulated transcript

## 8. Doctor Lines Color-Coded in Teal

**File:** `src/pages/Sessions.tsx`
- Compare speaker name against `doctorName` variable (already available): `speakerLower.includes(doctorName.toLowerCase())`
- Keep existing "dr"/"doctor" prefix check as fallback

**File:** `src/pages/SessionDetail.tsx`
- Fetch doctor profile name from session's `doctor_id` and compare speaker against it

## 9. Fix "End Session" Voice Detection

**File:** `src/hooks/useAudioRecording.ts`
- Share the existing `MediaStream` with `SpeechRecognition` to avoid microphone conflicts
- Add robust error handling and auto-restart in `onerror`/`onend`
- Broaden phrase matching for "end session"

**File:** `src/pages/Sessions.tsx`
- Add Whisper fallback: in `onTranscriptionComplete`, scan the final transcript text for end phrases as secondary detection

## 10. Smart Invitation Logic — Both Directions

### Doctor → Patient (already planned)

**File:** `supabase/functions/send-patient-invitation/index.ts`
- Check if patient email already has an account using service role `auth.admin.listUsers()`
- **If user exists:** Skip "Create Your Account" email. Instead create `doctor_patient_access` record, send in-app notification ("Dr. X connected with you"), and send a different email with "View Dashboard" CTA
- **If user is new:** Keep current "Create Your Account" email flow

### Patient → Doctor (same logic)

**File:** `src/components/patient/InviteDoctorDialog.tsx`
- The "invite by email" fallback (line 138–160) calls `send-user-invitation`. This function already checks if the recipient exists (line 82–87) and branches email content accordingly. However, when the doctor IS found on the platform via name search (line 131–136), the patient submits a `doctor_access_requests` record — no email is sent, which is correct.
- The issue is the email invite path: `send-user-invitation` already handles both cases (existing user → "View Invitation" email, new user → "Join Holarc" email), so this is already working correctly.

**File:** `supabase/functions/send-user-invitation/index.ts`
- No changes needed — already implements the smart branching: if recipient exists on platform, sends "View Invitation" email + in-app notification; if not, sends "Join Holarc" signup email. This covers the patient→doctor direction.

**File:** `supabase/functions/send-patient-invitation/index.ts`
- This is the doctor→patient direction that needs fixing. Add the same user-existence check and branching as `send-user-invitation` already has.

## Files Modified

| File | Change |
|------|--------|
| `src/pages/MyPractice.tsx` | Justify-align languages; remove first consult badge |
| `src/components/sessions/MedicalCertificateEditor.tsx` | Auto-populate dates from session AI summary |
| `src/pages/CalendarView.tsx` | Surname-first names; visual date/time pickers |
| `supabase/functions/remind-audio-retention/index.ts` | Include session date in patient reminder |
| `src/hooks/useAudioRecording.ts` | Fix duplication; improve SpeechRecognition reliability |
| `src/pages/Sessions.tsx` | Fix duplication; doctor color coding; Whisper end-session fallback |
| `src/pages/SessionDetail.tsx` | Doctor name comparison for color coding |
| `supabase/functions/send-patient-invitation/index.ts` | Smart branching: skip signup email for existing users |

