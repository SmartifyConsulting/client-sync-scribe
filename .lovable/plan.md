

# Plan: Restore Landing nav logo aspect ratio

## Problem
On `holarchealth.com` (Landing page), the top-left logo renders distorted/clipped. In `src/pages/Landing.tsx` the nav logo is:

```tsx
<img src={holarcLogo} alt="Holarc Health" className="h-[68px] w-auto" />
```

Inside a `nav` whose row is `h-16` (64px). A 68px-tall image inside a 64px row gets vertically squeezed/clipped by the flex container, producing the warped sliver visible in the screenshot. There is also no `object-contain`, so any constraint distorts it.

## Fix

| File | Change |
|---|---|
| `src/pages/Landing.tsx` | Change the nav `<img>` to `className="h-10 w-auto object-contain"` (40px, comfortably inside the 64px nav row) so the logo keeps its natural aspect ratio. Hero logo (`h-32 sm:h-40`) is unchanged — it already renders correctly. |

## Out of scope
- No changes to `MobileHeader` (already uses `h-[50px] w-auto object-contain` and renders correctly inside the app shell, not the marketing landing page).
- No changes to the logo asset itself.
- No layout, color, or copy changes.

