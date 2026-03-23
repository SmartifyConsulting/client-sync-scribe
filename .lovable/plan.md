

# Fix: Lisa Anderson Not Appearing as Dean Allie's Patient

## Root Cause

Lisa Anderson (`lisa.a@email.com`) is a **demo patient record** owned by the demo user (`00000000-0000-0000-0000-000000000001`). She is not linked to Dean Allie's account. James Anderson *is* in Dean's patient list, but Lisa is not.

Lisa also has no `patient_user_id` — she's not a registered user, so there's no access request flow that could have auto-created her as Dean's patient.

## Two Possible Fixes

**Option A — Data fix:** Create a patient record for Lisa Anderson under Dean Allie's user ID via a migration insert. This is appropriate if Lisa should simply be one of Dean's test patients.

**Option B — No code change needed:** If the expectation was that Lisa would appear via an access request, she would first need to be a registered user who sent a request. Since she's only demo data, this is expected behavior.

## Recommended Action

Run a migration to insert Lisa Anderson as a patient for Dean Allie:

```sql
INSERT INTO patients (user_id, name, email, phone, status)
VALUES (
  '54fa34d8-9705-4407-a825-19c5756ca184',
  'Lisa Anderson',
  'lisa.a@email.com',
  '+1 (555) 567-8901',
  'active'
);
```

## Files Modified

| File | Change |
|------|--------|
| New migration | Insert Lisa Anderson patient record for Dean Allie |

