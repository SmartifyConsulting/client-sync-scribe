

# Fix: Transcript Duplication, Doctor Color Coding, and End Session Voice Detection

## Issue 1: Transcript Repeated/Duplicated

The uploaded image shows the exact same conversation appearing twice in the transcript. This happens because `onTranscriptionComplete` in `useAudioRecording.ts` (line 242) **appends** each new transcription to the existing transcript:
```
setTranscript(prev => prev ? `${prev}\n\n${transcribedText}` : transcribedText);
```

When a recording stops and `onstop` fires, it calls `transcribeAudio` which returns the full transcription. But if there was a previous transcription cycle (e.g., from a prior recording in the same session), the old text is still in `transcript` state, causing duplication.

Additionally, in `Sessions.tsx` line 379, `onTranscriptionComplete` also appends to `notes`:
```
setNotes(prev => prev ? `${prev}\n\n${text}` : text);
```

The `text` parameter already contains the accumulated transcript (old + new), so appending it to existing notes creates duplication.

**Fix in `src/hooks/useAudioRecording.ts`:** Replace the append logic — set the transcript directly instead of concatenating, since the hook already accumulates internally.

**Fix in `src/pages/Sessions.tsx`:** In `onTranscriptionComplete`, replace notes entirely with the transcript text instead of appending (since the hook already returns the full accumulated transcript).

## Issue 2: Doctor Lines Not Color-Coded in Teal

The color logic checks for "dr" or "doctor" in the speaker name:
```
const isDoctor = speaker.toLowerCase().includes('dr') || speaker.toLowerCase().includes('doctor');
```

But the transcript shows **"Dean Allie"** — the doctor's actual name without any "Dr." prefix. The AI formatter uses the doctor's full name as the speaker label, which may not include "Dr."

**Fix:** Instead of relying on "dr"/"doctor" prefix detection, compare the speaker name against the actual doctor name. In `Sessions.tsx`, the `doctorName` variable is available. In `SessionDetail.tsx`, fetch the doctor profile name. Also add a fallback: check if the speaker is the first speaker in the transcript (typically the doctor).

**Files:**
- `src/pages/Sessions.tsx` (lines 884-897 and 1000-1012): Compare speaker against `doctorName` variable
- `src/pages/SessionDetail.tsx` (lines 545-561): Fetch doctor name from session's `doctor_id` profile and compare

## Issue 3: "End Session" Voice Command Not Working

The Web Speech API (`SpeechRecognition`) is used for real-time detection. Potential issues:
1. **Browser support**: Chrome supports it, but Safari/Firefox have limited support
2. **Microphone conflict**: Both `MediaRecorder` and `SpeechRecognition` use the same mic — some browsers block concurrent access
3. **The `onend` auto-restart** may silently fail, causing recognition to stop early

**Fix in `src/hooks/useAudioRecording.ts`:**
- Share the same `MediaStream` with SpeechRecognition instead of letting it request a new mic
- Add more robust error handling and logging in `onerror`
- Add broader phrase matching: "end session" should match even with filler words around it
- Add a fallback: also check the final Whisper transcript for end phrases (belt-and-suspenders)

**Fix in `src/pages/Sessions.tsx`:**
- In `onTranscriptionComplete`, also check the Whisper transcript text for end phrases as a secondary detection method (in case Web Speech API failed)

## Files Modified

| File | Change |
|------|--------|
| `src/hooks/useAudioRecording.ts` | Fix transcript duplication (set instead of append); improve SpeechRecognition reliability |
| `src/pages/Sessions.tsx` | Fix duplication in notes; use doctor name for color coding; add Whisper-based end detection fallback |
| `src/pages/SessionDetail.tsx` | Use doctor name comparison for color coding instead of "dr" prefix check |

