## Problem

On `/patient/holarchelp` the red HOLD button rarely completes its 2-second hold. The session replay shows the progress ring starting then resetting repeatedly as the user holds — they never reach the trigger threshold.

Root cause: the button uses `onPointerLeave={cancelHold}` without pointer capture. On touch devices any small finger drift fires `pointerleave`, killing the hold animation. The button also returns early when `activeIncidentId` is set (the user already has an open incident `a6181217…` from earlier), so even a successful hold would just navigate instead of triggering.

## Fix

Edit `src/modules/holarchelp/pages/HolarcHelpHome.tsx`:

1. **Capture the pointer on press** so movement off the button does not fire `pointerleave`:
   - In `onPointerDown`, call `e.currentTarget.setPointerCapture(e.pointerId)`.
   - Remove `onPointerLeave={cancelHold}` (no longer needed once the pointer is captured; `pointerup` / `pointercancel` still release it).

2. **Don't short-circuit when an active incident already exists.** Currently `startHold` immediately navigates to the existing incident on press, which makes the button feel broken (no hold, just an instant route change). Replace that early-return with a tap-vs-hold rule:
   - If `activeIncidentId` exists, still allow the hold animation to run; on completion, navigate to that incident's live tracking page instead of creating a new one.
   - Keep the `triggering` guard.

3. **Auto-cleanup stale "active" state.** The active-incident lookup in the initial `useEffect` should ignore incidents older than e.g. 24 hours so the resume banner / early-return logic doesn't get permanently wedged when an incident wasn't closed cleanly. (Optional polish — can keep current behaviour if you prefer.)

No DB changes. No styling changes. Pure interaction fix scoped to `HolarcHelpHome.tsx`.

## Verification

After patching, navigate the preview browser to `/patient/holarchelp`, press and hold the red button for 2.5 s with slight movement, and confirm the ring fills and SOS triggers (or, with an active incident, navigates to live tracking after the full hold).