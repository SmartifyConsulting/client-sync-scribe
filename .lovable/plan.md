# UX & Trust Polish Plan

Scope is split into three priority tiers matching your brief. I'll keep all work in frontend/presentation code — no backend logic, RLS, or schema changes.

---

## Tier 1 — High Impact

### 1. Professional Landing Page at `/`
`src/pages/Landing.tsx` exists but currently redirects authed users straight to `/dashboard` and is sparse for unauthenticated visitors. Rebuild it as a true marketing page:

- **Hero**: headline "Streamline your practice", subhead, teal primary "Sign Up" CTA + outline "Log In" CTA, supporting illustration/screenshot.
- **Feature grid** (4 cards): Client management · Appointment scheduling · AI session summaries · Automated follow-ups. Each with lucide icon + 1-line benefit.
- **Security strip**: HIPAA-aligned, AES-256 encryption, GDPR, "2FA required" badges with shield/lock icons.
- **Social proof**: testimonial block (3 quotes) + practitioner count stat row. Copy will be placeholder you can swap later.
- **Footer**: links to `/legal`, `/terms-and-conditions`, `/business-associate-agreement`, `/patient-consent`, support email `mailto:`.
- Keep existing redirect for **authenticated** users → `/dashboard`; show landing only when no session.
- SEO: `<title>`, meta description, single `<h1>`, JSON-LD Organization.

### 2. Auth Page UI (`src/pages/Auth.tsx`)
- Clear **tab switch** between Log In and Sign Up (shadcn Tabs, teal active state).
- Trust band above form: lock icon "Your data is encrypted", shield "2FA required", company logo.
- Replace inline red text with **error Alert cards** (icon + title + message).
- **Password strength meter** on signup (zxcvbn-style: length, mixed case, number, symbol — no new dep, simple scoring).
- Prominent **Forgot password?** link (already routed at `/forgot-password`), with `tabIndex={-1}` per your global rule so tab order is Email → Password → Submit.
- Show/hide eye toggle on every password input (global rule already in user memory).
- Google social login button (uses existing Supabase OAuth; Google provider must be enabled in backend auth panel — I'll note this in the UI as a follow-up if it errors).

### 3. Mobile-friendly MFA Setup (`src/components/auth/MfaEnrollScreen.tsx`)
- Single-column vertical stack on `< sm`.
- QR code scales to ~80vw on mobile (cap ~320px).
- 6-digit input: larger font, 56px height, `inputMode="numeric"`.
- All actionable buttons ≥ 48px tall on mobile.
- Hide the desktop-only "scan with your camera" helper text on mobile; surface the "Enter setup key" path first.
- Sticky bottom "Verify & enable" button on small screens.

---

## Tier 2 — Polish & Consistency

### 4. Design system audit
- Sweep buttons/links/spinners to ensure they use semantic tokens (`bg-primary`, `text-primary`, etc.) — no hardcoded teal hexes in components.
- Standardize spinner to a single `<LoadingSpinner />` usage.
- Confirm hover states: `hover:bg-primary/90` everywhere primary is used.

### 5. Loading states
- Add `Skeleton` blocks for landing hero, auth form mount, MFA QR fetch (replace current `Loader2` blank state with skeleton + status text e.g. "Setting up 2FA…", "Verifying code…").

### 6. Better error copy
- MFA invalid code → "That code is incorrect. Codes refresh every 30 seconds — try the newest one in your authenticator app."
- Network/unknown errors get friendly fallback + retry button.

### 7. Micro-interactions
- Success check animation (Framer Motion scale+fade) after MFA verify before routing.
- Copy-secret button shows inline "Copied!" state for 1.5s in addition to toast.
- Use `sonner` toasts consistently (no blocking modals for transient feedback).

---

## Tier 3 — Larger follow-ups (flag, not build now unless approved)

### 8. Dark mode toggle
Add a theme switch in `SettingsContent.tsx`, persist in `localStorage`, wire `class="dark"` on `<html>`. Requires verifying every screen renders in dark — non-trivial QA pass. **Recommend doing this as a dedicated follow-up turn** so it gets proper review.

### 9. Onboarding tour extensions
`TourProvider` + `tourSteps.ts` already exist. Add tour anchors (`data-tour` attrs) on:
- Patients page "+ Add patient" button → "Click + to add a new client"
- Calendar "+ New appointment" → "Schedule sessions here"
- Dashboard daily-digest card → "Listen to your daily digest"

This is small; I'll include it in this pass unless you want to defer.

---

## Out of scope
- No backend/RLS/schema changes.
- No new dependencies.
- No changes to MFA enforcement logic (`MfaGate`) — only its visual screens.
- No replacement of the existing tour engine, only new anchor points + copy.

## Files I'll touch
- `src/pages/Landing.tsx` (rewrite)
- `src/pages/Auth.tsx` (restructure)
- `src/components/auth/MfaEnrollScreen.tsx` (responsive pass + copy)
- `src/components/tour/tourSteps.ts` (+ data-tour attrs on Patients, Calendar, Dashboard)
- Small shared additions: `src/components/landing/*` (Hero, Features, SecurityStrip, Testimonials, Footer), `src/components/auth/PasswordStrength.tsx`, `src/components/auth/AuthErrorAlert.tsx`
- `index.html` for landing SEO tags

## Confirm before I build
1. **Tour additions (item 9)** — include in this pass or defer?
2. **Dark mode (item 8)** — defer to a separate turn? (recommended)
3. **Google social login** — okay to add the button now assuming you'll enable the Google provider in the backend auth panel?
