
# Holarc Health rebrand — flat, elegant, trustworthy

Goal: shift the entire app to the new visual language from your reference (white surfaces, hairline borders, teal accents, crimson sparingly, calm typography) without touching the existing logo or any business logic.

## 1. Design tokens (`src/index.css`)

Rewrite the `:root` (and dark) HSL tokens so every existing component picks the new palette up automatically — no component refactor needed for color.

- `--background` → #FFFFFF
- `--muted` / surface tint → #F5F5F5
- `--foreground` → #111111
- `--muted-foreground` → #555555
- `--border`, `--input` → #E5E5E5
- `--primary` → #17AFA0 (teal), `--primary-foreground` #FFFFFF, `--primary-dark` darker teal for hover/active
- `--accent` → very light teal tint (#E8F7F5) for selected/hover backgrounds
- `--destructive` / `--terracotta` → #E31D3A (crimson, used sparingly)
- `--ring` → teal
- `--radius` → 0.5rem (8px); buttons use 6px via variant
- **Remove all shadow tokens' visual weight**: set `--shadow-xs/sm/md/lg/xl/card/card-hover/modal` to `none` (keep variable names so nothing breaks). `--shadow-glow` becomes a 1px teal border ring instead of a glow.
- Delete `.card-modern:hover { transform }`, `.hover-lift` transform, and the `--gradient-sos` gradient (replace SOS bg with flat crimson). Keep class names so consumers don't break.

## 2. Typography

- Add Poppins via `@fontsource/poppins` (400/500/600/700) alongside the existing Inter import.
- `tailwind.config.ts`: extend `fontFamily` with `display: ['Poppins', ...]` and keep `sans: ['Inter', ...]`.
- In `@layer base`: `h1, h2, h3, h4 { font-family: Poppins; font-weight: 600; }`, body stays Inter 400–500, `line-height: 1.7` on body.
- Strip remaining `uppercase` + wide tracking from headings/labels globally (sentence case). Metric labels keep uppercase per spec (11px, 600, teal).

## 3. Component variants (no structural changes)

- **Button** (`src/components/ui/button.tsx`): `default` → flat teal bg, white text, 6px radius, hover = `--primary-dark`, no ring glow, no shadow. `outline` → 1px `--border`, hover border teal. `destructive` → flat crimson. Remove `[&_svg]:size-4` only if it conflicts; keep otherwise.
- **Card** (`src/components/ui/card.tsx`): white bg, 1px `--border`, 8px radius, no shadow; hover utility class flips border to teal + bg `--muted`.
- **Input / Textarea / Select**: white bg, 1px `--border`, 8px radius, focus → teal border, no ring offset glow.
- **Tabs**: active = teal text + 2px teal bottom border, inactive = muted text, no pill background (overrides current teal-filled TabsList per memory — scoped to patient-facing surfaces; admin keeps current dense style).
- **Badge / Pill**: flat — light teal tint bg + teal text, or flat crimson for alerts.
- **Navigation items** (`AppLayout`, `PatientAppLayout`, top nav): active = teal text + 2px teal underline, hover = teal text. No pill backgrounds, no accent fills.

## 4. Patient-facing screens (visual pass only)

Apply the new tokens + remove decorative styling on:

- Patient Dashboard (`src/pages/patient/PatientDashboard.tsx`) — match reference: large welcome heading, sentence case, metric cards row (teal label, 32px teal value, gray delta), single "What's next" card with row items.
- Settings (`src/pages/Settings.tsx` + `SettingsContent.tsx`) — flat sections, hairline dividers, generous 1.5–2rem padding.
- Auth / Onboarding (`Auth.tsx`, `ForgotPassword.tsx`, `ResetPassword.tsx`, `ProviderSignup.tsx`, `PatientConsent.tsx`) — warm copy tweaks ("Welcome back", "We'll get you sorted in a moment"), flat inputs, teal primary CTA, crimson reserved for destructive only.
- Notifications (`Notifications.tsx`) — clean list rows, no colored backgrounds except a 2px left teal border for unread.
- Forms across Patient Profile / MyDetails — spacious, label above input, helper text in muted gray.

## 5. Safety & trust microcopy

- Footer strip (already present on dashboard): keep "HIPAA-aligned, encrypted, patient-controlled" — restyle to flat hairline-bordered band, crimson only on the HIPAA pill.
- Add a small "Your data, your control" reassurance line on Auth and Consent screens.

## 6. Out of scope

- Logo (kept exactly as-is).
- Doctor/admin dense table styling (`admin-tab-scope`, `admin-table-wrap`) — left intact per existing admin memory; only color tokens shift.
- Business logic, routes, data, edge functions, RLS.
- HolarcHelp SOS map visuals beyond swapping the gradient for flat crimson.

## Technical notes

- Token swap in `index.css` + button/card/input variant updates carries ~80% of the rebrand automatically because the codebase already uses semantic classes (`bg-primary`, `border-border`, `text-foreground`).
- Memory entries `design/standardized-tab-styling` and `style/color-palette` will be updated after implementation to reflect the new teal/crimson + flat tab system.
- No new dependencies except `@fontsource/poppins`.
