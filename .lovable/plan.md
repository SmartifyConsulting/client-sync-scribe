# Maeve & SOS branding, voice explainer, transcript export

## 1. Logo alignment
- Use the hero-page Holarc Health logo (`holarc-health-logo.png` asset) on the SOS / HolarcHelp home screen, replacing the current `holarc-help-logo.png` image.
- Add the same logo centred above the "Ask Maeve" heading on the Ask Maeve home screen (and at the top of a session view header), sized consistently.

## 2. Explain the value of talking vs typing
On the Type / Talk-and-listen mode chooser (and as a short note in the session header when switching modes), add copy:
- Talk and listen: lets you close your eyes and sink into the process, so the conscious mind isn't distracted by a screen or keyboard. Because imagining, remembering and visualising are central to the work, speaking and listening go far deeper.
- Type: better when you have no privacy, or when you'd rather stay quiet.

## 3. Save, share and email the transcript
On a Maeve session:
- "Save transcript" — downloads a clean, formatted text/PDF-style transcript of the conversation (timestamped, You / Maeve labels, session title and date).
- "Share" — uses the device share sheet (Web Share API) so it can go to WhatsApp, Messages, etc.; falls back to copying the transcript to the clipboard on desktop.
- "Email to me" — sends the transcript to the signed-in user's email via the existing email edge function.
- A privacy reminder next to these actions: once shared, the content leaves this private space.

## 4. Delete sessions
- Delete action on each row of the Ask Maeve session list and inside a session (overflow menu), with a confirmation dialog.
- Deletes the session and its messages; existing row-level rules already restrict deletion to the session owner.

## Technical notes
- Logo import: reuse the `holarc-health-logo.png.asset.json` URL pattern used by the landing page.
- Files: `src/modules/holarchelp/pages/HolarcHelpHome.tsx`, `src/features/ask-maeve/pages/AskMaeveHome.tsx`, `src/features/ask-maeve/pages/AskMaeveSession.tsx`, `src/features/ask-maeve/components/MaeveChat.tsx`.
- Transcript building lives in a small `transcript.ts` helper in `src/features/ask-maeve/`.
- Email uses a new lightweight edge function (or the existing document email sender) with the transcript as the body; no transcript content is persisted outside the existing message rows.
- Deletion: delete child messages/anchors/outcomes then the session (or rely on existing cascade); no schema change needed.
