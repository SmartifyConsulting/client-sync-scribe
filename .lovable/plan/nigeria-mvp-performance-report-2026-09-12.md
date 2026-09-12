# Nigeria MVP performance report

## What the data can already tell you

Confirmed by querying the database just now:

- **Sign-ups and their dates are fully available** — every account has a creation date, plus a "last signed in" timestamp and an email-confirmed timestamp.
- **Repeat usage is visible** for anyone whose last sign-in is later than their sign-up date. For the four Nigerian accounts found:
  - Stella Chioma (patient) — joined 12 Jun, last seen 12 Jun (same day only)
  - Dennis Ofordum (doctor) — joined 23 Jun, last seen 23 Jun (same day only)
  - Ifeanyichukwu Okoli (doctor) — joined 25 Jun, last seen **15 Aug** — returning user
  - samuel 0koli (patient) — joined 11 Jul, last seen **17 Aug** — returning user
- **Login frequency and duration per day** is only available from today onward, via the login tracking added earlier. History before today cannot be reconstructed.

### The gap worth fixing first

Nigeria can currently only be identified by a `+234` phone prefix, and **only 13 of 160 accounts have a phone number at all** — country is otherwise recorded as ZA/South Africa or nothing. So any "Nigeria" figure today is a floor, not a true count.

## What will be built

### 1. Country tagging (fixes the accuracy of every number below)

- Backfill each account's country from its phone dial code where present, and from the sign-up language/dial-code selection otherwise.
- Record country at sign-up going forward so new accounts are tagged from day one.
- Leave anything genuinely unknown as "Unspecified" rather than guessing.

### 2. A Nigeria MVP report pack (database views)

One view per question, all filterable by country and date range:

- **Acquisition** — sign-ups per week, split by doctor / patient / nurse / other, and cumulative total.
- **Activation** — of those who signed up, how many completed a first real action (doctor: created a session or document; patient: completed a profile, logged a check-in, or connected a provider).
- **Retention** — returned at least once after sign-up day; returned in week 2 and week 4; days between sign-up and last activity.
- **Engagement volume** — consultations recorded, documents generated, prescriptions issued, appointments booked, check-ins logged, SOS incidents raised.
- **Daily logins and time on the app** — from the new login tracking, per user per day.
- **Dormant accounts** — signed up but never returned, with days since sign-up, so you can follow up.

### 3. An admin screen: Country Performance

Added under Admin, defaulting to Nigeria:

- Date-range picker and country selector.
- Top row of headline figures: sign-ups, activated, returning users, active in last 30 days, total consultations.
- A sign-ups-over-time chart and a retention breakdown.
- A user table: name, role, signed up, last active, days active, sessions/documents count — sortable, exportable to CSV.
- Admin-only access.

## Technical notes

- Views live in the database so the same numbers back both the screen and any ad-hoc SQL export; each view exposes `country`, `role`, and date columns.
- Historic activity dates come from existing tables (`sessions`, `documents`, `prescriptions`, `appointments`, `biolog_entries`, `holarchelp_incidents`) plus `auth.users.created_at` / `last_sign_in_at`; per-day duration comes from `login_events`.
- Country backfill uses the phone dial code first, then falls back to existing profile country text; no country is inferred from IP.
- Access restricted to admins through the existing role check.
