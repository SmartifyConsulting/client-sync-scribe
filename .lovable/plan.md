# Tighten hero vertical spacing

Goal: pull the capability wave graphic and everything below it upward to close the empty gaps in the hero, without changing the logo, copy or card mosaic positions.

## Changes (src/pages/Landing.tsx)

1. Measure the two gaps in the rendered hero (headless browser):
   - Gap A: bottom of the hero top row (copy column / card mosaic, whichever is lower) to the top of the capability wave image.
   - Gap B: bottom of the wave image to the top of the bottom row (CTA buttons + Holarc Help SOS card).

2. Capability wave block: raise it by two-thirds of Gap A using a negative top margin (replacing the current `-mt-2 lg:-mt-6`), so only one-third of the original whitespace remains above it.

3. Bottom row (CTA buttons, trust chips, Holarc Help SOS card) and everything after it: raise by half of Gap B with a negative top margin on the bottom-row grid. Because the whole block shifts, the app-download strip and the section below move up with it.

4. Re-measure after the edit to confirm the resulting gaps are ~1/3 and ~1/2 of the originals, and that nothing overlaps at desktop (1491px), tablet and mobile widths.

## Notes

- Shifts are applied only on `lg` and up (mobile keeps its stacked spacing) so the narrow layout does not collapse.
- No content, copy, colour or component changes — spacing only.
