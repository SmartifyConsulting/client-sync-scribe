## Goal

The desktop sidebar currently spans the full viewport height (`h-screen`), so its right-edge border runs past the footer's horizontal divider. Make the sidebar end exactly where the footer's top border begins, so the sidebar's bottom edge meets the footer divider in a clean "L" join.

## Approach

Expose the footer's height as a CSS variable, then constrain each fixed sidebar to `100vh − footer-height`.

### 1. `src/components/layout/Footer.tsx`
- Replace `py-6` with an explicit fixed height (e.g. `h-[var(--footer-height)]`) and define `--footer-height` on `:root` in `src/index.css` (value ≈ `132px` to match current footer content).
- Keep `border-t` and inner content unchanged.

### 2. `src/index.css`
- Add `:root { --footer-height: 132px; }` so the value is available globally.

### 3. Sidebar height cap — apply the same change to all three fixed sidebars:
- `src/components/layout/Sidebar.tsx` — change `h-screen` → `h-[calc(100vh-var(--footer-height))]`.
- `src/components/layout/ProviderSidebar.tsx` — same change.
- `src/components/layout/PatientSidebar.tsx` (if present) — same change.

This keeps the sidebar `fixed left-0 top-0`, but its bottom edge now lines up with the footer's top border across `AppLayout`, `PatientAppLayout`, and `ProviderAppLayout`. Mobile is unaffected (sidebar is hidden under `md`).

### Out of scope
- No changes to footer content, links, or styling beyond height.
- No changes to tabs, main content padding, or bottom nav.
