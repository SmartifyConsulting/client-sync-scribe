## Changes to `src/modules/holarchelp/pages/HolarcHelpHome.tsx`

### 1. Update SOS acknowledgement checkbox copy (4 items instead of 3)
Replace the 3 current items with 4:
- a) "SOS support is provided on a best-effort basis and cannot guarantee emergency response."
- b) "SOS depends on network, device status, location access, and third-party responders."
- c) "SOS requires location permissions, battery power, and internet or cellular connectivity."
- d) "Emergency response availability and response times may vary by location."

Extend the `ack` state shape to `{ a, b, c, d }`, update `allAck`, `ACK_KEY` defaults, and `setAckField` typing accordingly. Bump key to `holarchelp.sos.ack.v2` so previously-saved 3-item state isn't auto-treated as complete.

### 2. Reduce hold-to-trigger from 2.5 s to 1 s
- Change `HOLD_MS = 2500` → `HOLD_MS = 1000`.
- Change the "Press & hold for 2 seconds" hint text → "Press & hold for 1 second".

### 3. Make the activation ring much more visible
Currently the progress ring is 6 px white at 40 % opacity over a red button — barely readable. Improvements:
- Thicken stroke `strokeWidth={6}` → `14`.
- Raise track contrast: track `hsl(0 0% 100% / 0.25)`, progress stroke pure `white` with `drop-shadow` filter (`filter: "drop-shadow(0 0 8px rgba(255,255,255,0.9))"`).
- Add a subtle pulsing outer halo that intensifies with `holdProgress` (e.g. opacity & blur scale with progress).
- Inside the button, while holding (`holdProgress > 0` and not yet triggering), show a small percentage / countdown indicator under "HOLD" so the user gets unambiguous feedback (e.g. "Activating… 62%").
- Keep the existing `animate-ping` ambient ring but disable it during hold so it doesn't compete with the progress ring.

### 4. Show active emergencies under the "Press & hold for 1 second" hint
There is already an "Active SOS in progress" banner rendered at the **top** of the page when `activeIncidentId` is set. Move/duplicate that surfacing so it appears **directly below** the hint text. Concretely:
- Keep the data fetch (already loads the latest open/assigned/etc. incident for the user).
- Render a compact card under the hint listing the active incident (status pill + "Tap to resume live tracking →"), styled like the existing red banner but tighter.
- Remove the duplicate top banner to avoid showing it twice (or keep only the under-hint version — preferred).
- If multiple active incidents existed we'd list them, but the current query returns only the most recent; that's fine for now.

### Out of scope
- No DB / RLS / edge-function changes.
- No changes to the post-trigger confirmation screen, severity picker, or voice-note flow.
- No changes to other HolarcHelp pages.

### Files
- Edit only: `src/modules/holarchelp/pages/HolarcHelpHome.tsx`.
