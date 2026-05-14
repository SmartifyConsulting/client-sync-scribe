## Plan

1. **Change responder auto-assign to 30 seconds**
   - Update the patient responder list countdown from 3 minutes to 30 seconds.
   - Ensure the auto-assign RPC still picks the closest pending responder when the countdown reaches zero.

2. **Fix the map not showing**
   - The current map failure is Google’s `BillingNotEnabledMapError`, so the app cannot make Google render correctly with the current key.
   - Replace the SOS live map display with a dependable OpenStreetMap-based embedded map fallback for incident tracking, so the map still shows without Google billing.
   - Keep patient and responder markers visible and clearly labelled.

3. **Show where the responder is on the map**
   - Fetch the assigned ambulance or hospital coordinates from the provider record when live provider GPS has not been written yet.
   - Show the patient location plus assigned responder/hospital location on the same map.
   - Continue using live provider GPS (`provider_latitude/provider_longitude`) when the responder app is actively sharing location.

4. **Show distance and travel-time estimate**
   - Calculate straight-line distance between the latest patient location and responder/hospital location.
   - Display distance in km and an estimated travel time using the app’s existing emergency-response estimate style.
   - Show this both in the responder card and on the map marker label/summary.

5. **Keep timeline context intact**
   - Preserve the existing timeline provider-name display for patient-picked and auto-assigned responders.
   - No extra database tables are needed for this change unless later we choose to store route estimates historically.

## Technical notes

- Files to update: `AvailableResponders.tsx`, `HolarcHelpIncidentDetail.tsx`, and `LiveMap.tsx`.
- The Google Maps issue is not a React rendering bug; it is caused by the Google key/project configuration. The code change will avoid blocking patient tracking on Google billing.
- Distance/ETA will be an estimate, not live traffic routing, because live routing would require a working paid maps/directions API.