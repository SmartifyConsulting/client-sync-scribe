

# Fix: Hardcoded Doctor Name & Missing Auto-Generated Prescription

## Root Cause Analysis

**Issue 1 — "Dr. Georgia Adams" appearing instead of Dean Allie:**
In `src/pages/Sessions.tsx` line 318, the doctor name passed to the audio transcription is **hardcoded** as `"Dr. Georgia Adams"`. This means every session transcript labels the doctor as Georgia Adams regardless of who is logged in. The AI summarizer then picks up this wrong name from the transcript.

**Issue 2 — Prescription not auto-generated as a draft document:**
The `completeSession` function in `useSessions.ts` only auto-creates **hospital admission** documents (lines 284-370). There is no equivalent logic for prescriptions, medical certificates, invoices, or referrals. When the AI detects a prescription in the transcript, it returns the data in `summaryData.prescription`, but the code only stores it in `_extractedDocuments` metadata — it never creates a draft document or a review task for it.

## Plan

### 1. Fix hardcoded doctor name (`src/pages/Sessions.tsx`)

- Fetch the logged-in user's profile (`full_name`) on mount
- Pass the actual doctor name (e.g., "Dr. Dean Allie") to `useAudioRecording` instead of the hardcoded string
- Fallback to "Doctor" if no profile name is available

### 2. Auto-generate prescription draft documents (`src/hooks/useSessions.ts`)

After the hospital admission auto-creation block, add similar logic for prescriptions:

- When `summaryData.prescription` is detected and has medications, auto-create a draft prescription document using the doctor's Prescription template (or a default layout)
- Insert the document with `is_draft: true` and `session_id` linked
- Create a `document_review` todo task so the doctor can review and approve before sending
- Apply the same pattern for medical certificates and referrals if detected

### Files Modified

| File | Change |
|------|--------|
| `src/pages/Sessions.tsx` | Fetch doctor profile, pass real `full_name` to `useAudioRecording` |
| `src/hooks/useSessions.ts` | Add auto-creation of draft prescription (and med cert, referral) documents when AI detects them |

