

# Multi-Feature Update Plan

## 1. Collapsible Frames in PatientDetailsEditor

**File: `src/components/patients/PatientDetailsEditor.tsx`**

In view mode (lines 252-471), wrap each of the 10 clinical frames (Personal Information, Addresses, Next of Kin, etc.) in `Collapsible` components from `@/components/ui/collapsible`. Each frame header becomes a `CollapsibleTrigger` with a chevron icon. Default state: all collapsed except "Personal Information". This dramatically shortens the scroll for both My Details and doctor-side Patient Profile.

Import `Collapsible, CollapsibleContent, CollapsibleTrigger` and `ChevronDown`. Replace each frame's outer div with a Collapsible wrapper, move the header row into CollapsibleTrigger, and wrap the grid content in CollapsibleContent.

## 2. Doctors as Row Records with Info Icon Popover for Access

**File: `src/pages/patient/PatientDashboard.tsx`** (lines 484-542)

Replace the "My Healthcare Providers" card-style doctor entries with compact table rows. Each row shows: Doctor Name, Specialty Badge, Practice Number. Add an `Info` icon button that opens a `Popover` showing `granted_at` date and any other access details. Remove the large avatar circle and "Connected since" column to keep rows compact.

## 3. Google Calendar Sync for Patients

The Settings page already shows Google Calendar integration for all roles — it's not gated by role. However, the `handleConnect` function (line 324-344) is currently a **mock** — it just sets local state after a 1.5s timeout without actually calling the `useGoogleCalendar` hook.

**File: `src/pages/Settings.tsx`**

Import and use `useGoogleCalendar` hook. Replace the mock `handleConnect("google")` with the real `connect()` from the hook, and `handleDisconnect("google")` with `disconnect()`. Use `isConnected` from the hook to drive the UI state instead of local `googleConnected` state. This makes Google Calendar sync functional for both doctors and patients.

## 4. Translate AI Summary to Different Language

**File: `src/pages/SessionDetail.tsx`** (lines 238-251, AI Summary section)

Add a "Translate" dropdown button next to the AI Summary header. Options include the 28 supported languages from the profile settings. When selected, call the `summarize-session` edge function (or a new lightweight `translate-text` approach via the Lovable AI gateway) with the summary text and target language. Display the translated text below or replace the original. Default language is the transcription language (already determined by the session's source language).

**Implementation**: Add a `Select` dropdown with language options next to the summary title. On selection, call Lovable AI gateway with a simple translate prompt. Store translated text in local state.

## 5. Voice Recording Retention Notice & Bulk Download

This is the most complex feature with multiple parts:

### 5a. Add retention notice to SessionDetail

**File: `src/pages/SessionDetail.tsx`** (lines 254-280, Session Recording section)

Add an `Alert` banner below the audio player: "Voice recordings are automatically deleted after 7 days. Download recordings you wish to keep." Include a download button for the individual recording.

### 5b. Bulk download & delete on Sessions list

**File: `src/pages/Sessions.tsx`**

Add checkbox selection to completed sessions that have `audio_url`. Add a "Download Selected Recordings" button in the header. When clicked, fetch each audio file, zip them (or download sequentially), then after successful download, delete the audio files from storage and clear `audio_url` on the session records.

### 5c. Weekly reminder notification (edge function + cron)

Create a new edge function `remind-audio-retention` that:
1. Queries sessions with `audio_url` not null and `created_at` older than 6 days
2. Inserts a notification for each affected doctor/patient: "You have session recordings expiring soon. Download them before they are deleted."
3. For sessions older than 7 days, delete the audio from storage and set `audio_url = null`

Schedule via `pg_cron` to run daily.

## Files Modified

| File | Change |
|------|--------|
| `src/components/patients/PatientDetailsEditor.tsx` | Wrap 10 clinical frames in Collapsible components |
| `src/pages/patient/PatientDashboard.tsx` | Doctors as row records with info popover |
| `src/pages/Settings.tsx` | Wire real Google Calendar hook for all users |
| `src/pages/SessionDetail.tsx` | Add translate dropdown for AI summary; add audio retention notice |
| `src/pages/Sessions.tsx` | Add bulk selection and download for session recordings |
| `supabase/functions/remind-audio-retention/index.ts` | New edge function for weekly reminders and auto-deletion |
| **Cron job** (via insert tool) | Schedule daily `remind-audio-retention` execution |

