
# Design System Standardization

The app already uses semantic HSL tokens (`--primary`, `--border`, `--muted-foreground`, etc.) and shadcn primitives. The cleanest, lowest-risk way to enforce the spec across every page is to retune those tokens + the shared primitives once, rather than touching hundreds of pages. Pages that already consume tokens will inherit the new look automatically.

## 1. Tokens (`src/index.css` `:root`)

Update light-mode token values to the Holarc spec (HSL conversions of the supplied hex):

- `--background` → `0 0% 98%` (#FAFAFA page bg)
- `--card`, `--popover` → `0 0% 100%`
- `--foreground`, `--card-foreground`, `--popover-foreground` → `0 0% 20%` (#333)
- `--muted` → `0 0% 96%` (#F5F5F5 hover/secondary surface)
- `--muted-foreground` → `0 0% 40%` (#666 secondary text)
- `--secondary` → `0 0% 96%`, `--secondary-foreground` → `0 0% 20%`
- `--accent` → `175 60% 93%` (#E8F5F4 selected bg), `--accent-foreground` → `175 59% 43%`
- `--primary` → `175 59% 43%` (#2DB0A6), `--primary-dark` → `175 64% 30%` (#1C7B74), `--primary-glow` → `175 59% 55%`
- `--border`, `--input` → `0 0% 88%` (#E0E0E0)
- `--destructive` → `0 64% 50%` (#D32F2F)
- `--ring` → `175 59% 43%`, `--shadow-glow` → `0 0 0 3px hsl(175 59% 43% / 0.1)`
- `--radius` → `0.5rem` (8px — current 1rem is too round for the spec)
- New helper tokens: `--text-tertiary: 0 0% 60%` (#999), `--text-disabled: 0 0% 80%` (#CCC), `--shadow-modal: 0 4px 16px rgb(0 0 0 / 0.1)`

Sidebar tokens retuned to the same teal/neutral set. Dark-mode block left intact.

## 2. Typography base (`@layer base` in `index.css`)

Add global element defaults so any page that uses plain `<h1>`/`<h2>`/`<h3>`/`<p>` inherits the spec:

```css
@layer base {
  html { font-size: 14px; }      /* body baseline */
  @media (min-width: 600px) { html { font-size: 14px; } }
  body { @apply bg-background text-foreground leading-[1.5]; font-family: Inter, system-ui, sans-serif; }
  h1 { @apply text-[28px] md:text-[32px] font-bold leading-[1.2] text-foreground; }
  h2 { @apply text-[20px] md:text-[24px] font-semibold leading-[1.2] text-foreground; }
  h3 { @apply text-[16px] md:text-[18px] font-semibold leading-[1.2] text-foreground; }
  label { @apply text-sm font-medium leading-[1.3] text-foreground; }
  input, textarea, select { font-size: 16px; }  /* prevents iOS zoom */
  @media (min-width: 600px) { input, textarea, select { font-size: 14px; } }
}
```

Required-field asterisk utility: `.required::after { content: " *"; color: hsl(var(--destructive)); }`.

## 3. Shared primitives (token-driven, no per-page edits needed)

- **`src/components/ui/button.tsx`** — rewrite `buttonVariants`:
  - `default` (primary): `bg-primary text-primary-foreground hover:bg-primary-dark active:bg-[hsl(175_64%_24%)] disabled:opacity-50`
  - `secondary`: `bg-muted text-foreground border border-border hover:bg-[hsl(0_0%_93%)]`
  - `ghost` / `link` map to tertiary (transparent, primary text, underline on hover)
  - `size.default` → `h-10 px-4 py-2.5 rounded-lg text-sm font-medium` (10×16, 8px radius)
  - `size.sm` → `h-9 px-3`, `size.lg` → `h-11 px-5`, `size.icon` → `h-11 w-11` (44px touch target)
- **`src/components/ui/input.tsx`** — `h-10 rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-[hsl(var(--text-tertiary))] focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/10`.
- **`src/components/ui/textarea.tsx`** — same border/radius/focus rules, `min-h-[80px]`.
- **`src/components/ui/select.tsx`** — `SelectTrigger` matches Input; `SelectContent` `rounded-lg border-border shadow-md p-2`; `SelectItem` `h-10 px-4 rounded-md text-sm hover:bg-muted data-[state=checked]:text-primary data-[state=checked]:font-medium`.
- **`src/components/ui/dialog.tsx`** — `DialogContent` `rounded-xl p-6 bg-card shadow-[var(--shadow-modal)] w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto`; header `pb-4`, footer `pt-4`; title 24px semi-bold; close icon `text-[hsl(var(--text-tertiary))] h-6 w-6`.
- **`src/components/ui/tabs.tsx`** — `TabsList` `border-b border-border bg-transparent h-auto p-0 gap-0`; `TabsTrigger` `px-4 py-3 text-sm font-normal text-muted-foreground border-b-[3px] border-transparent rounded-none hover:bg-muted data-[state=active]:text-primary data-[state=active]:font-medium data-[state=active]:border-primary`.
- **`src/components/ui/label.tsx`** — `text-sm font-medium leading-[1.3] text-foreground`.
- **`src/components/ui/card.tsx`** — `rounded-xl border-border bg-card shadow-sm`, `CardContent` `p-6`, `CardHeader` `p-6 pb-4`.
- **`src/components/ui/popover.tsx` / `dropdown-menu.tsx`** — `bg-popover border-border rounded-lg shadow-md p-2`; items `h-10 px-4 rounded-md hover:bg-muted`.
- **`src/components/ui/alert.tsx`** — destructive variant uses `text-destructive border-destructive/30 bg-destructive/5`.

## 4. Sidebar / Navigation

`src/components/AppSidebar.tsx` (and patient/doctor variants): menu rows already use sidebar tokens. Retune just the active-state classes to `text-primary bg-accent` and hover to `bg-muted`. Icons forced to `h-5 w-5` with `gap-2` to label.

## 5. Page-level touch-ups (only where hard-coded values escape tokens)

These pages contain inline color/size literals that won't be fixed by token changes — apply minimal class swaps:

- `src/pages/CalendarView.tsx` — page title to `<h1>Calendar</h1>`, subtitle `text-sm text-muted-foreground`, view-mode buttons to `variant="secondary"`, calendar day cells `min-h-[64px] sm:min-h-[96px]`.
- `src/pages/Settings.tsx`, `src/pages/Documents.tsx`, patient/doctor profile pages — replace any hard-coded `text-gray-*`, `bg-white`, `bg-gray-50`, `text-[#…]` with semantic tokens (`text-muted-foreground`, `bg-card`, `bg-background`).
- A grep pass for `text-gray-`, `bg-gray-`, `text-\[#`, `bg-\[#` across `src/pages/**` and `src/components/**` (excluding `ui/`) replaces matches with the token equivalents.

## 6. Responsive

- Token + primitive changes already enforce 44px touch targets (button/input `h-10`, icon-button `h-11`, list/select items `h-10`).
- Dialog defaults to `w-[95vw] sm:max-w-lg` so all modals are mobile-correct.
- Base `font-size: 16px` on inputs prevents iOS zoom; primitives drop to 14px ≥600px.

## 7. Verification

- Build passes.
- Spot-check Calendar, Appointment modal, Patient profile, Settings, Documents, Sidebar on 390 / 768 / 1296 viewports via the preview.
- Confirm: teal primary buttons, #E0E0E0 borders, 8px radii, 24px modal padding, tab underline in teal, list items ≥40px tall, error text in #D32F2F, helper text in #999.

## Out of scope

- Dark mode retune (kept as-is — spec is light-mode only).
- Replacing brand-specific surfaces (Guardian SOS red, terracotta accents, signature fonts).
- Refactoring per-page layouts beyond color/typography normalization.
