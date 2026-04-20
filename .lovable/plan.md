

# Plan: Stop To-Do Preview Redirect + Add "Report Bug/Fix" for All Users

Two changes in one pass.

---

## Part 1 — Stop the To-Do list "Edit document" button from navigating away

### Why
On the To-Do list, the second icon next to a document task currently runs:
```ts
navigate(`/documents?view=${todo.document_id}`)
```
which jumps to the Patient Documents page (where Templates lives as a tab) and auto-opens the preview there. That's the "navigation to Templates" you're seeing.

### Fix
In `src/pages/TodoList.tsx`:
- **Remove** the redundant `FileText` "Edit document" button at line 576–578. The Eye / Preview button right beside it already opens the same document in an in-page modal via `<DocumentPreview>` — no navigation needed.
- (Approve & Save and Edit/Delete buttons stay unchanged.)

That's the entire change for Part 1. No new routes, no extra dialogs.

---

## Part 2 — Bring the "Report Bug/Fix" feature from **Jamit** into Holarc

Port the bottom-sheet feature so **both patients and doctors** can log bugs, fixes, and nice-to-haves while testing.

### Database (new migration)

Create `public.bug_reports`:

| column | type | notes |
|---|---|---|
| `id` | uuid PK, default `gen_random_uuid()` | |
| `created_at` | timestamptz, default `now()` | |
| `user_id` | uuid NOT NULL | reporter |
| `display_name` | text | snapshot of reporter name |
| `type` | text NOT NULL default `'bug'` | `bug` / `fix` / `nice_to_have` |
| `title` | text NOT NULL | short summary |
| `description` | text | optional details |
| `created_via` | text NOT NULL default `'typed'` | `typed` / `voice` (future) |
| `status` | text NOT NULL default `'open'` | `open` / `done` |

RLS:
- **SELECT**: `auth.uid() = user_id OR has_role(auth.uid(), 'admin')` — every user sees their own; admins see all.
- **INSERT**: `auth.uid() = user_id`.
- **UPDATE**: same as SELECT (so reporter or admin can mark done).
- No DELETE.

### New component: `src/components/feedback/ReportFixSheet.tsx`

Adapted from Jamit's `ReportFixSheet`, simplified for Holarc:
- Bottom `Sheet` (mobile-first, 80vh) with a header *"Report Fix"* + Beta badge.
- **Type selector**: 3 small toggle buttons — Bug / Fix / Nice-to-have (with `Bug`, `Wrench`, `Sparkles` lucide icons + colored left border on cards).
- **Text input + Send button** to submit a typed report (Enter submits, 300-char limit).
- **Outstanding list** below: searchable list of `status='open'` reports the current user can see, with type icon, title, description, reporter + date, and a green check button to mark as done.
- No voice recorder in v1 (Holarc already has its own recording stack; we can add later if wanted).
- No screenshot upload in v1 (keeps the migration minimal — column can be added later if needed).
- Uses Holarc's existing primitives: `Sheet`, `Button`, `Input`, `Badge`, `useAuth`, `useProfile`, `useToast`, `supabase` client.

### Trigger placement (visible to both roles)

Add a single icon button (lucide `Bug`) into:
- **`src/components/layout/TopBarIcons.tsx`** — desktop top-right icon row (already shown for both roles).
- **`src/components/layout/MobileHeader.tsx`** — mobile header icons.

Tapping the icon opens `<ReportFixSheet>` (state lives in each header). One implementation, both roles, both layouts.

### Out of scope for now
- Voice-dictated reports (would need a new edge function — defer).
- Screenshot uploads (defer; can add `screenshot_url` column + storage bucket later).
- Admin moderation page (admins already see all rows via RLS; they can mark done from the same sheet).

---

## Files touched

| File | Change |
|---|---|
| `src/pages/TodoList.tsx` | Remove the "Edit document" `FileText` button that navigated to `/documents?view=` |
| `supabase/migrations/<ts>_bug_reports.sql` | Create `bug_reports` table + RLS policies |
| `src/components/feedback/ReportFixSheet.tsx` | **new** — typed bug/fix/nice-to-have reporter + outstanding list |
| `src/components/layout/TopBarIcons.tsx` | Add `Bug` icon trigger + mount sheet |
| `src/components/layout/MobileHeader.tsx` | Add `Bug` icon trigger + mount sheet |

