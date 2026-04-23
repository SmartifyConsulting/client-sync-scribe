

# Plan: Shared practice calendar + per-doctor color

Three pieces: (1) practice-color picker per doctor, (2) shared "practice calendar" appointments visible to all member doctors, (3) ensure Google Calendar sync stays individual-only.

## 1. Per-doctor practice color (My Practice)

Add a single `practice_color` text column (hex) to `profiles`. Default `#0EA5E9`.

In `My Practice → Practice Profile` (above or beside the existing logo block), a new compact row:

```
Calendar color  [ swatch ][ #0EA5E9 ][ color picker ]
```

Auto-saves through the existing `updateProfile` debounce. This is the color used to render *this doctor's* events on the shared practice calendar so other doctors can tell at a glance whose appointment a slot belongs to.

## 2. Shared practice calendar

### Concept

A doctor creates a **Practice** (a shared calendar group), invites colleagues by email, and any member can see/create appointments on the shared calendar. Each appointment is owned by one doctor (so they can edit/delete their own and Google-sync their own), but every member can *view* every appointment in the practice.

### Schema (one migration)

```sql
-- A shared calendar group
create table public.practices (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Members of a practice (the doctors sharing the calendar)
create table public.practice_members (
  id uuid primary key default gen_random_uuid(),
  practice_id uuid not null references public.practices(id) on delete cascade,
  doctor_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member',     -- 'owner' | 'member'
  joined_at timestamptz not null default now(),
  unique (practice_id, doctor_id)
);

-- Pending email invites
create table public.practice_invitations (
  id uuid primary key default gen_random_uuid(),
  practice_id uuid not null references public.practices(id) on delete cascade,
  invited_email text not null,
  invited_by uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending',  -- 'pending'|'accepted'|'declined'
  token uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '14 days')
);

-- Mark appointments as belonging to a shared practice calendar
alter table public.appointments
  add column practice_id uuid references public.practices(id) on delete set null;
create index appointments_practice_id_idx on public.appointments(practice_id);

-- profiles: per-doctor color
alter table public.profiles add column practice_color text default '#0EA5E9';
```

**SECURITY DEFINER helper** (avoids RLS recursion when checking membership):

```sql
create or replace function public.is_practice_member(_practice_id uuid, _user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.practice_members
                 where practice_id = _practice_id and doctor_id = _user_id)
$$;
```

**RLS**

- `practices`: SELECT if `owner_id = auth.uid()` OR `is_practice_member(id, auth.uid())`. INSERT if `owner_id = auth.uid()`. UPDATE/DELETE owner-only.
- `practice_members`: SELECT for members of that practice. INSERT/DELETE: practice owner only (use `is_practice_member`-style helper or direct check via `EXISTS (… practices where id=practice_id and owner_id=auth.uid())`). A member can DELETE their own row (leave practice).
- `practice_invitations`: SELECT/INSERT/UPDATE for owner; SELECT for the invited user looking up by token (keep token-based lookup via an edge function rather than open SELECT).
- `appointments`: extend the existing SELECT policy with an OR clause: `practice_id IS NOT NULL AND is_practice_member(practice_id, auth.uid())`. INSERT: keep `auth.uid() = user_id`, plus when `practice_id` is set we also require `is_practice_member(practice_id, auth.uid())`. UPDATE/DELETE stay owner-only (`auth.uid() = user_id`) — only the doctor who created an event can change/delete it, even on the shared calendar.

### UI

**a. My Practice → new "Shared Calendar" accordion** (next to "Practice Partners"):

- If the doctor has no practice → a "Create Practice Calendar" button + name input.
- If they belong to one → show practice name, owner badge, member list (avatar, name, color swatch, role), and:
  - "Invite member" form: email input + Send.
  - "Leave practice" (members) / "Delete practice" (owner only).
- Pending invitations list with Resend / Revoke.

**b. Calendar page** (`src/pages/CalendarView.tsx`):

- New toggle in the header next to the view-mode buttons:  
  `[ My Calendar ] [ Practice Calendar ]`  
  Persisted to localStorage `calendar-scope`.
- "My Calendar" — current behaviour, unchanged: `appointments WHERE user_id = me`.
- "Practice Calendar" — fetch `appointments WHERE practice_id = <my practice>` (RLS does the heavy lifting). Each event tile is colored by the **owning doctor's** `practice_color` (joined via a small select on `profiles`). A small initials chip on the tile shows whose appointment it is.
- Booking dialog: when scope = Practice, the new appointment is inserted with `practice_id` set; user_id remains the booking doctor (so they own it for edit/delete + Google sync).
- Events created on Practice scope are read-only for non-owners (no edit / delete buttons; just a tooltip "Owned by Dr X — only they can change this").

**c. Invitation acceptance**

When an invited doctor logs in, a small banner on the Calendar / Dashboard: "Dr X invited you to share their practice calendar — Accept / Decline". Accept inserts a `practice_members` row and marks the invitation `accepted`. (No new edge function needed; client-side with RLS.)

## 3. Google Calendar sync stays individual-only

No code changes required to enforce this — already correct:

- `useGoogleCalendar` only reads/writes `calendar_connections` rows where `user_id = auth.uid()` (RLS).
- `google-calendar-sync` edge function looks up the calling user's connection only and syncs events that the caller passes in.
- We will only call `syncEvent(...)` for appointments **the caller owns** (i.e. `appointment.user_id === me`). The booking flow already creates the appointment with `user_id = me`, so Google sync naturally only mirrors the doctor's own appointments — never their colleagues'. We add a one-line guard in the calendar page so any future "save" path skips `syncEvent` when `appointment.user_id !== currentUser.id`.

A small visible note in the Calendar header next to the Google Calendar button:  
"Google sync only mirrors your own appointments. Your partners' appointments stay on the shared Holarc calendar."

## Files touched

| File | Change |
|---|---|
| `supabase/migrations/<new>.sql` | Tables `practices`, `practice_members`, `practice_invitations`; add `appointments.practice_id`; add `profiles.practice_color`; helper `is_practice_member`; RLS for all new tables; extend appointments SELECT policy. |
| `src/pages/MyPractice.tsx` | New "Calendar color" picker (auto-saves to `profiles.practice_color`). New "Shared Calendar" accordion to create practice, invite members, list members + leave/delete. |
| `src/pages/CalendarView.tsx` | Scope toggle (My / Practice), color-by-owner rendering, event-owner chip, edit/delete gating, practice-scoped insert. |
| `src/hooks/useGoogleCalendar.ts` | One-line guard: `syncEvent` only fires when `appointment.user_id === user.id`. |
| `src/hooks/useProfile.ts` | Surface `practice_color` field (no logic change beyond passthrough). |
| New `src/hooks/usePractice.ts` | Encapsulates: fetch my practice + members, create practice, invite, accept invite, leave, delete. |

## Out of scope

- Cross-practice / multiple-practice membership per doctor (one practice per doctor for v1; the schema supports more later).
- Color-coding of patient avatars or anything outside the calendar tiles.
- Syncing the *shared* practice calendar to a single shared Google Calendar (still individual Google sync only, by request).
- Patient-facing view of the shared calendar (patients keep their existing per-doctor booking view).

