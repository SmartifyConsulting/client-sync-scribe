

# Restore Line Tool and Remove SVG Figurines

## What happened
The previous edit mistakenly removed the **Line drawing tool** from the toolbar instead of removing the **SVG stick-figure anatomy drawings**. This plan fixes both issues.

## Changes

### 1. Restore the Line Drawing Tool
- Add `"line"` back to the `Tool` type union
- Add the Line tool button (using the `Minus` icon) back to the toolbar
- Restore line drawing logic in mouse/touch event handlers and canvas rendering

### 2. Remove SVG Figurine Anatomy Assets
Remove these SVG-based line-drawing assets from the `anatomyAssets` array since they are basic stick figures, not clinical-grade:
- **Body (Front)** - `FullBodyFrontSVG`
- **Body (Back)** - `FullBodyBackSVG`
- **Face (Front)** - `FaceFrontSVG`
- **Face (Side)** - `FaceSideSVG`
- **Spine** - `SpineSVG`
- **Shoulder** - `ShoulderSVG`
- **Knee** - `KneeSVG`
- **Hand** - `HandSVG`
- **Foot** - `FootSVG`
- **Pelvis** - `PelvisSVG`

These will be removed from `AnatomyAssets.tsx`. The image-based versions (Shoulder Detail, Knee Detail, Hands and Wrists, Ankles, Podiatry, etc.) already exist and will remain.

The SVG component code can be left in the file for now (dead code) or cleaned up -- it won't affect anything since nothing references them from the assets array.

### 3. Remove the "Body" Tab
With Body Front and Body Back removed, the only remaining "body" category item is Pain Points. This will be moved to the **Systems** category so the Body tab can be removed entirely.

## Technical Details

### `src/components/drawings/DrawingPad.tsx`
- Add `"line"` back to `type Tool`
- Add Line button (`<Minus />` icon) to toolbar between Arrow and Circle (or similar position)
- Restore line handling in `handleCanvasMouseDown`, `handleCanvasMouseMove`, `handleCanvasMouseUp` and `drawElement` -- treat line as a shape tool that draws from start point to end point
- Restore line rendering in the canvas draw function

### `src/components/drawings/AnatomyAssets.tsx`
- Remove these entries from `anatomyAssets[]`:
  - `body-front` (FullBodyFrontSVG)
  - `body-back` (FullBodyBackSVG)
  - `face-front` (FaceFrontSVG)
  - `face-side` (FaceSideSVG)
  - `spine` (SpineSVG) -- keep `neuro-spinal-cord` (image-based)
  - `shoulder` (ShoulderSVG) -- keep `ortho-shoulder` (image-based)
  - `knee` (KneeSVG) -- keep `ortho-knee` (image-based)
  - `hand` (HandSVG) -- keep `ortho-hands` (image-based)
  - `foot` (FootSVG) -- keep `ortho-podiatry` and `ortho-ankles`
- Move `body-pain` (Pain Points) to `"systems"` category
- Remove `"body"` and `"spine"` from the category union type (no longer needed)

### `src/components/drawings/DrawingPad.tsx` (tabs)
- Remove the "Body" tab from the TabsList
- Ensure remaining tabs: Face, Joints, Systems, Neuro, Plastic Surgery

