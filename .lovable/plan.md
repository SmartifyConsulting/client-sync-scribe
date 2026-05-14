## Goal

When logged in as **Georgia Adams** (admin), the avatar dropdown shows a **"Switch profile (admin)"** section that signs you in as any curated test user with one click — no password.

## Curated test profiles (final)

| Display | Role | Email | Status |
|---|---|---|---|
| Georgia Adams | Admin | `info@georgiaadams.co.za` | exists ✅ |
| Dean Allie | Doctor | `sme@smartify.co.za` | exists ✅ |
| Dean Allie | Patient | `dean.allie@gmail.com` | auth user exists; profile self-heals ✅ |
| Shannon Kennedy | Patient | `projectmanager@smartify.co.za` | exists ✅ |
| Paraskevi Soldatos | Patient | `paraskevoulasoldatos@gmail.com` | exists ✅ |
| **Xtina** | Doctor | `xtina@smartify.co.za` | **to be created** |
| **Zano** | Hospital | `zano@smartify.co.za` | **to be created** |
| **Renken** | Ambulance | `renken@smartify.co.za` | **to be created** |

## Implementation steps

### 1. Create the three new auth users
For each new email, generate an auth user with a random password and seed the role-specific minimal records:
- **Xtina** → `auth.users` + `profiles` (`role='doctor'`) + `user_roles('doctor')`. Profile-completion banner will prompt for specialty/practice number.
- **Zano** → `auth.users` + `user_roles('hospital_staff')` + `holarchelp_hospitals` row owned by Zano (status `pending` so admin-approval flow still works, OR `approved` for instant testing — I'll use `approved` so the test login works immediately). Banner prompts for registration_number/address/contact_phone/services.
- **Renken** → `auth.users` + `user_roles('ambulance_staff')` + `holarchelp_ambulance_providers` row owned by Renken (`status='approved'`).

### 2. New edge function `admin-impersonate`
Modeled on `admin-delete-user`:
- Validates JWT + `has_role(caller, 'admin')`.
- Accepts `{ email }`, returns `{ email, token_hash }` from `auth.admin.generateLink({ type: 'magiclink' })`.
- Service-role client; CORS; Zod validation.

### 3. Client switcher in `src/components/layout/TopBarIcons.tsx`
- Add `useIsAdmin()` hook.
- Avatar popover gains a **"Switch profile (admin)"** section above Settings, listing the 8 profiles with role chips. Active row is highlighted/disabled.
- Click handler: invoke `admin-impersonate` → `signOut()` → `verifyOtp({ email, token_hash, type: 'magiclink' })` → `window.location.href = '/'`.

## Files

- **new** `supabase/functions/admin-impersonate/index.ts`
- **new** migration / data inserts to create the three users
- **edit** `src/components/layout/TopBarIcons.tsx` (+ small `useIsAdmin` hook)

---

## Separate question — email sender (`no-reply@auth.lovable.cloud` → Holarc Health)

Today there is **no verified sender domain** for Holarc Health, so auth emails fall back to the platform default. What's actually configured:
- `holarchealth.com` — not added as a sender domain.
- `nigeria.holarchealth.com` — `initiated` (DNS not finished).
- `biolog.co.za` — `provisioning_failed`.
- Mailgun connector is connected, but **nothing wires Mailgun into auth emails** yet.

You have two clean paths — pick one and I'll execute it in the same pass:

### Option A — Lovable Emails on a Holarc Health subdomain (recommended)
- Add **`notify.holarchealth.com`** (or another subdomain you choose) via the email setup dialog. DNS, DKIM/SPF and the auth-email-hook are provisioned automatically.
- Auth emails arrive from e.g. **`no-reply@notify.holarchealth.com`** — branded, queued, retried, logged.
- One caveat: this delegates that subdomain's DNS to Lovable's nameservers. As long as your **Mailgun domain is different** (e.g. `mg.holarchealth.com` or the root), there is no conflict.

### Option B — Keep Mailgun, route auth emails through it
- Custom `auth-email-hook` edge function formats each auth email and POSTs through the Mailgun connector gateway using your existing `MAILGUN_API_KEY`.
- Stays on whatever Mailgun domain you've already verified.
- More moving parts: I own the templates, retry logic, and DKIM health stays on your side in Mailgun.

> Most projects pick **A** (one-click, managed deliverability). Mailgun stays useful for marketing/bulk on a different subdomain.

## What I need from you to proceed

1. Confirm I should create Xtina/Zano/Renken with the role data above (Zano + Renken set to `approved` so they can log in immediately).
2. Pick **A** or **B** for the auth email sender. If A, confirm the subdomain (default suggestion: `notify.holarchealth.com`).
