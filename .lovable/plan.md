## Scope

Six focused UI polish items across patient profile, doctor profile, first-login modal, footer/toaster, and My Sessions.

## 1. Patient profile — match doctor profile formatting

In `src/features/patients/components/PatientDetailsEditor.tsx` (Personal Information and Medical Information tab views):
- Wrap the sections in a single bordered "table" frame with `divide-y` (same container pattern as `MyPractice.tsx`).
- Accordion bars: transparent by default with `hover:bg-muted`; when expanded (`data-[state=open]`) switch to `bg-primary text-white` with white chevron.
- Only the top accordion in each tab remains expanded by default (already green due to open state).
- Section headings inside use `text-base font-semibold`.

## 2. Sub-tab heading parity

- **Patient profile**: Sessions sub-tab heading, Insurance sub-tab heading, and Pharmacies sub-tab heading → match the Hospital **Admissions** sub-tab heading (flat row, `text-sm font-semibold`, no bordered card frame).
- **Doctor profile**: Credentials and Referral Doctors sub-tab headings → match the **Medical Information** heading pattern (`text-base font-semibold`).

Files: `src/features/patients/components/PatientDetailsEditor.tsx`, `src/pages/MyPractice.tsx`.

## 3. First-login MVP notice icon

In `src/components/EarlyReleaseNotice.tsx`:
- Replace the `Sparkles` icon with the Holarc Health logo image (`src/assets/holarc-health-logo.png`) plus a "BETA" pill next to it.
- Keep the circular container sizing so surrounding layout is unchanged.

## 4. Footer alignment + toaster position

- `src/components/layout/Footer.tsx`: restore center alignment (`justify-center` instead of `justify-start`) within the max-width container.
- Toaster: raise the sonner `<Toaster />` offset so toasts display **above** the footer (roughly `bottom: var(--footer-height) + 12px` on desktop). Update the `<Toaster />` mount (likely in `src/App.tsx` or `src/main.tsx`) with `offset` / `mobileOffset` props, and mirror for the legacy `@/components/ui/toaster` viewport if used.

## 5. My Sessions — top accordion white font

In `src/pages/MySessions.tsx`:
- The default-open top accordion ("Today" in date mode / first patient in patient mode) currently uses `bg-primary` on open; ensure the trigger text, count pill text, and chevron are white on that green bar (the previous change may have regressed the label to green text).
- Verify `data-[state=open]` selectors force `text-white` on the label, count badge foreground, and chevron.

## Technical notes

- No business-logic changes; presentation only.
- Accordion pattern reused: `bg-transparent hover:bg-muted data-[state=open]:bg-primary data-[state=open]:text-white`.
- Toaster offset must respect mobile (no desktop footer on mobile — use `mobileOffset` unchanged or small).
