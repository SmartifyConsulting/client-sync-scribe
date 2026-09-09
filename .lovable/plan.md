# Paused session card: add Stop, tighten spacing

## What changes

On the "Ready to Start" screen, the amber paused-session card gets:

1. **A Stop option** alongside Resume and Discard. Stop closes off the unfinished consultation properly: it loads the paused recording and notes, then runs the normal end-of-session flow (summary, AI clinician notes, documents), so the visit is saved into history instead of being thrown away. Discard stays as the "delete it" choice.
2. **Padding** between the card and the "Start New Session" button below it, so they no longer sit flush against each other.
3. **A more compact card** — tighter vertical padding, smaller heading and buttons, and the three actions on one row — so it takes noticeably less height.

Nothing else on the screen changes.

## Technical detail

In `src/pages/Sessions.tsx`:
- Add `stopPausedDraft()` which calls `startSession(pausedDraft)` to rehydrate transcript/notes/elapsed time, then immediately invokes the existing `endSession()` path so the standard post-session queue runs (summary → AI notes → prescription → … → Vula). Existing `deletePausedSession` cleanup on finalisation is unchanged.
- Card container: `p-4 space-y-2` → `px-3 py-2.5 space-y-1.5`, heading to `text-xs`, meta line unchanged, buttons `size="sm" h-7 text-xs` in a single `flex-wrap` row without the extra `pt-1`.
- Add `mt-4` (or wrap in a spaced container) before the `Start New Session` button.
- No schema, service, or business-logic changes.
