# The Style Manifest

> **Role:** Senior UI/UX Engineer. Maintain absolute visual and structural consistency between the Doctor and Patient profiles while ensuring a fluid, responsive experience across Mobile, Tablet, and Desktop.

## 1. Global Layout & Responsiveness

- **Mobile-First Approach:** All layouts must be designed for mobile by default and enhanced for larger screens using Tailwind breakpoints (`md:`, `lg:`).
- **Fluid Containers:** Never use fixed widths (e.g., `width: 500px`). Use `w-full` with `max-w-screen-xl` and `mx-auto` for page centering.
- **The Flexbox Rule:** Use `flex flex-wrap` for all repeating elements. Use `gap-{value}` instead of margins for spacing between items to ensure clean wrapping.
- **Breakpoints:**
  - **Mobile:** Single column, full-width components.
  - **Tablet (`md:`):** Two-column grids where appropriate.
  - **Desktop (`lg:`):** Multi-column layouts with fixed sidebars or wide-set content.

## 2. Profile Parity (Doctor vs. Patient)

- **Shared Components:** Both profiles must use identical React components for shared elements: Cards, Buttons, Input Fields, Modals, and Toasts.
- **Visual Language:** Use the same `border-radius` (e.g., `rounded-xl`), shadow depth, and typography scale for both views.
- **Distinct Branding:** Distinguish the profiles only via subtle color accents or headers (e.g., Blue for Doctors, Teal for Patients), but keep the underlying structural CSS identical.

## 3. Structural Constraints

- **No Overflows:** Use `overflow-hidden` on parent containers and ensure long text uses `truncate` or `line-clamp` to prevent UI breaking.
- **Interactive Elements:** All buttons and links must have clear hover and active states. Touch targets on mobile must be at least **44px** in height (`h-11`).
- **Dynamic Spacing:** Use a consistent spacing scale (Tailwind's 4px grid). If a section has `p-4` (16px) padding, all similar sections must match.

## 4. Implementation Instructions

- **Audit Before Output:** Before generating code, check if the proposed design fits on a 375px screen width. If it would cause a horizontal scroll, refactor it to stack vertically.
- **Refactor, Don't Patch:** If you see an existing inconsistent style in the file you are editing, fix it to match this manifest immediately rather than adding a "one-off" fix.

## 5. Sidebar Width

The sidebar width is defined as `--sidebar-width: 210px` in `index.css`. All sidebar margin references must use `md:ml-[var(--sidebar-width)]` instead of hardcoded pixel values.

## 6. Layout Shell Parity

Both `AppLayout` (Doctor) and `PatientAppLayout` (Patient) must share:
- Root: `overflow-hidden`
- Main content: `pb-24 md:pb-0 md:ml-[var(--sidebar-width)]`
- Content container: `px-4 py-6 md:px-8 md:pt-2 md:pb-8 max-w-7xl mx-auto`
- Desktop footer: `<Footer />` hidden on mobile
- Desktop top bar: `<TopBarIcons />`
