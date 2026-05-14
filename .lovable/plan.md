# End-to-End Signup & Auth Test Plan

I'll run this as a live browser test against the preview, one user at a time, pausing for you to confirm email verification before proceeding to login.

## Per-user flow (repeated 5x)

For each user (Paraskevi → Anastasia → Xtina → Zano → Renken):

1. **Open signup** — navigate browser to `/auth` (signup tab)
2. **Fill form** — name, email, role selector, generated 16-char password (saved in summary so you have it)
3. **Submit** — capture network response, console errors, success toast
4. **Backend verification** (via DB queries):
   - `auth.users` row created with correct email + metadata
   - `profiles` row exists with correct `role`
   - `user_roles` row(s) match expected role
   - `auth_emails` queue / `email_send_log` shows verification email enqueued + sent
5. **PAUSE** — I report status and wait for you to reply "verified" after clicking the link in the inbox
6. **Login test** — navigate to `/auth`, sign in, verify:
   - Auth succeeds (200 from `/token`)
   - Correct redirect (patient → `/patient/details`, doctor → `/doctor-dashboard`, hospital/ambulance → `/provider`)
   - Session persists on refresh
   - Protected route access works
   - Logout clears session
7. **Report** — PASS/FAIL table + screenshot + any errors

## Role mapping in this codebase

- Patient → `profiles.role = 'patient'` + `user_roles.role = 'patient'`
- Doctor → `profiles.role = 'doctor'` + `user_roles.role = 'doctor'`
- Hospital → `user_roles.role = 'hospital_staff'` (emergency provider, routes to `/provider`)
- Ambulance → `user_roles.role = 'ambulance_staff'` (emergency provider, routes to `/provider`)

I'll verify the signup form actually exposes Hospital/Ambulance role options before testing users 4 & 5 — if it doesn't, those two go through `/provider-signup` instead.

## What I need from you

- **Confirm I should use real emails** (the ones listed) — verification emails will actually land in those inboxes.
- **After each signup**, reply with "verified" (or "verify failed") once you've clicked the link, so I can proceed to login.
- **Don't switch tabs in the preview** while I'm testing — the browser session is shared with your preview iframe.

## Stop conditions

If any user fails at signup or backend validation, I stop, surface root cause (auth logs, edge function logs, network response), and wait for your direction before continuing to the next user.

## Deliverable

A running summary table after each user:

```
User      | Signup | Email Sent | Verified | Login | Redirect | Session | Result
Paraskevi | PASS   | PASS       | ...      | ...   | ...      | ...     | ...
```
