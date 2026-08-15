# Fix: Ask Angel still visible outside the v2.0 demo profile

## What's happening

The v2.0 demo flag itself is correct — only `georgia.adams@smartify.co.za` has it enabled; every other account (including Dean Allie and Shannon) is off.

The leak is in the sidebar: the doctor menu renders its bottom block (Ask Angel + SOS) from the raw `DOCTOR_BOTTOM_ITEMS` list, which never passes through the v2 filter that the rest of the menu uses. So any doctor still sees the Ask Angel button pinned at the bottom of the sidebar, even though the route itself already redirects them away.

## The fix

- Run the sidebar's bottom block through the same v2 filter as the other menu groups, so Ask Angel only appears for a v2 demo account (SOS stays for everyone).
- Re-check the remaining Ask Angel entry points after the change (doctor sidebar, patient sidebar, nurse sidebar, mobile bottom nav on both doctor and patient menus) so nothing else renders an ungated link.

## Technical notes

- `src/components/layout/Sidebar.tsx`: the render at the bottom block calls `applyItemPreferences(DOCTOR_BOTTOM_ITEMS, ...)` directly; wrap it with the existing `withShiftRule` helper (which already drops `/biolog` and `/ask-maeve` when `v2Demo` is false).
- No database or route changes needed — `V2Route` and the `profiles.v2_demo` flag are already in place and correct.
