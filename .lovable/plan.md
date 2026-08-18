# Sessions privacy notice

Add a prominent privacy notice to the Sessions screen so doctors immediately understand who can see what.

## The notice

Displayed at the top of the Sessions screen, above the patient selector / recording area, as a bordered callout (shield icon, primary teal border, muted background — no new colours):

> **Your sessions are private.** Only you can see the sessions on this screen — no other practitioner has access to it.
> The patient is the only other person who can access the recording and transcript. Recordings are automatically deleted after 7 days.
> Other practitioners only ever receive a high-level AI summary of the session.

Compact on mobile (smaller text, same three lines), full width on desktop.

## Where it appears

- `/sessions` (the recording/session workspace) — primary placement.
- `/my-sessions` (session history list) — same callout under the page heading, so the reassurance is present wherever a doctor browses sessions.

## Technical notes

- New presentational component `src/features/sessions/components/SessionPrivacyNotice.tsx`, rendered by `src/pages/Sessions.tsx` and `src/pages/MySessions.tsx`.
- Copy goes through `t()` with English fallbacks and new `sessions.privacy.*` keys in `src/i18n/locales/en.json`.
- Presentation only — no changes to data access rules, retention jobs, or queries.

# Landing hero image swap

Replace the current hero visual on the landing page with the newly uploaded ChatGPT image.

- Upload the new image as a CDN asset pointer (`src/assets/holarc-hero.png.asset.json`) and swap the `src` currently rendering `holarc-capabilities-wave.png` in `src/pages/Landing.tsx` (line ~305).
- Keep the existing hero container sizing, rounding and alt text approach; only the image source changes.
- Retire the old capabilities-wave pointer once nothing else references it.
