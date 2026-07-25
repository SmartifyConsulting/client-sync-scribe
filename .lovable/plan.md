## Redesign Landing hero + swap logo

### 1. Upload new logo
- Upload `user-uploads://HolarcTransparent-2.png` via `lovable-assets create` → write `src/assets/holarc-health-logo.png.asset.json` (overwriting the existing pointer so every consumer of `holarcLogoAsset` gets the new deep-red art with no code changes elsewhere).
- Existing sizing (`h-16 sm:h-20` on Landing, and all other places importing the same pointer) is preserved.

### 2. Rework hero layout in `src/pages/Landing.tsx` to match the mockup
Current hero is a 12-col split with logo + big H1 + pills + CTAs on the left, and a mosaic on the right. Change to match the reference:

- **Top row (2 columns)**
  - Left col: large logo only (`h-24 sm:h-32 lg:h-40 w-auto`), left-aligned. No H1, no badge here.
  - Right col: keep the existing feature mosaic (Medication Adherence + Round Table + AI Clinical Assistant cards) exactly as-is.
- **Middle band (full width, centered)**
  - Small mono-style eyebrow: `landing.hero.badge` reformatted as `A revolutionary healthcare ecosystem / [STATUS: ACTIVE]` line + `[ built around you ]` in monospace brackets, matching the mockup. Reuses existing `landing.hero.badge` / `landing.hero.titleHighlight` translation keys — no content removed, just re-presented (the removed H1 text was already flagged for removal in the earlier approved plan).
  - Under it: the capability pills row, laid over a subtle audio-waveform SVG motif on both sides (decorative only, uses `bg-primary/30` bars — no new colors).
- **Bottom row (full width)**
  - Left: `Join the Ecosystem` + `Doctors` + `Patients` CTA cluster (existing buttons, unchanged).
  - Right: `Holarc Help (SOS)` card (existing content from the features section pulled up next to CTAs so it sits where the mockup shows it). Chips underneath: Emergency responders · Hospitals · Blood banks (existing `landing.features.emergencyResponders/hospitals/bloodBanks` keys).
- Description paragraph and Trust strip stay, moved just below the CTA row so no content is lost.
- Mobile app download card + InstallAppPrompt keep their current positions further down the page.

### 3. Constraints
- No color changes: only current tokens (`primary`, `#E01837`, `muted`, `card`, `border`) reused.
- No copy removed except the `landing.hero.title` H1 ("A revolutionary healthcare ecosystem built around you.") per the earlier instruction; every other translation key stays wired.
- No changes outside `src/pages/Landing.tsx` and the logo `.asset.json` pointer.

### Verification
- `bun run build` passes.
- Visual check via Playwright screenshot of `/` at 1280 wide confirms: new logo top-left, mosaic top-right, mono eyebrow + pills mid, CTAs + SOS card bottom, colors unchanged.
