

# Plan: Expand Recent Activity by default + brighten Report Fix buttons

Two small visual tweaks.

## 1. Recent Activity expanded by default

In `src/components/dashboard/RecentActivity.tsx` (line 95), the `<Collapsible>` is set to `defaultOpen={false}`. Flip to `defaultOpen={true}` so the doctor's home page shows the activity list immediately. The chevron rotation already handles the open state correctly.

## 2. Brighter Report Fix type buttons

In `src/components/feedback/ReportFixSheet.tsx`, the three type-selector buttons (Bug / Fix / Nice-to-have) currently use a thin left border accent on a white/grey background, which is easy to miss. Replace each with a solid bright fill + white text so they pop:

| Button | New look |
|---|---|
| **Bug** | Solid `bg-destructive` (red), `text-white`, `hover:bg-destructive/90` |
| **Fix** | Solid `bg-primary` (teal), `text-white`, `hover:bg-primary/90` |
| **Nice-to-have** | Solid `bg-amber-500`, `text-white`, `hover:bg-amber-600` |

Active state stays clearly distinguishable: the selected button gets a `ring-2 ring-foreground/40` and slightly stronger shadow; unselected buttons keep their bright fill but at `opacity-70` so the active one still reads as "chosen". The icon stays white in all states.

The `Send` submit button (currently default primary) stays as-is — it already pops. The outstanding-list cards keep their subtle left-border accents so the list view stays scannable.

## Files touched

| File | Change |
|---|---|
| `src/components/dashboard/RecentActivity.tsx` | `defaultOpen={false}` → `defaultOpen={true}`. |
| `src/components/feedback/ReportFixSheet.tsx` | Update `TYPE_META` color tokens and the type-button class composition to use solid bright fills with white text and an active ring. |

## Out of scope

- Changing the outstanding-items list card styling.
- Persisting the Recent Activity open/closed state per user (always opens expanded; user can still collapse for the session).
- Touching the patient-side dashboard (this is the doctor home page).

