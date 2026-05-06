Replace the demo `/demo/nigeria-map` route with a screenshot of the **real app** — the existing `/patient/holarchelp/nearby` page — centered on a Nigerian town (Victoria Island, Lagos), so it uses the actual hospital cross icon (`marker-hospital.png`) and ambulance icon (`marker-ambulance.png`) the users see in production.

### Steps

1. **Spoof geolocation to Lagos** for the browser session (Victoria Island, lat 6.4281, lng 3.4219) by injecting `navigator.geolocation.getCurrentPosition` override before navigating, OR add a temporary `?lat=6.4281&lng=3.4219` query param support to `HolarcHelpNearby.tsx` (small, reversible — read coords from URL when present).
2. **Navigate** to `/patient/holarchelp/nearby?lat=6.4281&lng=3.4219` in the browser tool at 390×844.
3. **Capture** the real-app screenshot — this will render:
   - The native ProviderMap with hospital + ambulance markers using project icons
   - The "X nearest" provider list with cross/ambulance thumbnails
   - All real Nigerian providers seeded earlier (Reddington, EKO, Lagos Emergency Response, Flying Doctors, Critical Rescue, etc.)
4. **Save** to `/mnt/documents/nigeria/10-nigeria-providers-map.png` (overwrite the previous demo version).
5. **Remove** the temporary `/demo/nigeria-map` route + page file (`src/pages/demo/NigeriaProvidersMap.tsx` + App.tsx import/route) so we don't ship demo pages.

No DB changes; only:
- Tiny patch to `HolarcHelpNearby.tsx` to accept optional `?lat&lng` query params (skip GPS prompt when present)
- Delete of demo route/file

Result: a real, production-style screenshot of HolarcHelp Nearby in a Nigerian town with the proper iconography.