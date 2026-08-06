# Hero: resize capability graphic and center tagline on the logo

## Changes in `src/pages/Landing.tsx`

1. **Shrink the capability wave image by 20%** — reduce its max width from `max-w-5xl` (64rem) to `max-w-[51rem]`, keeping it centered and auto-height.

2. **Increase padding above and below the capability graphic** — replace the current tight negative offsets (`-mt-6 lg:-mt-20`) with balanced vertical spacing (roughly `py-8 lg:py-12`) so the graphic breathes between the hero copy and the CTA row. The CTA row's negative top margin is relaxed to match so nothing collides.

3. **Center the slogan and subtext on the logo** — wrap the logo together with the eyebrow line (`[STATUS: ACTIVE]`) and the bracketed slogan in an inline column block that is centered as a group, so those two lines share the logo's center axis instead of starting at the column's left edge. The logo keeps its current size and position; the longer intro paragraph stays full column width and justified.
