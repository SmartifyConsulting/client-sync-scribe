## Update Sign-Up & Authenticate skill

Add a new section to `.workspace/skills/sign-up-and-authenticate/SKILL.md` (via draft at `.agents/skills/sign-up-and-authenticate/SKILL.md`, then `skills--apply_draft`) that codifies the install-app banner as an always-on auth-shell requirement.

### New section: "10. Install-app banner on every sign-in"

Rules to encode:

- Every authenticated session must render an **install-app banner** at the very top of the app shell (above the header/nav), on every page, until the user either installs or dismisses it.
- Reuse the existing `InstallAppPrompt` styling pattern (`src/components/InstallAppPrompt.tsx`) — teal-tinted card, Smartphone icon, "Install Holarc on your phone / Works on iPhone and Android — one-tap access from your home screen.", and the `InstallAppButton variant="primary"` action. Add a right-aligned dismiss (X) button.
- Visibility logic (in order):
  1. Hidden if `isStandalone()` is true (already installed).
  2. Hidden if `appinstalled` has fired this session.
  3. Hidden if `localStorage["holarc-install-banner-dismissed"] === "1"` (permanent dismiss — survives sign-out/sign-in by design; only cleared by the user reinstalling the browser profile or via a future "show install tips again" entry).
  4. Otherwise shown on every authenticated route, including after each fresh sign-in.
- Key name: `holarc-install-banner-dismissed`. Do not reuse `holarc-install-dismissed-until` (that one is the 7-day soft-dismiss for the compact header button and stays as-is).
- Dismiss button: sets the key to `"1"`, hides the banner, no toast.
- Install button: delegates to existing `InstallAppButton` (handles `beforeinstallprompt`, iOS Safari sheet, Android browser-specific sheet). On successful `appinstalled`, banner hides automatically.
- Mount point: top of the authenticated layout wrapper (the same layout that hosts `AppHeader` / `MobileHeader`), so it appears on every signed-in page and immediately after redirect from `/auth` → `/dashboard` / onboarding. Do **not** mount it on `/auth`, `/verify-email`, `/forgot-password`, `/reset-password`, or `/auth/challenge` — those screens stay focused on the auth task.
- Accessibility: banner is a `<div role="region" aria-label="Install app">`; dismiss button has `aria-label="Dismiss install banner"` and `tabIndex={-1}` so it doesn't interfere with the §8 auth-form tab order on pages that contain forms.

### Implementation notes embedded in the skill

- New component `src/components/InstallAppBanner.tsx` that wraps `InstallAppPrompt` content with the dismiss control + localStorage gate + `appinstalled` listener.
- Mount in the authenticated layout (e.g. the wrapper used by `RequireEmailVerified`/dashboard routes). The skill will name the file but leave the exact layout file to whoever implements it, since this skill is a contract not a patch.

### File map update

Add to the existing File map table:

| Persistent install banner | `src/components/InstallAppBanner.tsx` (mounted in authed layout) |

### Out of scope

- No changes to `InstallAppButton` or `InstallAppPrompt` behavior.
- No analytics, no server-side tracking of dismissals.
- No re-prompt schedule — dismiss is permanent until the user clears site data.
