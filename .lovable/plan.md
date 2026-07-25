## 1. AI Summary font +2pt

In `src/components/sessions/SessionDiagnosticsModal.tsx`, bump every `text-sm` body/heading in the summary, action points, and full assessment blocks to `text-base` (and the disclaimer `text-xs` → `text-sm`), keeping colors and spacing unchanged.

## 2. Hide "Generate Analysis" button

In `src/pages/Sessions.tsx` (AI Clinician card header), remove the manual Generate/Regenerate button from the UI. The analysis is already auto-triggered after the session completes / rolling hint finishes, so the button is redundant. Keep the inline "Analyzing…" spinner state visible so the doctor sees progress, and keep the `generateAIDiagnosis()` function intact (still called programmatically).

## 3. Organ Donor row title

Both Organ Donor collapsibles in `src/features/patients/components/PatientDetailsEditor.tsx` (view mode ~line 2032, edit mode ~line 3549) use custom triggers instead of the shared `SectionHeader`. Change their titles to the same markup as every other row: `text-sm font-semibold text-primary tracking-wide`, `h-4 w-4` icon, plus the open-state white text rule.

## 4. Flatten accordion rows and green top row

Applies to Personal Information and Medical Information tabs (view + edit) in `PatientDetailsEditor.tsx`, and the matching Organ Donor triggers:

- Remove per-row rounded/card framing (`rounded-lg`, `bg-card`, per-row borders) so rows sit flush inside the single outer `rounded-xl` frame, separated only by the existing `divide-y` grey lines.
- Row states, driven by Collapsible `data-[state]`:
  - collapsed: transparent background, green title text, light grey `hover:bg-muted`
  - open: `bg-primary` background with white title, icon, chevron, and inline badge
- The first row in each frame gets `defaultOpen`, so it renders green with white text on load; clicking any other row turns that row green/white (and the previously open one reverts to white/green).

### Technical notes
- The shared `SectionHeader` already applies `data-[state=open]:bg-primary` + `group-data-[state=open]:text-white`; the fix is mostly (a) converting the two bespoke Organ Donor triggers to the same classes, (b) stripping leftover `rounded-lg`/`bg-card`/`border-b` on triggers, and (c) setting `defaultOpen` on the first section of each tab frame instead of `defaultOpen={false}`.
- White-on-green enforced with `!text-white` variants where a hardcoded `text-primary`/`text-primary-dark` would otherwise win.
- No color tokens changed; only existing `primary` / `muted` / `neutral` tokens reused.
