# Hero tightening: bigger copy, centred tagline, raised capability graphic

## What changes

1. **Copy size** — The intro paragraph under the bracketed slogan goes from 14px to 18px (`text-[18px]`, Manrope, weight 400).

2. **Centre alignment** — The eyebrow line, the bracketed slogan `[ built around you. ]` and the intro paragraph are centred horizontally on the logo, so the tagline block's centre axis matches the logo's centre axis. The logo itself does not move — its position and size stay exactly as they are.

3. **Capability graphic moves up** — The radio-wave capabilities image moves out of the separate band below the mosaic and sits directly under the tagline copy, still full-width across the hero, with the vertical rhythm tightened (reduced top/bottom spacing) so the whole hero fits neatly above the fold without a large gap.

4. **Overall vertical tightening** — Section padding and gaps between the logo/tagline block, capability image, and CTA row are reduced so nothing floats and everything reads as one composed block.

5. **New capability graphic** — The radio-wave image is regenerated so that:
   - The wave and pill accents use the app's Holarc teal (#2DB0A6) rather than the current colour treatment.
   - The pill labels are set in the same typeface family as the slogan/subtext (Sora for the slogan-weight labels, Manrope for lighter text), matching the app typography.
   - Same 12 capabilities, same layout language: pills floating over a horizontal waveform, transparent/white background.

## Technical notes

- File: `src/pages/Landing.tsx` only.
- The regenerated image is uploaded via `lovable-assets` and imported as a new `.asset.json` pointer; the old `holarc-capabilities.jpg.asset.json` is removed once nothing references it.
- Alt text (the capability list) is carried over unchanged for accessibility and SEO.
