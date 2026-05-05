# Add SOS to patient bottom navigation

The HolarcHelp/SOS module exists at `/patient/holarchelp` and is gated by `useHolarcHelpAccess()` (admin global flag + per-user `holarchelp_enabled`). It is reachable by URL but there is no entry point in the patient bottom navigation, so users currently can't find it.

## Change

Edit `src/components/layout/BottomNav.tsx`:

- Import the `Siren` icon from lucide-react.
- Insert a 5th item into `patientSections` to the right of My Rewards:
  ```ts
  { icon: Siren, label: "SOS", section: "sos", to: "/patient/holarchelp", danger: true }
  ```
- The existing `danger: true` styling branch already paints the icon and label red — no extra CSS work needed.
- Active state: highlight when `location.pathname.startsWith("/patient/holarchelp")`. Add a small case in the `isActive` ternary for `section === "sos"`.

That's the only file change. The route `/patient/holarchelp/*` is already registered in `App.tsx`, the page is `HolarcHelpHome`, and the gate inside `HolarcHelpRoutes` handles users who don't have it enabled (shows the gated message).

## Note

The bottom nav already shows 4 items; adding SOS makes 5, which still fits comfortably on a 390px viewport (matches the doctor nav which already has 5).