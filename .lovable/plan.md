

# Add Plastic Surgery Images, Fix Shapes, and Add Resize Support

## Overview
Three changes: add a new "Plastic Surgery" category with 4 uploaded images, fix the broken shape tools, and add touch/mouse resizing for anatomy elements on the canvas.

## 1. Add Plastic Surgery Category

Copy the 4 uploaded images to `src/assets/anatomy/`:
- Breast_Augmentation.png
- Injectibles_and_Fillers.png
- Body_Controuring.png
- Facial.png

**AnatomyAssets.tsx changes:**
- Add `"plastic-surgery"` to the category union type
- Import the 4 new PNGs
- Add 4 new entries to `anatomyAssets` array with category `"plastic-surgery"`

**DrawingPad.tsx changes:**
- Add a 6th tab called "Plastic Surgery" (or abbreviated "Plastic" to fit)
- Update TabsList grid from 5 to 6 columns
- Add `"plastic-surgery"` to the categories loop

## 2. Fix Shape Tools (Line, Arrow, Circle, Rectangle)

The shape tools are broken because the `handleMouseUp` function (lines 287-294) has incomplete logic -- it detects the shape tool but never creates the shape element.

**Fix in handleMouseUp:**
- Track the mouse position at mouseUp to get `endX`/`endY`
- Create a proper `CanvasElement` of type `"shape"` with the correct `shapeType`, start coordinates, and end coordinates
- Add it to elements and history

**Fix in handleMouseMove:**
- Add real-time preview for shapes while dragging (draw temporary shape on canvas during drag)

## 3. Add Resizable Anatomy Elements (Touch + Mouse)

Add resize handles to anatomy overlay elements so doctors can resize images on both iPad (pinch/drag) and laptop (corner drag handles).

**Implementation:**
- Add visible corner resize handles (small squares) on each anatomy overlay element when hovered or selected
- On mouse drag of a handle, update the element's `width`/`height` proportionally
- Add touch event handlers (`onTouchStart`, `onTouchMove`, `onTouchEnd`) on the canvas for drawing support
- Add pinch-to-zoom gesture detection on anatomy elements for iPad resizing
- Maintain aspect ratio during resize by default

## Technical Details

### AnatomyAssets.tsx
- Extend category type: `"body" | "spine" | "face" | "joints" | "systems" | "plastic-surgery"`
- Import 4 images from `@/assets/anatomy/`
- Add entries: `{ id: "ps-breast", name: "Breast Augmentation", category: "plastic-surgery", ... }` etc.

### DrawingPad.tsx - Shape Fix
The current `handleMouseUp` at line 287 checks for shape tools but does nothing. Replace with:
- Store the final mouse position when mouseUp fires
- Create a new `CanvasElement` with `type: "shape"`, `data: { shapeType, endX, endY }`, positioned at `shapeStart`
- Push to elements array and history

### DrawingPad.tsx - Resize Handles
- Track a `resizingElement` state with the element ID and which handle is being dragged
- Render small drag handles at corners of anatomy overlays
- On handle mousedown/touchstart, enter resize mode
- On mousemove/touchmove, calculate new dimensions maintaining aspect ratio
- On mouseup/touchend, commit the resize to elements array
- Add `onTouchStart`/`onTouchMove`/`onTouchEnd` to the canvas element mirroring the mouse handlers for iPad drawing support

### No Database Changes Required
The existing `session_drawings` table stores element dimensions (`width`, `height`) already, so resized elements will persist correctly.

