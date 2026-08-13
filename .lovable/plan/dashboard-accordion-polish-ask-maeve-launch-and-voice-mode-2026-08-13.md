# Dashboard accordion polish + Ask Maeve launch and voice mode

## 1. Rounded accordion headings on the Dashboard

The green heading bars inside the **To-Do List** and **My Round Tables** cards currently render with square corners (the shared section-accordion trigger uses `rounded-none`).

- Add a rounded variant so the group headers (This week / This month / Older, and the Round Tables date groups) get soft rounded edges, with the item wrapper clipping to the same radius.
- Apply the rounded variant only on the Dashboard cards so the flat table-style accordions elsewhere (My Practice, Sessions, Documents, Patient Information) stay exactly as they are.
- Keep colours, padding, font sizes, count pills and open/close behaviour unchanged — corners only.

## 2. Ask Maeve does not launch

The sidebar button navigates to `/ask-maeve`, so the failure is in starting/loading an exploration rather than the route. First reproduce the exact failure in the browser (sidebar click → "Start an exploration" → first Maeve message), read the console and the edge-function response, then fix what the reproduction shows. Likely causes to check, in order:

- Session creation write rejected (row-level access rules on the Maeve session table for the doctor profile).
- The opening-greeting call failing silently and leaving a blank conversation.
- Errors swallowed instead of shown to the user.

Regardless of cause, the screen will end up with: a visible error message when a session cannot be created or the first message fails, and a retry control instead of an empty screen.

## 3. Let Maeve ask: type or talk

When an exploration opens, Maeve offers a choice before the conversation starts:

- **Type** — the current text conversation (unchanged default behaviour).
- **Talk and listen** — the user speaks their answers and hears Maeve's questions read aloud.

Talk mode behaviour:

- A large mic control replaces the send row. Tap to speak, tap to stop; the recording is transcribed and sent as the user's message, with the transcript shown in the thread so the user can see what was captured.
- Maeve's reply is read aloud automatically, with a stop-audio control and a mute toggle.
- The user can switch between Type and Talk at any point from a small toggle in the header — nothing is lost when switching.
- All existing safeguards stay: same facilitation logic, same non-advice governor, same private-to-patient rules. Voice is only an input/output channel.

## Technical notes

- Rounded variant added to `src/components/ui/section-accordion.tsx` and used by `src/components/dashboard/CompactTodoList.tsx` and the Round Tables card in `src/pages/Dashboard.tsx` / `DoctorRoundTables`.
- Voice input reuses the existing `transcribe-audio` edge function and the app's audio recording hook; spoken replies reuse the existing `narrate-briefing` text-to-speech function. No new AI provider or secret is needed.
- Mode choice is stored per session in local state (remembered for the browser), not in the database.
- Changes are confined to `src/features/ask-maeve/*`, the two dashboard components, and the shared accordion styles.
