

# Auto-Process Voice Tasks with Silence Detection

## Changes to `src/pages/TodoList.tsx`

### 1. Auto-detect silence to stop recording
Add a silence detection mechanism using `AnalyserNode` from the Web Audio API. When audio level stays below a threshold for ~3 seconds, automatically stop the recording.

- Create an `AudioContext` + `AnalyserNode` when recording starts
- Poll audio levels every 200ms
- Track consecutive silent frames; after ~3s of silence, call `stopRecording()` automatically
- Show "Listening..." → "Processing..." states naturally

### 2. Auto-trigger AI processing after transcription
In `processAudio`, after transcription succeeds, immediately call `handleAiProcess` with the transcribed text instead of setting it in the input and waiting for the user to click "AI Process".

Change `processAudio` flow:
```
transcribe → if text received → call process-todo-actions immediately → show result notifications
```

### 3. Specific action-based toast notifications
Instead of a generic "AI Processing Complete" toast, show individual toasts per auto-executed action using the `actionTypeLabels` map:
- "📅 Scheduled appointment — Appointment with Faith Akeno"
- "💊 Created prescription — Amoxicillin for Georgia Adams"
- "📌 Manual task created — Follow up on lab results"

Each result gets its own toast notification so the doctor sees exactly what happened.

### 4. Keep manual fallback
The text input + "Add" button and "AI Process" button remain for typed input. The voice flow just becomes fully automatic: speak → pause → auto-stop → transcribe → AI process → notifications.

## Summary of flow
```
Doctor taps mic → speaks → 3s silence → auto-stop →
transcribe → AI auto-process → toast per action
("📅 Scheduled appointment with Faith Akeno")
```

**Single file changed:** `src/pages/TodoList.tsx`

