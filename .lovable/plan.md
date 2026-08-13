# Maeve polish, session lifecycle, task noise and document previews

## 1. Ask Maeve — friendlier orange
The active/pressed state currently uses `--maeve-dark` (a deep burnt orange, HSL 27 87% 38%). Warm and brighten the accent tokens in the global stylesheet:
- `--maeve`: bright, appealing orange (approx. HSL 28 96% 54%)
- `--maeve-dark` (hover/active/press): approx. HSL 22 92% 46% — clearly darker than the base but no longer muddy/burnt
- Keep white text on both so contrast stays strong.
No component classes change; every `bg-maeve` / `hover:bg-maeve-dark` / `text-maeve-dark` usage picks this up (Sidebar, BottomNav, Maeve home, Maeve chat).

## 2. Maeve voice session lifecycle
Buttons on the Maeve chat voice bar: **Pause**, **Resume**, **Stop**.

- **Auto-pause on leaving the screen**: when the tab is hidden, the window loses focus, or the user navigates away from the Maeve chat, an in-flight voice recording is paused automatically and the microphone tracks are suspended. The session stays open (status unchanged) so the patient can return and continue where they left off.
- **Resume**: continues the same recording/session; nothing already captured is lost.
- **Stop**: ends the exploration — finalises the transcript, saves the session record, generates the PDF, then releases the microphone.
- **Microphone release**: `MediaStream` tracks are always stopped (and the recorder discarded) on Stop, on unmount, and when the recording ends for any reason — including the clinical session recorder, so no browser mic indicator lingers after a session ends.

## 3. Session record: PDF + transcript per session
On the Ask Maeve home list, each past session row gains:
- a transcript view/download action, and
- a PDF action that renders the saved transcript (title, date, full exchange) using the existing document PDF renderer,
alongside the existing share/email/delete actions.

## 4. Stop symptom/observation tasks
Clinical cautions such as "monitor for cardiovascular toxicity before discharge", "watch for signs of…", "observe/assess for symptoms of…" are being turned into to-do items. These are clinical notes, not tasks.
- Extend the task classifier (`src/lib/taskAssignee.ts`) with a "clinical observation" skip group: monitor/watch/observe/assess/look out for + symptoms/signs/toxicity/adverse reaction/deterioration/side effects, and bare symptom fragments.
- Applied at generation time, so no new symptom tasks are created from session action points.
- Existing symptom tasks already in the list are filtered out of the To-Do views by the same rule, so they disappear without needing a data cleanup.

## 5. To-Do previews of invoices and certificates
Previewing an invoice or medical certificate from the To-Do list shows unresolved placeholders. Fixes in the shared preview resolver:
- Look up the linked invoice by document id / patient when the document has no `session_id`, instead of only by session.
- Treat medical certificates, referrals and letters the same as invoices: always pass patient + practitioner + practice context so `[Patient Name]`, dates, registration number and signature resolve.
- Fall back to the most recent invoice for the patient when no direct link exists, so legacy documents still render real figures.

## Technical notes
- Files: `src/index.css` (tokens), `src/features/ask-maeve/hooks/useMaeveVoice.ts`, `src/features/ask-maeve/components/MaeveChat.tsx`, `src/features/ask-maeve/pages/AskMaeveHome.tsx`, `src/lib/taskAssignee.ts`, To-Do list views, `src/features/documents/lib/resolveDocumentPreviewContent.ts`, plus mic-release cleanup in the clinical session recorder.
- No database schema changes required.
