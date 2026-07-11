## Goal
Apply Tag Connect's typography and CSS styling (fonts, heading treatment, radius scale, shadow depth) to the entire Holarc app. Do NOT change any colors — every existing color token in light and dark mode stays exactly as it is.

## What Tag Connect contributes
- Display font: **Sora Variable** (headings)
- Body/sans font: **Manrope Variable**
- Headings: `letter-spacing: -0.02em`, display family
- Body font-feature-settings: `"cv11", "ss01", "ss03"` + antialiased
- Base radius `--radius: 0.9rem` with sm/md/lg/xl/2xl/3xl derived from it
- Shadow tokens `--shadow-card` and `--shadow-elevated` (soft, ink-tinted)

## Files changed

### 1. `package.json`
Add dependencies:
- `@fontsource-variable/sora`
- `@fontsource-variable/manrope`

(Existing `@fontsource/inter/*` packages stay installed but are no longer imported.)

### 2. `src/index.css`
- Replace the four `@fontsource/inter/*` imports at top with:
  - `@import "@fontsource-variable/sora";`
  - `@import "@fontsource-variable/manrope";`
- Leave all self-hosted signature `@font-face` blocks unchanged.
- In `:root`: change `--radius: 0.5rem` → `--radius: 0.9rem`.
- In `:root`: override the shadow values for card depth:
  - `--shadow-card: 0 1px 2px rgb(13 13 13 / 0.05), 0 8px 24px -12px rgb(13 13 13 / 0.10);`
  - `--shadow-card-hover: 0 2px 4px rgb(13 13 13 / 0.06), 0 16px 40px -16px rgb(13 13 13 / 0.18);`
  - Add new `--shadow-elevated: 0 1px 2px rgb(13 13 13 / 0.06), 0 16px 40px -16px rgb(13 13 13 / 0.18);`
- In `@layer base body`: change `font-feature-settings` from the current Inter set to `"cv11", "ss01", "ss03"`. Keep `@apply bg-background text-foreground font-sans` and line-height.
- Update `h1,h2,h3,h4,h5,h6` rules to apply `font-family: 'Sora Variable', system-ui, sans-serif;` and `letter-spacing: -0.02em;` — preserve current responsive sizes, weight, and `text-foreground`.
- Keep everything else intact: mobile input sizing, `.font-size-preserve`, `.admin-tab-scope`, `.admin-shell`, keyframes, utilities, sidebar tokens.
- Do NOT touch any color variable in `:root` or `.dark` — teal, terracotta, SOS red, admin palette, sidebar all stay.

### 3. `tailwind.config.ts`
- `fontFamily.sans`: `["Manrope Variable", "Manrope", "system-ui", "-apple-system", "sans-serif"]`
- `fontFamily.display`: `["Sora Variable", "Sora", "system-ui", "sans-serif"]`
- Leave lora, merriweather, open-sans, playfair, roboto, source-serif, rockwell untouched.
- Update `borderRadius` so `xl`, `2xl`, `3xl` derive from `--radius`:
  - `"xl": "calc(var(--radius) + 4px)"`
  - `"2xl": "calc(var(--radius) + 8px)"`
  - `"3xl": "calc(var(--radius) + 12px)"`
- Leave every `colors.*` entry, `boxShadow`, keyframes, animations, spacing scale unchanged.

## Explicitly out of scope
- No color changes in light or dark mode.
- No component/JSX edits — the typography change flows through Tailwind's `font-sans` default and the base `h1..h6` rule.
- No changes to signature fonts, admin-scope typography, mobile input sizing, or `.font-size-preserve` nav rules.
- No changes to gradients, status colors, borders, or brand accents.

## Result
Every heading renders in Sora with tight tracking. Every body/UI surface renders in Manrope with Tag's stylistic-set features. Cards and shells pick up the softer 0.9rem radius and Tag's ink-tinted shadow depth. All Holarc colors (teal primary, terracotta, SOS red, admin palette, sidebar theming, dark mode) remain identical.
