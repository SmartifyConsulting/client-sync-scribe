
# Add Clinical Anatomy Images to Drawing Pad

## Overview
Replace/augment the current SVG line drawings with your uploaded clinical-grade anatomy images, organized under a new "Primary Anatomical Systems" category in the drawing pad's anatomy panel.

## What Will Change

### 1. Copy Images to Project
The 6 uploaded images will be copied into `src/assets/anatomy/`:
- Skeletal_System.png
- Digestive.png
- Respiratory.png
- Neurological.png
- Cardiovascular.png
- Muscular.png

### 2. Update Anatomy Assets (AnatomyAssets.tsx)
- Add a new category: `"systems"` for Primary Anatomical Systems
- Add 6 new image-based anatomy assets that reference the imported PNGs instead of SVG components
- Each asset will use `type: "image"` with an `imageSrc` property pointing to the imported image
- Keep existing SVG assets in their current categories (body, spine, face, joints) so doctors still have access to them

### 3. Update Drawing Pad (DrawingPad.tsx)
- Add a 5th tab called "Systems" to the anatomy panel tabs
- Update the anatomy overlay rendering to handle image-based assets (render as `<img>` tags instead of SVG components)
- Image assets will be draggable onto the canvas just like the existing SVG assets, and doctors can draw/annotate on top of them

### 4. Result
The anatomy panel will have 5 tabs:
- **Body** -- existing SVG outlines (front/back)
- **Spine** -- existing SVG spine/pelvis
- **Face** -- existing SVG face views
- **Joints** -- existing SVG joint diagrams
- **Systems** -- NEW: 6 clinical-grade images (Skeletal, Muscular, Neurological, Cardiovascular, Respiratory, Digestive)

Doctors can drag any system image onto the canvas, resize/position it, and draw annotations on top.

## Technical Details

### AnatomyAssets.tsx Changes
- Import all 6 images as ES6 modules from `@/assets/anatomy/`
- Extend the `AnatomyAsset` interface to support an optional `imageSrc: string` field alongside the existing `component` field
- Add 6 new entries to the `anatomyAssets` array with `category: "systems"`

### DrawingPad.tsx Changes
- Add `"systems"` to the tab categories array
- Update the `TabsList` grid from 4 to 5 columns
- In the anatomy overlay renderer, check if the asset has `imageSrc` -- if so, render an `<img>` element; otherwise render the SVG component as before
- Thumbnail previews in the panel will show scaled-down versions of the images

### No Database Changes Required
The drawing pad already stores anatomy elements by `assetId` in the `session_drawings` table. The new image-based assets will work with the same storage mechanism.
