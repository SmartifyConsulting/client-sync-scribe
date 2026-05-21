## What's wrong

1. **Duplicate Renken rows.** `holarchelp_ambulance_providers` contains **224 rows** of "Renken Ambulance Service" all owned by the same user (`3697719d-…`). Only one of them is real — the rest are leftover from earlier bulk-insert tests. None are referenced by incidents.
   - A separate row, **"Renken ER Services"** (different owner), is legitimate and stays.
   - No other provider has duplicates.

2. **Tab layout.** In `src/pages/admin/HolarcHelpProviders.tsx` the Users tabs currently render in this order:
   `Patients · Healthcare Providers · Hospitals · Ambulance · Pharmacies · Emergency Users · Admin`
   You want the standalone "Ambulance" tab folded into "Emergency Users" and placed next to Hospitals.

## Fix

### 1. Data cleanup (one-off)
Keep the oldest Renken Ambulance Service row per owner, delete the other 223:

```sql
DELETE FROM public.holarchelp_ambulance_providers a
WHERE a.company_name = 'Renken Ambulance Service'
  AND a.id <> (
    SELECT id FROM public.holarchelp_ambulance_providers b
    WHERE b.company_name = a.company_name AND b.owner_id = a.owner_id
    ORDER BY created_at ASC LIMIT 1
  );
```
Safe because no incidents reference these rows.

### 2. Tab merge (UI only)
In `HolarcHelpProviders.tsx`:
- Remove the standalone `ambulance` trigger and its `TabsContent`.
- Move `emergency-users` to sit **immediately after Hospitals**.
- Keep its label "Emergency Users" with the `Ambulance` icon.
- The dedicated Ambulance provider management (tier/status/edit table) is still reachable — it remains accessible via the existing flow, just no longer as its own top-level tab. (The Ambulance CRUD UI currently lives only inside that tab. See below for one decision needed.)

### Final tab order
`Patients · Healthcare Providers · Hospitals · Emergency Users · Pharmacies · Admin`

## One question before I build

The current **Ambulance** tab is not just a user list — it also contains the **provider management table** (tier, active/inactive switch, edit/delete) for ambulance companies, grouped by country. The **Emergency Users** tab is a *user* list grouped by provider type (it uses `UsersTab kind="emergency"`).

These are two different things. Which do you want?

- **A.** Drop the ambulance provider-management table entirely (you'd manage ambulance companies from the Healthcare Providers / Hospitals-style flow elsewhere, or not at all from admin).
- **B.** Keep the ambulance provider-management table, but render it *inside* the new "Emergency Users" tab below the user list (so one tab shows both staff users and the companies they belong to).
- **C.** Keep the ambulance provider-management table somewhere else (e.g. a sub-tab inside Hospitals, or a new "Providers" admin page).

I'd recommend **B** — single Emergency Users tab with users on top and a collapsible "Ambulance companies" section below — but want your call before touching the file.
