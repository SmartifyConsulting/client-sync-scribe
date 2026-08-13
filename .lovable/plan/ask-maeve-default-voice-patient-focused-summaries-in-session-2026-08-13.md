# Ask Maeve: default voice, patient-focused summaries, in-session delete

## 1. Default voice = Nova, saved to my profile

Today the voice is remembered only in this browser's local storage, and the built-in default is "Sarah" — which is why Maeve doesn't sound like the voice you picked.

Changes:
- Make **Nova** the default voice for every profile. Nova is the voice name in the fallback speech engine; when ElevenLabs is available Maeve uses the closest warm-female match, so all profiles start with the same Nova-style voice.
- Save the chosen voice to the signed-in user's profile (Ask Maeve only — it does not affect any other voice or dictation feature in the app), so it follows them across devices and every new exploration.
- Load order at session start: my saved profile voice → Nova default. Local storage becomes only a fast cache.
- The voice picker keeps its preview buttons, custom ElevenLabs voice ID box, and now writes to the profile.

## 2. Summaries reflect what the patient said, not what Maeve did

Both the closing reflection and the resume recap currently summarise the whole conversation, including Maeve's questions and moves.

Changes:
- The transcript sent for summarising is built from the person's own turns; Maeve's turns are only given as brief context so the summary reads coherently.
- The instructions are tightened: describe what the person said, felt, wanted and explored, in their own words. Never describe Maeve's questions, techniques or process. No advice, interpretation, diagnosis or praise.
- Applies to the end-of-session reflection, the resume recap and the summary stored on the exploration record (so the PDF and the explorations list show the same patient-centred text).

## 3. Delete within a session

- Add a bin icon next to the exploration title at the top of the session, opening the same confirm dialog as the existing bottom "Delete exploration" button.
- Add a small delete control on each message in the transcript (hover/tap reveal) so a single turn can be removed — with a confirm step, since it is permanent. Deleting a turn removes it from the stored conversation, so later summaries and the PDF no longer include it.

## Technical notes

- New column on the patient/profile record (or a small `ask_maeve_preferences` row keyed by `user_id`) storing `voice_id` and `voice_label`, with owner-only access rules and the standard grants.
- `src/features/ask-maeve/lib/voices.ts`: default id becomes the Nova-mapped voice; `getStoredVoiceId` gains an async profile-backed loader; `storeVoiceId` also persists to the database.
- `useMaeveVoice.ts` hydrates the voice from the profile before the first spoken line so the greeting already uses it.
- `supabase/functions/ask-maeve-summary/index.ts`: transcript construction and both system prompts updated.
- `MaeveChat.tsx`: header delete button, per-message delete with confirm, optimistic removal then reload.
