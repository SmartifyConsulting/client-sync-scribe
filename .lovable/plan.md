## Goal

Split password recovery by how the user signed up:

- **Email users** → existing Supabase email reset (Forgot Password sends a link, /reset-password sets a new one). Nothing new to build.
- **Phone-only users** (synthetic `<digits>@phone.holarc.local`) → recover with a **one-time backup code** issued during authenticator enrolment. If they've also lost the codes → **admin reset** safety net.

Plain-language wording everywhere — assume the user is not tech-savvy.

---

## 1. Backup codes at authenticator enrolment (phone users)

### Database
New table `mfa_backup_codes`:
- `user_id` (uuid, FK auth.users)
- `code_hash` (text — SHA-256 of the code; never store plaintext)
- `used_at` (timestamptz, null until consumed)
- `created_at`

RLS: service_role only. Codes are read/written exclusively by edge functions.

### Enrolment UX (after the user scans the TOTP QR and confirms their first 6-digit code)
A new screen — shown **only** to phone-signup users — titled **"Save your backup codes"** with this copy:

> "Your authenticator app lives on your phone. If you lose your phone, you'll be locked out — unless you save these backup codes now.
>
> A backup code is a one-time password you type instead of the 6-digit code from your app. Each one works once, then disappears. Treat them like cash: store them somewhere safe (a note in your wallet, a printed sheet at home, a password manager).
>
> We'll show you 8 codes. You need them only if you lose your phone."

Actions on the screen:
- 8 codes shown in a monospace 2-column grid
- **Copy all**, **Download .txt**, **Print** buttons
- A required checkbox: *"I've saved my backup codes somewhere safe"* — Continue button stays disabled until ticked
- Codes shown **once** and never again (cannot be re-displayed; only regenerated, which invalidates the old set)

Edge function `mfa-backup-codes-generate`:
- Auth required (logged-in user mid-enrolment)
- Generates 8 codes (format `XXXX-XXXX`, base32, ~40 bits each)
- Stores SHA-256 hashes in `mfa_backup_codes`
- Returns plaintext codes **once** in the response

A "Regenerate backup codes" link in **My Practice → Security** lets the user wipe & reissue (also reusing this function).

### Recovery flow change
`/forgot-password` step 2 currently asks for a 6-digit TOTP code. For phone identifiers, add a small link below the input:

> "Lost your authenticator? **Use a backup code instead.**"

Clicking it swaps the input to accept an 8-character backup code. The existing `auth-recovery-reset` edge function gains a `code_type: 'totp' | 'backup'` field:
- `totp` → existing OTPAuth validation
- `backup` → hash the input, look up an unused row in `mfa_backup_codes` for that user, mark `used_at = now()` atomically (single UPDATE returning the row), proceed with password update

Same rate limiting (`auth_recovery_attempts`) and audit logging (`auth_recovery_audit`) apply.

### Email users — explicitly untouched
- `/forgot-password` detects "@" in identifier → calls `supabase.auth.resetPasswordForEmail()` and shows "Check your inbox" (this is the **original** Supabase flow, not the TOTP path).
- `/reset-password` works as it always has.
- No backup codes shown to email users at MFA enrolment (TOTP for them is optional and they have email recovery).

---

## 2. Admin reset safety net (phone users who lost both phone AND backup codes)

In the Admin Hub user management table, add a per-user **"Reset access"** action (visible to admins only) that opens a confirmation dialog:

> "This will:
> 1. Unenrol the user's authenticator app
> 2. Wipe their backup codes
> 3. Set a temporary password that you'll share with them
>
> They'll set a new password and enrol a new authenticator at next sign-in. Only do this after verifying their identity (ID document, video call, or known clinical details)."

Edge function `admin-reset-mfa`:
- Requires `has_role(auth.uid(), 'admin')`
- Calls `auth.admin.mfaAdminDelete` (or equivalent) on every TOTP factor for the target user
- Deletes all rows from `mfa_backup_codes` for that user
- Generates a 12-char temporary password, sets it via `auth.admin.updateUserById`
- Returns the temp password **once** to the admin UI (shown in a copy-to-clipboard box with "Share this with the user through a secure channel")
- Inserts an `auth_recovery_audit` row tagged `admin_reset`

On next sign-in, the existing `MfaGate` sees no enrolled factor → routes the user through enrolment → fresh QR + new backup codes.

---

## 3. Plain-language polish (non-technical users)

- Tooltip next to "Backup codes" everywhere: *"One-time codes you use if you ever lose your phone."*
- Forgot-password identifier step shows two helper lines under the field:
  - For email: *"We'll email you a reset link."*
  - For phone: *"We'll ask for a code from your authenticator app — or a backup code if you've lost your phone."*
- Replace any reference to "TOTP" in user-facing copy with "authenticator app".
- Add a short **Help → Recovering your account** page reachable from `/forgot-password` and the enrolment screen, explaining the difference between authenticator codes and backup codes in two short paragraphs.

---

## 4. Technical details (internal)

**Files to create**
- `supabase/migrations/<ts>_mfa_backup_codes.sql` — table, GRANTs, RLS, service_role policy
- `supabase/functions/mfa-backup-codes-generate/index.ts`
- `supabase/functions/admin-reset-mfa/index.ts`
- `src/pages/mfa/BackupCodesScreen.tsx` — shown after first TOTP verification for phone users
- `src/components/admin/ResetUserAccessDialog.tsx`
- `src/pages/help/AccountRecoveryHelp.tsx`

**Files to edit**
- `src/pages/ForgotPassword.tsx` — branch on identifier: email path uses `resetPasswordForEmail`; phone path keeps the 3-step TOTP flow + adds "Use a backup code" toggle
- `supabase/functions/auth-recovery-reset/index.ts` — accept `code_type`, add backup-code branch
- `src/pages/MfaEnroll.tsx` (or equivalent) — chain into BackupCodesScreen for phone users
- Admin Hub user table — add Reset access action

**Out of scope**
- SMS, email magic links, security questions, NOK approval, recovery codes for email users
- Changing the email reset flow at all
- Backup codes for users who already enrolled before this ships → handled by the "Regenerate backup codes" link in Security settings (they'll be prompted on next login via a one-time banner: "Add backup codes to protect your account")
