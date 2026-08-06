# Past Sessions polish, unified session view, admin-only deletion

## 1. Past Sessions frame (Sessions screen)

- Bold the key clinical terms in each summary line. Session summaries already carry `<condition>`, `<med>` and `<symptom>` markers; instead of stripping them, render the tagged terms in bold and the rest as normal text.
- Remove the fixed `max-h-64` scroll box and the 2-line clamp so the frame grows with its content and each summary is fully readable.
- Keep the date as the hyperlink into that session.

## 2. Opening a past session looks like the post-session screen

Today `/sessions/:id` renders a different layout to the one shown right after a recording ends, which forces the doctor to re-learn the screen.

Rework the session detail page to mirror the completed-session layout:

```text
[ Patient + session header ]
[ Session Transcript (collapsed accordion) + audio playback ]
[ AI Summary ][ Action Points ]
[ AI Clinician Notes (4 columns) ]
[ Documents from this session — Preview / Send / Save ]
```

- Reuse the same components the active session screen uses for the completed state (transcript accordion, summary block, action points, clinician notes, generated-documents grid) so fonts, spacing and framing match exactly.
- The detail page stays read-only for the recording controls (no record/pause), but keeps existing editors for prescriptions, invoices, certificates and referrals.

## 3. Sessions can only be deleted by a system admin

- Database: replace the current "users can delete their own sessions" rule with one that only allows deletion by a user holding the admin role. Doctors and patients keep read/update access.
- UI: hide the Delete Session button on the session detail page unless the signed-in user is an admin, and show a short note that session records are permanent.

## Technical notes

- `src/pages/Sessions.tsx`: Past Sessions list — tag-aware bold renderer, remove `max-h-64` and `line-clamp-2`.
- Extract the completed-session blocks from `src/pages/Sessions.tsx` into shared components under `src/features/sessions/components/` so both `Sessions.tsx` and `src/pages/SessionDetail.tsx` render identical markup.
- `src/pages/SessionDetail.tsx`: adopt the shared layout; gate Delete behind `useIsAdmin()`.
- Migration: drop policy `Users can delete their own sessions` on `public.sessions`, add a delete policy for `authenticated` using `has_role(auth.uid(), 'admin')`.
