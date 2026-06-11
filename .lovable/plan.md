## Problem

The desktop sidebar is `fixed h-screen`, so its bottom account section (avatar / Settings / Sign Out) extends below the footer's horizontal divider line, creating the visual "tail" shown in the screenshot.

## Fix

Constrain the sidebar's height so it stops exactly at the footer's top border.

### Changes

1. **`src/components/layout/Footer.tsx`**
   - Give the `<footer>` a deterministic height by replacing `py-6` with `py-5` and adding a CSS custom property on the element: `style={{ ['--footer-height' as any]: '140px' }}` and `className="... h-[140px]"` (or expose `--footer-height` on `:root` via `index.css` and use it). Pick a single fixed footer height (≈140px) that fits the 3 stacked rows (copyright / legal links / support link) on desktop without clipping.

2. **`src/components/layout/Sidebar.tsx`** (line 117)
   - Change the `<aside>` from `h-screen` to `h-[calc(100vh-var(--footer-height,140px))]` so the sidebar ends exactly at the footer's top divider.
   - Keep `fixed left-0 top-0` and the existing `border-r`. The inner `flex h-full flex-col` continues to push the account block to the bottom — which is now the footer line.

3. **`src/components/layout/PatientSidebar.tsx`**
   - Apply the same `h-[calc(100vh-var(--footer-height,140px))]` swap so the patient layout matches.

4. **`src/index.css`** (optional but cleaner)
   - Add `:root { --footer-height: 140px; }` so both sidebars and the footer share the same source of truth, and drop the inline style on `<Footer />`.

### Out of scope

- No change to mobile (sidebar is hidden, footer is hidden, bottom nav is used).
- No change to the footer's content, link order, or alignment offset.
- No change to the provider layout's footer (already full-width from the previous step); it will inherit the same `--footer-height` if step 4 is taken.

### Verification

- On `/patients`, `/sessions`, `/calendar`, `/todos`, `/patient/details`: the avatar/Settings/Sign Out block sits flush above the continuous footer divider line — no overhang.
- Sidebar nav still scrolls internally when items overflow (the `nav` already has `overflow-y-auto`).
