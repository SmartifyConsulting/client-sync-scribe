# Preview icon on document tasks + dummy avatars

## 1. Why "Review Medical Certificate" shows no eye icon

The to-do row only renders the eye (preview) button when the task carries a linked
document (`document_id`) and a preview handler is supplied. Both the dashboard list and
the Tasks page do pass the handler, and recent "Review Medical Certificate ..." tasks in
the database do have a `document_id` — so the rows in the screenshot are most likely
document-review tasks whose document link is missing (older/AI-created tasks saved as a
plain task), not a wiring bug.

Fix:

- First step: confirm by checking the exact tasks visible on the dashboard — if their
  `document_id` is null, that is the cause.
- Make the eye appear for any task whose type is a document review, not only when a
  document id is stored. When the id is missing, resolve the document at preview time by
  patient + document type + nearest date, and show a clear "document not found" message if
  nothing matches.
- Keep the eye visible in both the compact dashboard list and the full Tasks page, on
  desktop and mobile.

## 2. Dummy avatar photos

Give every user without an avatar a friendly placeholder photo, except users who signed up
from Nigeria (profile country `NG` or a `+234` mobile number) — those stay without a photo.

- Generate a small set (about 8–10) of neutral, diverse portrait-style avatar images and
  host them as project assets.
- Backfill: for every profile with no `avatar_url`, excluding Nigerian signups, assign one
  of the placeholder images deterministically (same user always gets the same face).
- New signups follow the same rule automatically, so a new non-Nigerian user starts with a
  placeholder instead of blank initials.
- Users can still upload their own photo, which replaces the placeholder permanently.

## Technical notes

- Row logic lives in `src/components/todos/TodoRow.tsx`; callers are
  `src/pages/TodoList.tsx` and `src/components/dashboard/CompactTodoList.tsx`.
- Avatar backfill is a database migration updating `profiles.avatar_url` where it is null
  and `lower(country) <> 'ng'` and mobile does not start with `+234`; assignment uses a
  hash of the profile id over the placeholder list. New-user defaulting is added to the
  existing signup profile trigger.
- Placeholder images are generated once and stored as CDN asset pointers under
  `src/assets/`.
