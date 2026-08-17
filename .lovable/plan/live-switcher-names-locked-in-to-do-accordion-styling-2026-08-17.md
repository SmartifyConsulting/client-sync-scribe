# Live switcher names + locked-in To-Do accordion styling

## 1. Switch Profile shows stale names

The "Switch Profile (Admin)" list is built from a hardcoded array of names in `src/components/layout/testProfiles.ts`, so renaming Dr Allie to Peterson in his profile has no effect on that menu.

Change: the switcher reads each account's current name from the database and falls back to the hardcoded label only while loading or if no profile row is found. Renaming any of these accounts will then show up everywhere the switcher is used (account menu, provider menu, top bar).

## 2. Dashboard To-Do accordions

Keep the existing structure — green date header (Today / This Week / This Month / Older) with patient sub-groups inside — and restore the intended treatment:

- Date header: always-green bar, calendar icon, label, count pill on the right, `px-3 py-2`, groups spaced apart.
- Patient sub-group: light muted bar, person icon, patient name, count pill.
- Task rows inside: bordered card row with circular icon badge, title line and muted meta line.

Font bump: task row text goes up exactly one step — title from `text-xs` to `text-sm` (and `text-sm` to `text-base` in the non-compact variant), meta line from `text-xs` to `text-sm`. Icon badge and row padding grow slightly so the larger text isn't cramped. No other list on the app changes size.

## 3. Locking it in

To stop this drifting again:
- Record the To-Do accordion + row spec as a project memory rule (header treatment, nesting order, row card layout, font sizes) so future work re-applies it instead of re-inventing it.
- Add a short "do not restyle without updating the memory rule" comment above the relevant class constants in the To-Do components.

## Technical notes

- `src/components/layout/testProfiles.ts`: keep the array as the source of emails/roles/icons; add a small hook (e.g. `useTestProfileNames`) that fetches `profiles.id, full_name` for these accounts via a lookup by email and merges live names in.
- `src/components/layout/AccountMenu.tsx`, `ProviderProfileMenu.tsx`, `TopBarIcons.tsx`: consume the merged names instead of `p.name` directly.
- `src/components/dashboard/CompactTodoList.tsx`: date/patient accordion classes only.
- `src/components/todos/TodoRow.tsx`: one-step font increase in the `insideGroup` variant.
- No backend schema, query or business-logic changes.
