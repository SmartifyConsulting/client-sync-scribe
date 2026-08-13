# Maeve voice: ElevenLabs, hands-free talk mode, live words on screen

Maeve's spoken replies currently come from OpenAI's built-in text-to-speech (`narrate-briefing`, voice "shimmer") — ElevenLabs has never been connected to this project. Talk mode also waits for a tap before anything happens: Maeve stays silent until her first reply is generated, and the microphone only opens when the user presses the mic button.

## 1. ElevenLabs voice for Maeve

- Link an ElevenLabs connection to the project (a connect card will appear in chat).
- New speech endpoint dedicated to Maeve that calls ElevenLabs with the chosen voice, streaming the audio back so she starts speaking almost immediately.
- If ElevenLabs is unavailable or errors, fall back to the current built-in voice so talk mode never goes silent.

## 2. Choosing Maeve's voice

- A voice picker in the Ask Maeve header (talk mode) with a short curated list of ElevenLabs voices — warm female, calm female, warm male, calm male, plus a neutral option.
- Each option has a "preview" play button so the user hears the voice before committing.
- The choice is remembered on the device and applies to every exploration, including the recap read-aloud.

## 3. Talk mode starts itself

When the user picks **Talk and listen** (or "Continue with voice" from a recap):

- Maeve greets aloud straight away — her opening question is spoken as soon as it is generated, with no extra tap.
- The microphone opens automatically the moment she finishes speaking, so the user simply answers.
- Mic and speaker never run at once: recording pauses while Maeve talks and resumes when she stops, avoiding echo.
- Controls stay available: pause, mute, stop speaking, and "Type instead". Leaving the screen still pauses; stopping still releases the microphone.

## 4. Live words while speaking

- While recording, the user's words appear on screen in real time under the mic control, so they can see they are being heard.
- When they stop, the audio is transcribed properly and that cleaned transcript is what gets sent to Maeve and stored in the thread (the live text is a preview only).
- If live recognition is unavailable in the browser, the mic still works exactly as it does today — just without the running preview.

## Technical notes

- Link ElevenLabs via the standard connector; server code reads `ELEVENLABS_API_KEY` and calls `https://api.elevenlabs.io/v1/text-to-speech/{voiceId}/stream?output_format=mp3_44100_128` with `eleven_turbo_v2_5` for low latency. New edge function `maeve-speak`; `narrate-briefing` stays as the fallback path and is untouched for other features.
- `useMaeveVoice.ts` gains: `voiceId` parameter, an `onSpeechEnd` callback for auto-resuming the mic, and a Web Speech API recognition stream exposing `interimTranscript` (final send still goes through `transcribe-audio`).
- `MaeveChat.tsx` handles the auto-greet/auto-listen loop and renders the voice picker plus interim text; `MaeveRecap.tsx` uses the same voice for the spoken summary.
- Selected voice stored in `localStorage` under `maeve-voice`; no schema change.
