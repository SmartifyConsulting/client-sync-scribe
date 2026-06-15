
# Hospital/ER Vetting Form — Revisions (cumulative)

All previously-approved scope stays (type picker, license upload, pending approval review dialog, rename "Live Consultation" → "Transcribed Sessions", schema migration, storage bucket, country-code phone inputs, reversed "Same as" direction, green-framed sections). The additions below are layered on top.

## 1. Submission acknowledgement email to the requester

When a Hospital or ER vetting submission is created (from either the admin Create-User dialog OR the public hospital/ER signup page):

- Send a confirmation email to the **Hospital Administrator email** captured on the form.
- Single recipient, triggered by their own action → app email (transactional), not marketing.
- Template name: `provider-vetting-received`
- Subject: "We received your application — approval within 6 hours"
- Body content:
  - Greeting using `admin_full_name`
  - Confirmation that the application for `{organisation_name}` was received
  - Plain-English statement that the team reviews submissions and approval is normally completed **within 6 hours**
  - What happens next: a follow-up email on approval or with any questions
  - Footer signature (Holarc Health team)
- Brand styling pulled from existing `src/index.css` / Tailwind tokens; body bg `#ffffff`.
- Idempotency key: `provider-vetting-received-{provider_row_id}` so retries don't duplicate.
- Invoked via `supabase.functions.invoke('send-transactional-email', …)` right after the provider row + license upload succeed. Email failure does NOT roll back the submission — log a warning and continue (user still sees the in-app confirmation).

### Email infrastructure prerequisites
Before this email can send, the project needs:
1. An email domain
2. Email infrastructure set up
3. The transactional email scaffolding
4. The `provider-vetting-received` template registered

If any of those are missing at implementation time, set them up first (silently, no extra approval needed during build) and only then wire the trigger.

## 2. In-form "approval within 6 hours" notice

Inside `ProviderVettingForm.tsx`, above the submit button (and visible on both admin dialog and public signup page):

- A subtle info banner (icon + short text), not a toast:
  - Icon: `Clock` (lucide)
  - Text: **"We aim to approve all applications within 6 hours. You'll receive a confirmation email once submitted and a follow-up email once approved."**
  - Styling: `rounded-md border border-emerald-500/40 bg-emerald-50/60 text-emerald-900 text-sm p-3 flex gap-2 items-start` (dark mode: `dark:border-emerald-400/30 dark:bg-emerald-950/30 dark:text-emerald-200`) — matches the green-frame palette of the two sections.
- After successful submit, the existing success state on the dialog/page also displays the same 6-hour message + "Check your inbox at `{admin_email}` for confirmation."

## 3. Field order, country-code inputs, "Same as Hospital", green frames

Unchanged from the previously-approved revision:

- Hospital / Organisation section first (green frame, `Building2` icon header)
- Hospital Administrator section second (green frame, `UserCog` icon header)
- `PhoneNumberInput` (country code + number, E.164) for both hospital and administrator contact numbers
- Admin email and admin phone each have a "Same as Hospital …" checkbox that mirrors-and-locks the hospital value
- Frame styling: `rounded-lg border-2 border-emerald-500/60 bg-emerald-50/40 p-4 sm:p-5 space-y-4` (dark variants applied)

## 4. Out of scope (unchanged)

- Patient/Pharmacy simple form
- Pending Approval review dialog internals
- Schema migration & storage bucket
- "Live Consultation" → "Transcribed Sessions" rename
- Approval-notification email (separate template, not part of this submission flow)

## Technical notes

- New: `src/components/forms/PhoneNumberInput.tsx`, `src/lib/countryDialCodes.ts` (only if no existing source)
- New template: `supabase/functions/_shared/transactional-email-templates/provider-vetting-received.tsx` + registry entry in `registry.ts`
- `ProviderVettingForm.tsx`:
  - Two green-framed `<section>` blocks with reordered fields
  - `PhoneNumberInput` on both phone fields
  - "Same as Hospital" checkboxes with mirror-and-lock via react-hook-form `watch`/`setValue`
  - `Clock` info banner above submit
  - On successful submit: call `send-transactional-email` with `templateName: 'provider-vetting-received'`, `recipientEmail: admin_email`, `idempotencyKey`, and `templateData: { admin_full_name, organisation_name }`. Wrap in try/catch — never block submission on email failure.
  - Updated success-state copy referencing 6-hour SLA and confirmation email
- No DB schema, RLS, or new edge functions beyond the shared `send-transactional-email` (existing)
