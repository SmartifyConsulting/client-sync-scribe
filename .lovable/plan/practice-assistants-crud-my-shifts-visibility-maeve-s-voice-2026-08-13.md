# Practice assistants CRUD, My Shifts visibility, Maeve's voice

## 1. Practice Management Assistant — full CRUD

The assistants panel in My Practice can currently only invite and remove. It becomes a proper management panel:

- **Invite by email** — email field with validation (proper address required), an "Invite assistant" button, and a clear confirmation. The invitation email is actually sent, and a failed send is reported instead of silently passing.
- **List** — each assistant row shows name, email/alias and status (Active / Pending).
- **Edit** — inline edit of the assistant's display name and contact number, plus a note field for their role in the practice.
- **Resend / revoke** — pending invitations get a "Resend" action next to "Revoke".
- **Remove** — confirmation dialog before an assistant loses practice access.

Styling follows the existing practice panels: 12px bold labels, bordered rows, no new colours.

## 2. "My Shifts" showing for Dean Allie

Verified in the data: Dean Allie has one active hospital link — a leftover demo row attaching him to "ZA Private Clinic" as a visiting orthopaedic doctor. The sidebar rule itself is correct; the row is what makes the item appear.

- Remove that stale affiliation row so his sidebar drops "My Shifts".
- Tighten the rule so only affiliations at a hospital that still exists count, and so the item stays hidden while the affiliation check is still loading (no flash of "My Shifts" on load).

## 3. Maeve's voice and pronunciation

- **Pronunciation** — before any text is spoken, "Maeve" is swapped for a phonetic spelling ("Meev") so she is pronounced MEEV. Only the spoken audio changes; the on-screen text still reads "Maeve".
- **Your own voice list** — the picker currently offers six hard-coded voices, which is why your soft Irish female voice never appears. It will instead load the voices from the connected ElevenLabs account (custom and library voices included), showing name and a short accent/description, with preview playback. The built-in six remain only as a fallback if the account list cannot be loaded.
- **Default** — the soft Irish female voice is selected as Maeve's default; the choice is remembered per browser and applies to the chat, the greeting and the recap screen.

## 4. Maeve session PDF at the end of every exploration

- Whenever an exploration ends — the user presses "Stop and close", or the session is closed from the list — a PDF of the conversation is generated and saved automatically, not only on request.
- The saved PDF appears on the exploration's recap card for download, alongside the plain-text transcript.

## 5. Maeve speaks while the words appear

- Instead of the reply appearing fully formed and then being read out, Maeve's answer types onto the screen as she speaks, so the words track the audio rather than lagging behind it.
- The typing keeps pace with the spoken audio and completes as soon as the audio finishes; the stop-audio control also stops the typing and reveals the full text.

## 6. Ask Maeve logo size

- The Holarc Health logo at the top of the Ask Maeve screen is enlarged to exactly match the logo above SOS (same width and spacing), so both screens look identical at the top.

## Technical notes

- Assistants panel: `src/components/practice/PracticeAssistants.tsx` plus `inviteMember`/`removeMember` extensions in `src/hooks/usePractice.ts` (profile update for edit, resend re-invoking `send-user-invitation`).
- Shift rule: `src/hooks/useHospitalAffiliation.ts` (join to hospital, expose loading) and the filter in `src/components/layout/Sidebar.tsx`; one data cleanup for the stale `hospital_doctor_affiliations` row.
- Voice: new `maeve-voices` edge function calling ElevenLabs `/v1/voices` with the existing connector key; `src/features/ask-maeve/lib/voices.ts` becomes a fallback list plus a phonetic-substitution helper used by `useMaeveVoice`; `MaeveVoicePicker` renders the fetched list.
- Auto PDF reuses the existing `maevePdf.ts` builder, triggered from the session-close path in `MaeveChat.tsx` and surfaced in `MaeveRecap.tsx` / `AskMaeveHome.tsx`.
- Typing-with-audio is a reveal timer in `MaeveChat.tsx` driven by the audio element's duration from `useMaeveVoice`.
- Logo sizing copied from `HolarcHelpHome.tsx` into `AskMaeveHome.tsx` / `MaeveChat.tsx`.

