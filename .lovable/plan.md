## Re-enable 30-second ER Provider auto-assign

The auto-assign logic is still fully wired (`holarchelp_auto_assign_incident` RPC, `AvailableResponders` countdown, `HolarcHelpIncidentDetail` banner + 30s change window). It was disabled by a single testing flag.

### Change

**`src/modules/holarchelp/components/AvailableResponders.tsx`**
- Set `DISABLE_SELECTION_TIMER = false` (line 19).
- Remove the stale "TESTING: selection timer disabled — patient has unlimited time" comment.

That restores:
- Live `MM:SS` countdown on the patient's selection screen (starting at 00:30).
- Automatic call to `holarchelp_auto_assign_incident` RPC when the timer hits 0 if the patient hasn't picked.
- "AUTO-ASSIGNED — you have 00:30 to switch" banner + change-provider window already implemented in `HolarcHelpIncidentDetail.tsx`.
- Existing extend-timer behavior (two 30s extensions, cap 60s) stays intact.

### Not changed
- No backend/RPC changes — `holarchelp_auto_assign_incident` already exists and is invoked.
- No changes to dispatcher/provider screens.
