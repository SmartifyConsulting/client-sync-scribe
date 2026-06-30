## Plan

1. **Fix the Google Maps error message on SOS maps**
   - Add a clearer in-app overlay for `BillingNotEnabledMapError`, explaining that Google Cloud billing must be enabled on the Maps project.
   - Keep the map area usable-looking instead of relying only on Google’s default “This page can’t load Google Maps correctly” popup.
   - Also note in-app if the issue is a domain/referrer restriction or missing key.

2. **Show the incident number on the patient SOS screen**
   - Display the human-readable incident number, e.g. `INC-2026-000123`, near the “Active emergency” heading and in the sticky top bar.
   - Add it to the patient incident history cards so the same number can be matched with the ER Provider / Dispatcher screens.

3. **Keep the ER provider list visible during the first 30 seconds**
   - When the SOS is first created, show available ER providers with distance and a countdown.
   - If the system auto-assigns the closest provider after 30 seconds, keep the list visible briefly as a “Change ER Provider” selector when still inside the 30-second decision window.

4. **Allow changing from auto-assigned to selected ER Provider within 30 seconds**
   - Add a backend RPC such as `holarchelp_patient_change_provider` that only allows the patient who owns the incident to change provider if:
     - the incident is still live,
     - the incident was auto-assigned,
     - less than 30 seconds have passed from the incident creation / auto-assignment window,
     - the new provider is a valid pending ER provider offer.
   - Record the change in `holarchelp_incident_events` as `patient_changed_provider` / `reassigned` so the ER workflow timeline shows it.
   - Supersede the old provider offer and mark the newly selected provider as picked.

5. **Make the patient SOS workflow easier to follow**
   - In the responder card, show:
     - incident number,
     - current assigned ER Provider,
     - whether it was auto-assigned,
     - remaining seconds to change provider when available.
   - After the 30-second window closes, replace the selector with a locked state explaining that the responder is now fixed unless ER dispatch reassigns it.

## Technical details

- Frontend files to update:
  - `src/modules/holarchelp/pages/HolarcHelpIncidentDetail.tsx`
  - `src/modules/holarchelp/pages/HolarcHelpIncidents.tsx`
  - `src/modules/holarchelp/components/AvailableResponders.tsx`
  - `src/modules/holarchelp/components/LiveMap.tsx`
- Backend changes:
  - Add a migration for the new patient-change-provider RPC.
  - Reuse existing `holarchelp_incident_offers`, `holarchelp_incident_events`, and `holarchelp_incidents.assigned_provider_id` workflow.
- Google Maps note:
  - The screenshot error is specifically `BillingNotEnabledMapError`, so the real fix outside code is to ensure billing is enabled in the Google Cloud project that owns the Maps API key. The code can explain this clearly, but billing must be enabled in Google Cloud for the map to render normally.