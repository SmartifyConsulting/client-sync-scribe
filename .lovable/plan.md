## Goal

1. Add a "What kind of user?" step before the create-user form in Admin.
2. When the chosen type is **Hospital** or **Emergency Service Provider (ER / ambulance)**, show a vetting form that captures everything needed to review the organisation, including a **certified copy of the license** upload.
3. Submissions land in **User Admin** as **Pending Approval**, with a review dialog that shows all submitted info + a viewable license file before approving / rejecting.
4. Rename the existing **"Live Consultation"** label to **"Transcribed Sessions"** everywhere in the UI.

## Part A — Type picker (step 1 of Create User)

`CreateTestUserDialog` becomes two-step. Step 1 = "What type of user are you creating?" with 4 radio-cards:

- **Patient** → role `patient`
- **Hospital** → role `hospital_staff` (+ vetting form)
- **Emergency Service Provider** → role `ambulance_staff` (+ vetting form)
- **Pharmacy** → role `pharmacy_staff`

Step 2 = chosen-type label + Back, then the simple form (Patient / Pharmacy) or the vetting form (Hospital / ESP). The same vetting form is also used on the public hospital/ER signup page.

## Part B — Hospital / ER vetting form

Fields (all required unless noted):

**Administrator (becomes the user account)**

- Administrator full name
- Administrator email
- Administrator contact number

**Organisation**

- Organisation name ("Hospital name" / "ER / Ambulance service name")
- Physical address (multi-line text)
- License / registration number
- Directors — repeatable `{ full_name, role? }`, ≥1 required
- Organisation contact number — "Same as administrator" checkbox
- Organisation email — "Same as administrator" checkbox

**License attachment**

- "Upload certified copy of license"
- Accepts `application/pdf, image/jpeg, image/png` — max 10MB — required
- Stored in private bucket `provider-licenses` at `pending/{owner_user_id}/{ts}-{safe-filename}`

**Account options** (admin dialog only; hidden on public signup)

- Auto-generate password / manual password
- Email credentials to administrator

## Submission flow

1. Zod validation (incl. file size + mime + ≥1 director).
2. Create / find auth user — admin path: `admin-set-user-password`; public path: standard `signUp`.
3. Upload license to `provider-licenses/pending/{user_id}/...`.
4. Insert pending row into matching provider table (`holarchelp_hospitals` or `holarchelp_ambulance_providers`) with new columns populated.
5. Insert role row in `user_roles`. Existing `holarchelp_approve_hospital` / `holarchelp_approve_ambulance` RPCs handle final approval.

## Part C — Pending Approval in User Admin

- New **"Pending approval"** badge on rows owning a hospital / ESP record with `status='pending'`.
- **Review** button opens `PendingProviderReviewDialog`:
  - All submitted fields, directors list, admin + org contacts.
  - License: image thumbnail or PDF icon + **"Open license"** → short-lived signed URL from private bucket.
  - **Approve** (existing RPC) / **Reject** (sets `status='rejected'` + optional `rejection_reason`).
- After action: dialog closes, list refetches, badge updates.
- `usePendingProviderSubmission(userId)` hook fetches the provider row by `owner_id`.

## Schema changes (single migration)

Add to BOTH `public.holarchelp_hospitals` and `public.holarchelp_ambulance_providers`:

- `directors jsonb not null default '[]'::jsonb`
- `license_file_path text`, `license_file_mime text`, `license_file_size_bytes integer`
- `admin_full_name text`, `admin_email text`, `admin_phone text`
- `rejection_reason text`

## Storage

- Private bucket `provider-licenses` (via `supabase--storage_create_bucket`).
- RLS on `storage.objects` for `bucket_id='provider-licenses'`:
  - INSERT: authenticated, path must start `pending/{auth.uid()}/`.
  - SELECT / DELETE: file owner OR admin.
- Admin opens files via short-lived signed URLs.

## Part D — Rename "Live Consultation" → "Transcribed Sessions"

UI/copy-only rename — no DB / route / type changes.

- Find every user-facing occurrence of the string `Live Consultation` (and variants: `Live consultation`, `live-consultation`-style headings, related descriptions like "Start a live consultation") across `src/**` and replace with `Transcribed Sessions` (singular form `Transcribed Session` where currently singular).
- Includes: sidebar / nav items, page headings, buttons, empty-state copy, tooltips, toasts, dashboard cards, dialog titles, tour / screen-tip copy in `src/lib/screenTips.ts`.
- Do **not** rename: file names, component names, routes, database tables/columns, `sessions` table fields, event/log type strings, edge function names, or i18n keys — only the displayed text.
- Use `rg -n "Live [Cc]onsultation"` to enumerate hits before editing; verify with the same search after edits.

## Files touched

- `src/features/admin/components/CreateTestUserDialog.tsx`
- `src/features/admin/components/ProviderVettingForm.tsx` (new)
- `src/features/admin/components/PendingProviderReviewDialog.tsx` (new)
- `src/features/admin/components/UsersTab.tsx`
- `src/features/admin/hooks/usePendingProviderSubmission.ts` (new)
- Public hospital / ER signup page — swap in `ProviderVettingForm`
- Migration adding the new columns + storage policies
- Various UI files for the "Live Consultation" → "Transcribed Sessions" rename (enumerated via ripgrep at edit time)

## Out of scope

- Pharmacy vetting form / license upload.
- Multiple license files or versioning.
- Editing pending submissions after creation (reject + resubmit instead).
- Structured address / map autocomplete.
- Renaming routes, components, DB fields, or i18n keys related to "Live Consultation" — display copy only.