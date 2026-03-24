

# Fix: Transcription Failing Due to Large Base64 Payload Timeout

## Root Cause

The audio is sent as base64 inside a JSON body to the edge function. For a session with Shannon, the base64 string was 2.5MB. The `supabase.functions.invoke` call timed out after ~3 minutes (`TypeError: Failed to fetch`). The edge function booted but never logged any processing, confirming the request body never arrived or was rejected.

## Solution: Use Storage URL Instead of Base64

The audio is **already uploaded to storage** before transcription (line 105). Instead of converting the blob to base64 and sending it inline, pass the storage URL to the edge function. The edge function then downloads the file from storage directly (server-to-server, fast) and sends it to Whisper.

### File: `src/hooks/useAudioRecording.ts`

**In `mediaRecorder.onstop`:** Reorder so storage upload happens first, then pass `storageUrl` to `transcribeAudio` instead of the blob.

**In `transcribeAudio`:** Change signature to accept either a blob or a URL. When a storage URL is available, send `{ audioUrl, patientName, doctorName, language }` instead of `{ audio: base64, ... }`. Fall back to base64 for short recordings without a sessionId.

### File: `supabase/functions/transcribe-audio/index.ts`

**Accept `audioUrl` as an alternative to `audio`:**
- If `audioUrl` is provided, fetch the file from storage using `fetch(audioUrl)` to get the binary data
- If `audio` (base64) is provided, use the existing `processBase64Chunks` logic
- Either way, create the FormData blob and send to Whisper as before

This eliminates the 2.5MB+ JSON payload, replacing it with a tiny JSON body (~200 bytes) containing the URL. The edge function downloads the audio server-side with no timeout risk.

## Files Modified

| File | Change |
|------|--------|
| `src/hooks/useAudioRecording.ts` | Pass storage URL to transcribeAudio instead of base64 blob |
| `supabase/functions/transcribe-audio/index.ts` | Accept `audioUrl` param, fetch audio from storage server-side |

