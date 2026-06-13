## Typography Update: Plus Jakarta Sans

Switch the app's primary sans-serif from Inter to **Plus Jakarta Sans** and apply consistent weights/colors per the spec.

### 1. Font loading

**`index.html`** — Add Plus Jakarta Sans to the existing Google Fonts `<link>` (weights 400, 500, 600, 700, 800):

```
family=Plus+Jakarta+Sans:wght@400;500;600;700;800
```

(Keep existing template fonts: Lora, Merriweather, Playfair, etc.)

### 2. Tailwind config

**`tailwind.config.ts`** — Update `sans` and `display` stacks:

```ts
sans: ["Plus Jakarta Sans", "Inter", "system-ui", "sans-serif"],
display: ["Plus Jakarta Sans", "Inter", "system-ui", "sans-serif"],
```

### 3. Global CSS

**`src/index.css`**:
- Remove `@fontsource/inter/*` imports.
- Update `@layer base` heading rules:
  - `h1` → `font-extrabold` (800)
  - `h2` → `font-bold` (700)
  - `h3` → `font-semibold` (600)
- Body keeps `font-normal` (400).

### 4. Component-level weight/color audit

| Role | Component | Change |
|---|---|---|
| Page heading ("Patient", etc.) | `src/components/shared/PageHeader.tsx` | `font-semibold` → `font-extrabold` |
| Tab heading | `src/components/ui/tabs.tsx` `TabsTrigger` | `font-medium` → `font-semibold` (600) |
| **Buttons (all variants)** | `src/components/ui/button.tsx` base classes | `font-medium` → `font-semibold` (600), matching Tab Headings |
| Card frame title | `src/components/ui/card.tsx` `CardTitle` | verify `font-semibold` (600) |
| Body text inside frames | inherits from `body` | `font-normal text-sm/base text-muted-foreground` |
| Form labels | `src/components/ui/label.tsx` | `font-medium` → `font-bold text-foreground` (black + bold) |

No page-by-page edits — these primitives propagate everywhere.

### 5. Verification

Visit `/patients/:id`, Settings, Dashboard, Session detail, and a doctor admin tab; confirm:
- H1 page titles render extrabold in Plus Jakarta Sans
- Tab triggers **and buttons** render semibold (matching weight)
- Body copy is 400-weight, muted gray
- Field labels are bold and black

### Out of scope

- Template/document fonts (Lora, Playfair, etc.) — user-chosen per template.
- Signature handwriting fonts.
- Admin compact-tab font-size overrides.
