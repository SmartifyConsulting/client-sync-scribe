## 1. Fix SQL error on "Change ER Provider"

`public.holarchelp_patient_change_provider` (added in `20260630170238_...sql`) sets `updated_at = now()` on `holarchelp_incidents`, but that table has no `updated_at` column — hence the raw error in the screenshot.

- New migration: `CREATE OR REPLACE FUNCTION public.holarchelp_patient_change_provider(...)` identical to current, with the `updated_at = now()` line removed.

## 2. Default headcounts to 1 (`SeverityPicker.tsx`)

- Initial state: `people = 1`, `breathing = 1`, `unconscious = 1` (still clamped to people).

## 3. "Extend time" for auto-assign countdown (`AvailableResponders.tsx`)

- Add `extensionSec` state (default 0). The countdown deadline becomes `base + extensionSec * 1000`.
- Show a "＋30s more time" button next to the countdown while `remainingSec > 0` and `extensionSec < 60` (cap two extensions = +60s total).
- Works in both initial-pick mode and change-mode (after auto-assign).

## 4. Make "Change ER Provider" clearer & more prominent (`AvailableResponders.tsx`)

When `isChangeMode` is true and the change window is still open:

- Wrap the panel in a prominent amber/primary banner:
  - Title: "An ER provider was auto-assigned — you have 30s to change"
  - Sub: "Tap any provider below to switch, or do nothing to keep <Current>."
- Pin the currently assigned provider to the top with a "Current" pill and disabled "Keep" state; other providers get a primary "Switch" button.
- Once `remainingSec <= 0` in change mode: replace the entire panel with the existing compact "ER Provider locked" note — no list, removing the confusion.

## 5. Make the Incident Number highly visible

`incident_number` (e.g. `INC-2026-000123`) is the workflow handle used across patient ↔ ER ↔ hospital screens, so it must read like a tracking number, not a footnote.

- **Patient `HolarcHelpIncidentDetail.tsx`**: promote the incident number to a sticky pill at the top of the sticky bar — large mono font, copy-to-clipboard icon, with the label "Reference #" in front of it. Use the same styling on the live SOS map header card.
- **Patient `HolarcHelpIncidents.tsx` history list**: show the number on the first row of each card (currently buried).
- **ER provider screens** (`EmergencyDashboardScreen`, `DispatcherConsoleScreen`, `IncomingSosScreen`, `AmbulanceIncidentConsole`, `ActiveDispatchScreen`) and **Hospital** (`HospitalIncidentConsole`, `IncidentTimelineScreen`): render via a new shared `<IncidentNumberBadge number={...} />` component (mono font, primary border, optional copy button) so the reference looks identical everywhere.
- Tracking page (`PublicTrack.tsx`) and notifications: include the incident number in the title and any toast strings.

## 6. App-wide user-friendly message audit

Today many user-visible strings are raw exceptions (e.g. `column "updated_at" of relation "holarchelp_incidents" does not exist`) thrown straight into `toast.error(error.message)`. We'll do one sweep to make every user message friendly, branded, and translation-ready.

### Approach

1. **Audit pass**: ripgrep the app for the noisy patterns and produce a checklist:
   - `toast.error(error.message)` / `toast(error.message)`
   - `alert(`, `window.alert(`, `confirm(`
   - `throw new Error("...")` shown to users
   - Untranslated literal strings in dialogs, empty states, error boundaries
   - Edge function responses surfaced verbatim
2. **Shared error mapper** (`src/lib/userMessage.ts`):
   - `friendlyMessage(error, fallback)` — strips Postgres/Supabase noise (`PGRST…`, `duplicate key…`, `permission denied`, `JWT expired`, network/`Failed to fetch`), maps known codes to plain-language sentences, and returns the fallback otherwise.
   - `toastError(error, fallback)` wrapper around `sonner` that calls `friendlyMessage` and logs the raw error to the console for devs.
3. **Refactor call sites**: replace every `toast.error(error.message)` with `toastError(error, "We couldn't save your changes. Please try again.")` (fallback tuned to the action). High-traffic surfaces first:
   - SOS / HolarcHelp (incidents, change provider, cancellations)
   - Doctor: sessions, prescriptions, documents, invoices, appointments
   - Patient: rewards, uploads, profile sharing, NOK
   - Provider portals: shift start/end, dispatch, accept/decline
   - Auth: sign-in/up, password reset, MFA
4. **Translation**: every new fallback string lives under `messages.*` keys in `src/i18n/uiTranslations.ts` (English first, fall back to English for other locales until a follow-up sweep).
5. **Empty states & loading**: replace generic "No data" with action-oriented copy ("No SOS incidents yet — tap the red SOS button if you need help.").
6. **Error boundary**: ensure `ErrorBoundary` shows a branded "Something went wrong. We've logged the issue." card with a Retry button, not a stack trace.

### Out of scope for this round

- Full translation of new strings into all 25 locales (English + fallback this pass; locale sweep next).
- Deep rewording of long-form legal/marketing copy.
