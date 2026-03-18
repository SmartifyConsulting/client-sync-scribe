

# Fix: Voice Recordings Not Being Saved

## Root Cause

The `useAudioRecording` hook only uploads audio to storage when a `sessionId` is provided (line 103 of `useAudioRecording.ts`). However, in the current flow:

1. `startSession()` sets `currentSessionId = null` (line 484 of Sessions.tsx)
2. Recording starts immediately via `startRecording()`
3. `useAudioRecording` receives `sessionId: currentSessionId || undefined` = `undefined`
4. When recording stops, the hook checks `if (currentSessionId)` — it's falsy, so **audio is never uploaded**
5. The session record is only created in `completeSession()`, which passes `audio_url: savedAudioUrlRef.current` — but that was never set

The session DB record is created at completion time, not at start time, so there's no session ID available during recording.

## Fix

**File: `src/hooks/useAudioRecording.ts`**
- Instead of uploading immediately on recording stop, **store the audio blob in a ref** and expose an `uploadAudio(sessionId)` method
- The hook returns `pendingAudioBlob` and `uploadPendingAudio(sessionId)` so the caller can trigger upload after the session ID is known

**File: `src/pages/Sessions.tsx`**
- After `completeSession()` returns the new session ID, call `uploadPendingAudio(sessionId)` to upload the stored blob and then update the session record's `audio_url`

Alternatively (simpler approach):

**File: `src/pages/Sessions.tsx`** — Generate a temporary UUID at session start to use as the storage path prefix, then after the session record is created, update it with the audio URL.

**Simplest fix — File: `src/hooks/useAudioRecording.ts`**:
- On `mediaRecorder.onstop`, always upload audio using a generated UUID as the file key (not requiring a pre-existing session ID)
- Remove the `if (currentSessionId)` guard on upload
- Use `crypto.randomUUID()` or `Date.now()` as the filename when no sessionId is available

**File: `src/pages/Sessions.tsx`** (line 484):
- Generate a temporary ID (`crypto.randomUUID()`) and set it as `currentSessionId` at session start so the hook has a valid value for the storage path
- Pass this as part of `creationData` to `completeSession` so it can be used as the session ID or the audio can be associated

### Recommended approach (simplest, least disruptive):

**File: `src/pages/Sessions.tsx`** `startSession()`:
- Generate a temp audio key: `const audioKey = crypto.randomUUID()`
- Set `currentSessionId` to this key so `useAudioRecording` has a valid `sessionId` for upload
- This means audio gets uploaded during recording, and `savedAudioUrlRef` gets populated
- `completeSession` already reads `savedAudioUrlRef.current` and stores it in the DB

This is a one-line fix: change line 484 from `setCurrentSessionId(null)` to `setCurrentSessionId(crypto.randomUUID())`.

## Files Modified

| File | Change |
|------|--------|
| `src/pages/Sessions.tsx` | Generate a UUID for `currentSessionId` at session start instead of `null` |

