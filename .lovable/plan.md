

# Plan: Fix preview formatting, add Documents-tab actions, merge session frames, smarter MC dates

Four small, contained fixes.

## 1. Document preview shows raw `<b>...</b>` tags

**Root cause:** In `src/components/sessions/DocumentPreview.tsx`, the `renderHeaderFooterSection` helper renders each header/footer cell's text with plain JSX (`{cell.text}`), so React escapes `<b>BORDER ORTHOPAEDICS</b>` and prints the markup verbatim — exactly what the screenshot shows.

The body content elsewhere already uses `renderFormattedContent` + `dangerouslySetInnerHTML`. The header/footer cells just don't.

**Fix:** Render each cell's text through the existing safe formatter:

```tsx
{cell.text && (
  <div
    style={{ fontSize: '9pt', lineHeight: 1.4, fontFamily }}
    dangerouslySetInnerHTML={{ __html: renderFormattedContent(cell.text) }}
  />
)}
```

`renderFormattedContent` already whitelists `<b>`, `<i>`, `<u>`, `<br/>` etc. and is sanitized with DOMPurify, so this is safe.

**Knock-on fix:** Apply the same change to the inline header/footer renderer in `src/pages/Documents.tsx` (`renderHFSectionPreview`, ~line 299) so the Templates → Preview view matches.

## 2. Documents tab — Edit + Preview + Send for doctors

The doctor-facing **Patient Documents** list at the bottom of `src/pages/Documents.tsx` already has Preview, Edit, Share (Send), Download, Delete buttons (lines 613–670), and the Send button already targets `send-document-email`. But:

- **Preview uses a basic `Dialog`** that doesn't render the letterhead/header-footer the same way the To-Do preview does — so it looks inconsistent with the home-page preview the user likes.
- **Edit opens an inline name/content textarea** rather than the full editor.

**Fix:**

- Replace the existing custom `previewDocument` `<Dialog>` in `Documents.tsx` with the same `<DocumentPreview>` component used by `TodoList` and the session editors. It already supports Print and Share-via-email, so the **Send** action becomes available right inside the preview too. Resolve `headerFooter` via the existing `useDocumentHeaderFooter` hook (already imported) keyed on `{ user_id: doc.user_id, template_name: doc.template_name }`.
- Keep the standalone `Send` (green arrow) and `Edit` icons in the row exactly as they are today — they already work and match the home-page row layout. Just verify the Send icon is the green `<Send>` for unsent docs (already the case at line 646) and `ArrowUpRight` muted once sent.

## 3. Merge "Session Notes" + "Session Recording" into one frame

In `src/pages/SessionDetail.tsx` there are currently three separate framed sections after the AI Summary:

1. **Session Recording** (audio player + retention warning) — lines 418–460
2. **Full Transcription** (color-coded transcript) — lines 537–583
3. **Session Notes** (manual `session.notes`) — lines 585–591

**Fix — collapse into one card titled "Session Notes":**

```text
┌─ Session Notes ─────────────────────────────────────────┐
│  [purple Volume2 icon]  Audio + transcript + notes      │
│                                          [Download ▾]   │
│  ───────────────────────────────────────────────────    │
│  <audio controls />            ← only if audio_url      │
│  ⚠ 7-day retention notice                              │
│  ───────────────────────────────────────────────────    │
│  Transcript                            [Download .txt]  │
│  Dr. Allie:  ...                                        │
│  Patient:    ...                                        │
│  ───────────────────────────────────────────────────    │
│  Manual notes                                           │
│  <whitespace-pre-wrap notes>                            │
└─────────────────────────────────────────────────────────┘
```

Implementation:
- Replace the three `rounded-xl border border-primary bg-card p-6` blocks with a single one whose header reads **Session Notes** + small subtitle "Audio, transcript, and manual notes from the consultation".
- Inside, render three subsections separated by `<hr className="my-4 border-border/60" />`, each only mounted when its data exists (`audio_url`, `transcript`, `notes`). If none exist, fall back to the existing empty-state card (line 594) — its condition stays the same.
- Move the per-subsection download buttons (audio + transcript) into a single right-aligned dropdown in the card header, with options "Download audio" and "Download transcript", each disabled when its source is missing. The transcript download still produces the same `.txt` blob; the audio download still uses `signedAudioUrl`.
- Section headings inside the card use small `text-sm font-semibold text-muted-foreground` labels (Audio · Transcript · Notes) so the visual hierarchy stays clear without three separate frames.

No changes to the data model, the recording flow, or the 7-day retention rule.

## 4. Medical Certificate — smarter default dates

In `src/components/sessions/MedicalCertificateEditor.tsx`, `startDate` and `endDate` both default to today. The user wants:

- **Start date** = the **session date** (when the session actually happened), not today.
- **End date** = the **return-to-work date** if it can be inferred from the session AI summary; otherwise today.

**Fix:**

- The component already accepts `sessionId` and fetches `sessions.summary`. Extend that fetch to also pull `started_at`:

  ```ts
  .from('sessions')
  .select('summary, started_at')
  .eq('id', sessionId)
  .maybeSingle();
  ```

  Then `setStartDate(format(new Date(data.started_at), 'yyyy-MM-dd'))` and `setExaminationDate(...)` to the same value, overwriting today's default whenever a session is attached.

- For the end date, broaden the existing summary regex to recognise common phrasings the AI emits and patient-side language used during dictation:
  - `return[_\s]?to[_\s]?work[:\s]*(\d{4}-\d{2}-\d{2})`
  - `back[_\s]?to[_\s]?work[:\s]*(\d{4}-\d{2}-\d{2})`
  - `fit[_\s]?for[_\s]?duty[:\s]*(\d{4}-\d{2}-\d{2})`
  - the existing `to_date` / `leave from … to …` patterns
  - relative expressions (`for 5 days`, `for one week`) — when matched, compute `endDate = startDate + N days`.

  First successful match wins, in the order above.

- If no end date can be inferred, leave it equal to start date (current behaviour) so the doctor types it manually. The "Period:" hint underneath updates live as before via `computeLeavePeriod`.

When the editor is opened **without** a `sessionId` (rare — direct doc creation), behaviour stays exactly as today.

## Files touched

| File | Change |
|---|---|
| `src/components/sessions/DocumentPreview.tsx` | Render header/footer cell text through `renderFormattedContent` + `dangerouslySetInnerHTML`. |
| `src/pages/Documents.tsx` | Swap the custom preview `Dialog` for `<DocumentPreview>` (gives consistent letterhead + Send + Print). Apply the same `renderFormattedContent` fix to `renderHFSectionPreview`. |
| `src/pages/SessionDetail.tsx` | Merge Session Recording + Full Transcription + Session Notes into a single "Session Notes" card with internal subsections and a single download dropdown. |
| `src/components/sessions/MedicalCertificateEditor.tsx` | Default `startDate`/`examinationDate` to the session's `started_at`; widen end-date regex to cover return-to-work / back-to-work / fit-for-duty / "for N days" patterns. |

## Out of scope

- Re-architecting the document editor (`DocumentEditor` modal stays — only the preview path changes).
- Changing the 7-day audio retention policy or the auto-email-to-employer flow.
- Patient-facing Documents page (this request is about the doctor view).

