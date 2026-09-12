# Nigeria login report (10 June → today)

## What I checked first

- The authentication audit log (`auth.audit_log_entries`) is **empty** — the hosted service prunes it, so there is no historic record of individual sign-ins since 10 June.
- The analytics auth logs hold only the last few minutes of events, so they can't cover June onward either.
- The only surviving login data is `auth.sessions`: **21 rows**, oldest 8 April, newest 9 September. Each row has a session start (`created_at`) and last-refresh time (`updated_at`), so duration is approximate and only covers sessions that are still alive (logged-out/expired ones are gone).
- No profile is tagged with country "NG" — the only country values are ZA / South Africa. Nigerian users are identifiable by phone prefix `+234`: Ifeanyichukwu Okoli, samuel 0koli, Stella Chioma, Dennis Ofordum.

So a truthful report can be produced, but it will be thin: it reflects surviving sessions only, not every login since 10 June.

## The script you asked for

Group by user and day, with duration per session-day, limited to Nigerian users:

```sql
select p.full_name,
       u.email,
       (s.created_at at time zone 'Africa/Lagos')::date        as login_day,
       count(*)                                                as logins,
       min(s.created_at at time zone 'Africa/Lagos')           as first_login,
       max(s.updated_at at time zone 'Africa/Lagos')           as last_activity,
       round(sum(extract(epoch from (s.updated_at - s.created_at)))/60.0, 1)
                                                               as minutes_active
from auth.sessions s
join auth.users u  on u.id = s.user_id
join public.profiles p on p.id = u.id
where p.mobile_number like '+234%'
  and s.created_at >= date '2026-06-10'
group by 1, 2, 3
order by p.full_name, login_day;
```

Drop the `mobile_number` filter for an all-users version; swap it for a country filter once countries are recorded properly.

## To get a real report going forward

Add a small `login_events` table (user, timestamp, session id) written on each successful sign-in, plus a matching "session ended / last seen" heartbeat. From then on the same grouping query returns complete, accurate daily durations rather than a best-effort reconstruction.

## Technical notes

- Duration = `updated_at - created_at` on `auth.sessions`; this is time from sign-in to last token refresh, not literal screen time.
- Times converted to `Africa/Lagos` so days line up with Nigerian local dates.
- Nigerian identification relies on the `+234` phone prefix because `profiles.country` is not populated for these users.
