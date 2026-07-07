## Fix: patient ER Provider list + countdown not showing

### Root cause
The database function `holarchelp_get_incident_offers` fails with
`invalid input syntax for type boolean: "20"` on every call.

Inside the function:

```sql
_has_rows boolean := false;
...
GET DIAGNOSTICS _has_rows = ROW_COUNT;
IF _has_rows = false AND ...
```

`ROW_COUNT` is an integer (e.g. `20`). Assigning it into a `boolean`
variable raises the error, so the RPC returns HTTP 400 and the patient's
`AvailableResponders` component gets zero offers — no list, no countdown.

### The fix
One database migration that redeclares the variable as an integer and
updates the check:

```text
_has_rows boolean := false;   →   _row_count integer := 0;
GET DIAGNOSTICS _has_rows = ROW_COUNT;
                              →   GET DIAGNOSTICS _row_count = ROW_COUNT;
IF _has_rows = false AND ...  →   IF _row_count = 0 AND ...
```

Everything else in the function stays the same (permissions, fallback
query, security-definer settings).

### Technical details
- File: new migration under `supabase/migrations/`
- Uses `CREATE OR REPLACE FUNCTION public.holarchelp_get_incident_offers(_incident_id uuid)` with the same signature and body, only the three lines above changed.
- No client code changes needed — `AvailableResponders.tsx` already renders the 0-offers "Searching…" state with countdown, and the offers list once rows come back.
- No changes to `dispatch-sos`, RLS, or any other function.

### Verification
After the migration, the same RPC call in the browser will return 200
with the list of ambulance offers (or the nearby-provider fallback for
open incidents with none yet). The patient screen will then show:
1. "Available ER providers (N)" with the `Auto-assign in MM:SS` countdown, and
2. Auto-assignment firing at 0:00 via the existing `holarchelp_auto_assign_incident` RPC.
