# Plan: Revert navigation + child-screen tabs to pre-design-system styling

## Scope
Undo only the navigation and tab-styling parts of the 17:30 design-system overhaul (messages #3055–#3058). Leave the token retune (colors, radius, typography base) and the non-nav primitives (Button, Input, Dialog, Card, etc.) alone so the rest of the app keeps its current look.

## Files to revert

1. **`src/components/ui/tabs.tsx`** — restore the previous filled/pill TabsList + bold active TabsTrigger styling (the one the project's Tab Styling memory describes: "Teal `bg-primary` TabsList, high-contrast active triggers"). The current underline-only variant (`border-b-[3px] border-transparent` / `data-[state=active]:border-primary`) is the new one introduced in #3058 and is what's causing tabs across Admin, DoctorDocumentsPage, ProvidersScreen, patient pages etc. to look flat and washed-out.

2. **`src/components/layout/Sidebar.tsx`** (doctor) and **`src/components/layout/PatientSidebar.tsx`** + **`src/components/layout/ProviderSidebar.tsx`** — restore the prior active-item styling (filled teal pill / bold text) and prior hover state. The 17:36 batch changed active items to `text-primary bg-accent` with `bg-muted` hover, which made the active route harder to read.

3. **`src/components/layout/BottomNav.tsx`** — restore prior active-item color/weight if changed in the batch.

4. **`src/components/layout/MobileHeader.tsx`** — only if its nav-related classes were touched in the batch (likely just background + border tweaks; revert those).

## What stays
- `src/index.css` token values (teal `#2DB0A6`, border `#E0E0E0`, radii, typography base) — these are app-wide and reverting them would undo unrelated parts of the design refresh.
- Button, Input, Textarea, Select, Dialog, Label, Card, Popover, DropdownMenu primitives — out of scope for "navigation + tabs".
- Page-level pages (Admin.tsx, DoctorDocumentsPage.tsx, ProvidersScreen.tsx, etc.) — they already pass the old `bg-primary` / `data-[state=active]:bg-white` classes; once `tabs.tsx` is reverted those classes will render correctly again with no per-page edits.

## Method
For each file above I'll fetch the git history of that file (via `git log -p` in build mode) to find the commit immediately before the 17:30 batch, and restore its `cn(...)` class strings verbatim — no guessing, no re-design. If git doesn't expose that timestamp, I'll reconstruct from the chat-recorded `old_content`/`new_content` of message #3058 (which captured the exact diffs).

## Verification
- Visit `/admin`, `/documents`, `/holarchelp/provider/hospital/providers`, `/patient/details`, `/settings` at 390 px and 1296 px and confirm tabs match the prior filled-pill look.
- Confirm the active sidebar item is again clearly highlighted in both Doctor and Patient layouts.
- No console/build errors.

## Out of scope
- Reverting design tokens or non-nav primitives.
- Touching the 2FA flow, provider PII migration, install button, or any other non-styling work from today.
- Any new styling — strictly a like-for-like revert of nav + tab classes.

## Safer alternative
If you'd rather not risk a partial revert, use the **History** panel to roll back to the message immediately before #3056 — that wipes the entire 17:30 batch in one click and you can then re-apply any non-nav changes you want to keep.

```xml
<presentation-actions>
  <presentation-open-history>View History</presentation-open-history>
</presentation-actions>
```