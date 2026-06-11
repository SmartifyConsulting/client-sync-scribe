## Goals
1. Help less tech-savvy users install Google Authenticator from the 2FA enrollment screen.
2. Fix the unreadable text on the pastel-yellow "Save this key" warning.
3. Give first-time users a guided tour of the app with animated arrows and role-aware tips.

---

## Part A — Authenticator download helpers (MfaEnrollScreen)

File: `src/components/auth/MfaEnrollScreen.tsx`

Add a "Don't have an authenticator app? Get Google Authenticator" block above the QR code with two large buttons:
- **Android — Google Play**: `https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2`
- **iPhone — App Store**: `https://apps.apple.com/app/google-authenticator/id388497605`

Each opens in a new tab (`target="_blank" rel="noopener"`), uses a Smartphone/Apple/Play icon, and includes one-line plain-language instructions ("Tap to install on your phone, then come back here to scan the code"). Auto-detect platform via `navigator.userAgent` to highlight the matching store button first, but always show both.

## Part B — Warning text contrast fix

Same file, the "Save this key somewhere safe" callout currently uses `bg-warning/10` + `text-warning-foreground`, which renders white-on-pastel-yellow.

Change to:
- Container: `bg-warning/10 border border-warning/40`
- Text: `text-foreground` (black in light mode, readable in dark)
- Icon: keep `text-warning` but darken via `text-yellow-700 dark:text-yellow-400` for visibility

## Part C — First-login guided tour with animated arrows

### Approach
Lightweight in-house tour (no new heavy library). Use Framer Motion (already in project) for animated bouncing arrows + tooltip cards that point to real DOM elements via `data-tour="<id>"` attributes.

### New files
- `src/components/tour/TourProvider.tsx` — context that holds current step index, role, and `start/next/skip/finish` actions. Renders a fixed overlay (semi-transparent dim) + animated `ArrowCallout` pointing to the element matched by `data-tour={step.target}`.
- `src/components/tour/ArrowCallout.tsx` — Framer Motion arrow (bouncing on x or y) + card with title, message, "Next" / "Skip tour" buttons. Positions itself relative to the target element's bounding rect; repositions on resize/scroll.
- `src/components/tour/tourSteps.ts` — role-keyed step definitions:
  - **doctor**:
    1. Practice info → `data-tour="practice-settings"` ("Add your practice details, logo and letterhead here.")
    2. Import patients → `data-tour="import-patients"` ("Bring in your existing patient list from a spreadsheet.")
    3. Start session recording → `data-tour="start-session"` ("Start a recorded patient session — AI will transcribe and summarise it.")
    4. Daily digest → `data-tour="daily-digest"` ("Listen to your AI-narrated daily briefing here.")
  - **patient**:
    1. Holarchive → `data-tour="my-holarchive"`
    2. To-do list → `data-tour="my-todo"`
    3. SOS → `data-tour="sos-button"`
    4. Connect a doctor → `data-tour="connect-doctor"`

### Persistence
- Track completion via Supabase `profiles` table: add `tour_completed_at timestamptz` and `tour_skipped_at timestamptz` columns (migration).
- After login (in `MfaGate` success path or root layout), read these columns. If both are null, call `TourProvider.start(role)` once the dashboard route has mounted.
- "Skip tour" sets `tour_skipped_at`; "Finish" sets `tour_completed_at`. Either prevents the tour from re-appearing.

### Wire-in points (add `data-tour` attributes to existing elements — no logic change)
- Doctor sidebar/admin entries for Practice, Patient list import, Sessions, Briefing.
- Patient nav for Holarchive, To-Do, SOS, Connect.
- Mount `<TourProvider>` near the top of `src/App.tsx` inside the authenticated tree (wrapping `MfaGate` children).

### Restart from settings
Add a small "Show app tour again" button in `SettingsContent.tsx` that clears the timestamps and triggers `start()`.

---

## Out of scope
- No changes to auth/MFA logic, sign-up flows, or RLS.
- No new tour library (e.g. shepherd.js, react-joyride) — Framer Motion only.
- No changes to existing copy elsewhere.

## Files
- `src/components/auth/MfaEnrollScreen.tsx` (edit)
- `src/components/tour/TourProvider.tsx` (new)
- `src/components/tour/ArrowCallout.tsx` (new)
- `src/components/tour/tourSteps.ts` (new)
- `src/App.tsx` (mount provider, auto-start hook)
- `src/components/settings/SettingsContent.tsx` (replay button)
- Sidebar/nav files for doctor + patient (add `data-tour` attributes only)
- Supabase migration adding `tour_completed_at` + `tour_skipped_at` to `profiles`
