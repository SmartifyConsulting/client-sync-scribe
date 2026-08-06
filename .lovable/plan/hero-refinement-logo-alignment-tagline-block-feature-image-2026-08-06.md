# Hero refinement: logo alignment, tagline block, feature image

## What changes

1. **Logo alignment** — The Holarc logo currently centres against the full height of the right-hand mosaic (4 cards). Move it so it sits vertically centred against just the top row of that mosaic (Medication Adherence + Round Table cards).

2. **Tagline block moves under the logo** — The mono eyebrow line, the bracketed headline and the intro paragraph (currently a separate centred band below the whole top row) move directly underneath the logo, in the left column, as a tag block. Text left-aligns with the logo on desktop, centred on mobile.

3. **Intro paragraph typography** — "Holarc is one connected platform…" becomes Manrope, 14px (`text-sm`), weight 400, no responsive size bump.

4. **Feature chips replaced with the supplied image** — The 12 hand-built capability pills and their waveform motif are removed and replaced by the uploaded features graphic (pills over a waveform), rendered full-width and centred, with descriptive alt text listing the capabilities so the content stays accessible and indexable.

## Technical notes

- File: `src/pages/Landing.tsx` only.
- Restructure the top grid: left column becomes a vertical stack (logo → tagline block) with `items-start`/`self-start` so it aligns with the mosaic's first row rather than the mosaic's centre.
- The features image is registered via `lovable-assets` and imported as an asset pointer (`src/assets/holarc-capabilities.png.asset.json`), not committed as a binary.
- Remove now-unused lucide icon imports (Pill, Hospital, ClipboardList, Calendar, Siren, Ambulance, Building2) if no longer referenced elsewhere in the file.
- Existing `landing.capabilities.*` translation keys stay in the locale files, used for the image alt text where practical; no locale edits required.
