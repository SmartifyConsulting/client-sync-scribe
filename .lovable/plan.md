## Problem

Two symptoms, one root cause:

1. **"infinite recursion detected in policy for relation holarchelp_incidents"** — the SELECT policy `Provider staff read offered incidents` on `holarchelp_incidents` sub-queries `holarchelp_incident_offers`, and the SELECT policy `Patient views own incident offers` on `holarchelp_incident_offers` sub-queries `holarchelp_incidents`. Each side triggers RLS evaluation on the other → infinite recursion.

2. **Header shows "ACTIVE MISSION #55055050" but "Active Missions" panel is empty** — the Active Missions panel fetches from `holarchelp_incidents` filtered by `assigned_provider_id = <renken>`. There is no dedicated SELECT policy for the assigned provider's staff; today they only see the row through the offers-based policy, which is currently throwing the recursion error. So the panel query silently returns no rows while the header chip (cached from an earlier stat) still shows the incident.

## Fix

### 1. Break the recursion with a SECURITY DEFINER wrapper

Add a helper that reads the offers table with definer privileges (bypassing RLS on that table):

```sql
CREATE OR REPLACE FUNCTION public.provider_has_offer_on_incident(
  _incident_id uuid, _user_id uuid
)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.holarchelp_incident_offers o
    WHERE o.incident_id = _incident_id
      AND (
        public.is_ambulance_staff(o.provider_id, _user_id)
        OR public.is_hospital_staff(o.provider_id, _user_id)
      )
  );
$$;
```

Recreate the incidents policy so PostgREST never crosses back into `holarchelp_incident_offers` RLS:

```sql
DROP POLICY "Provider staff read offered incidents" ON public.holarchelp_incidents;

CREATE POLICY "Provider staff read offered incidents"
  ON public.holarchelp_incidents
  FOR SELECT
  USING (public.provider_has_offer_on_incident(id, auth.uid()));
```

### 2. Give the assigned provider direct read access

The "Assigned provider staff can update incident" policy handles UPDATE only. Add the matching SELECT policy so assigned missions show up in the Active Missions panel even after the offer row is marked superseded/accepted:

```sql
CREATE POLICY "Assigned provider staff read incident"
  ON public.holarchelp_incidents
  FOR SELECT
  USING (
    assigned_provider_id IS NOT NULL
    AND (
      public.is_ambulance_staff(assigned_provider_id, auth.uid())
      OR public.is_hospital_staff(assigned_provider_id, auth.uid())
    )
  );
```

### 3. No client code changes needed

`ActiveMissionsPanel` / `useActiveMissions` / `useAmbulanceOpsStats` all already query on `assigned_provider_id`. Once the new SELECT policy is in place they return the assigned mission and the panel matches the header chip.

## Technical notes

- Single migration; no data changes.
- The existing `_public` views for hospitals (used elsewhere) remain the read surface for non-admin staff and are unaffected.
- The definer function only exposes a boolean, no row data, so it does not widen the effective read surface.
- Fixes both the console error and the empty Active Missions panel in one shot.
