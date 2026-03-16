

# Fix: Make Shapes and Text Selectable, Movable, and Resizable

## Root Cause

Shapes (circles, rectangles, lines, arrows) and text elements are drawn directly onto the HTML `<canvas>` in `renderCanvas()` (lines 130-180). Once drawn on canvas, they become pixels — **not interactive DOM elements**. You can't click on pixels to select them.

Only `anatomy` elements work because they're rendered as **HTML overlay `<div>`s** (lines 937-986) positioned absolutely over the canvas, with mouse/touch handlers for drag and resize.

## Solution

Render shape and text elements as HTML overlays (like anatomy), not just canvas pixels. This gives them DOM presence so they can be clicked, dragged, and resized.

### Changes to `src/components/drawings/DrawingPad.tsx`:

1. **Stop rendering shapes/text on canvas** — In `renderCanvas()`, skip elements of type `"shape"` and `"text"` (just like `"anatomy"` is already skipped at line 134).

2. **Render shape elements as SVG overlays** — After the anatomy overlays block (line 986), add a new block that maps over `shape` and `text` elements and renders them as absolutely positioned HTML/SVG overlays:
   - **Circle**: An `<svg>` with an `<ellipse>` element, positioned using a bounding box derived from center + radius.
   - **Rectangle**: An `<svg>` with a `<rect>`.
   - **Line/Arrow**: An `<svg>` with a `<line>` and optional arrowhead `<polygon>`.
   - **Text**: A `<div>` with the text content styled with the element's color and font size.

3. **Attach drag and resize handlers** — Each overlay gets the same `handleElementDragStart` and `handleResizeStart` handlers already used by anatomy elements. Selection border and corner resize handles are identical to anatomy's pattern.

4. **Compute bounding boxes** — For each shape type, calculate `left`, `top`, `width`, `height`:
   - Circle: `x - radius, y - radius, 2*radius, 2*radius`
   - Rectangle: `min(x, endX), min(y, endY), abs(endX-x), abs(endY-y)`
   - Line/Arrow: `min(x, endX), min(y, endY), abs(endX-x)+padding, abs(endY-y)+padding`
   - Text: approximate from font size and text length

5. **Update drag/resize to work for shapes** — When a shape is moved, update `x`, `y`, `endX`, `endY` together. When resized, scale the shape proportionally.

6. **Add "select" tool behavior** — When tool is `"select"`, clicking on the canvas overlay of any element selects it (already works for anatomy, will now work for shapes/text too). Add a Delete key handler to remove the selected element.

### Files Modified
- `src/components/drawings/DrawingPad.tsx` — All changes in one file

