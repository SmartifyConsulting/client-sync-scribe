# Okoli + Dean Allie sessions query, and duplicate patient clean-up

## 1. The query you asked for

```sql
select p.id            as patient_record_id,
       p.name          as patient_name,
       p.patient_user_id,
       p.status,
       s.id            as session_id,
       s.started_at,
       s.status        as session_status,
       s.duration_minutes,
       pr.full_name    as doctor_name
from patients p
left join sessions s on s.patient_id = p.id
left join profiles pr on pr.id = s.user_id
where p.patient_user_id in (
        '25cd5e3c-f272-4ff3-ac06-c08e2bc780be',  -- Samuel Okoli
        '54fa34d8-9705-4407-a825-19c5756ca184'   -- Dean Allie
      )
order by p.name, s.started_at desc;
```

Current result: Samuel Okoli = 1 record with 5 sessions (latest 15 Aug 08:24, Dr Dean Allie). Dean Allie's own patient side = 81 records, all but one empty.

## 2. Clean up Dean Allie's duplicates

Verified counts for `patient_user_id = 54fa34d8-…`:

- 81 patient records ("Dean Allie", "Allie, Dean", "Allie, Dr Dean", "sme")
- Exactly **1** holds any data: `76250ebe-…` (created 16 Mar) with 1 hospital admission, 1 prescription, 3 activity logs
- The other 80 have zero sessions, documents, prescriptions, todos, appointments, admissions and activity logs

Steps:

1. Keep `76250ebe-…`, set its name to `Dean Allie`.
2. Re-point any child rows (all tables with a `patient_id`) from the other 80 onto the survivor — safety net in case a table outside the checked list references them.
3. Delete the 80 empty duplicates.
4. Apply the same merge to the other accounts that show duplicates: Georgia Adams (2), hospital.test / Holarc General Hospital Admin (8), and `db5da07b-…` Dean Allie test account (2) — survivor = oldest record that holds data.

## 3. Stop it happening again

The clean-up alone won't hold: something is re-creating Dean's self-record on almost every visit (records appear minutes apart with different name spellings). Two parts:

- **Database guard:** after the merge, add a partial unique index `unique (patient_user_id) where status <> 'archived'`. That makes a second live record for one account impossible, whichever screen inserts it. The existing client code already handles the resulting duplicate error by fetching the winning record, so no user-visible failure.
- **Diagnose the loop:** with the index in place, reproduce the flow (sign in as Dean, open My Details / Profile) and confirm the lookup by `patient_user_id` returns the record instead of falling through to the insert. If the lookup is being blocked rather than simply missing, fix the read path or its access policy so the self-record is found first.

## Technical notes

- Merge runs as one transactional `DO` block iterating `information_schema.columns` for `patient_id`, with unique-violation fallback (delete the duplicate's row rather than move it) — same routine already used successfully for Samuel Okoli.
- No UI changes; the sessions list query is correct.
