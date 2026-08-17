# Polish the patient picker + refresh the capabilities graphic

## 1. Patient selector dropdown (Sessions page)

The dropdown currently looks unfinished: the popover is a fixed 300px and doesn't line up with the trigger, the search field renders with a heavy teal focus ring that overflows the panel edges, and the empty state is a bare sentence floating in white space.

Changes in `src/pages/Sessions.tsx`:

- Match the popover width to the trigger (`w-[--radix-popover-trigger-width]`) so panel and button align, and give it a slightly wider max on desktop.
- Give the popover a proper card treatment: rounded corners, subtle border and shadow using existing tokens (no new colours).
- Rework the search row: remove the boxed/ringed input look, keep the magnifier icon inline with a clean bottom-border separator, left-aligned placeholder.
- Empty state: centred icon + "No patients found" title with a muted one-line hint, instead of a lone sentence.
- List rows: consistent height, hover/selected states from tokens, name left-aligned with a small avatar-style initials circle in place of the generic person icon, tick mark right-aligned instead of leading.
- Scrollable list capped at ~280px with sensible padding.

No changes to selection logic, sorting (still by surname), or data fetching.

## 2. Capabilities wave image

`holarc-capabilities-wave.png` (used on the landing page) is soft and the label text isn't crisp. Regenerate it at higher resolution with the same composition — teal wave band behind three rows of white rounded pill badges with icons, same 14 labels (Voice Consultations, AI Summaries, Incentivized Adherence, Rewards, Round Table, Prescriptions, Hospital Admissions, Auto-Tasks, Unified Calendar, Emergency SOS, Emergency Response Dispatch, Hospital Network, Increased Governance) — using the premium image tier for legible typography, then replace the asset pointer so the landing page picks it up automatically.

Same teal brand colour, no palette change.
