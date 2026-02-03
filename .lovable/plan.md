

# Plan: Integrate Medical-Grade Anatomy Viewer into DrawingPad

## Problem Summary

The DrawingPad currently uses simplified anatomy assets from `MedicalAnatomyAssets.tsx` which render cartoony, non-clinical visualizations. The medical-grade SVG systems have been built but are not connected to the session workflow the user is viewing at `/sessions`.

## Solution Overview

Integrate the `MedicalAnatomyViewer` component and its clinical-quality SVG systems directly into the `DrawingPad`, replacing the simplified `professionalAnatomyAssets` with the atlas-quality layered anatomy systems.

---

## Implementation Steps

### Step 1: Create a Demo Route for Immediate Verification

**Create `src/pages/AnatomyDemo.tsx`**

A standalone page at `/anatomy-demo` that renders the `MedicalAnatomyViewer` component directly so you can immediately view and verify the medical-grade SVG quality.

- Imports `MedicalAnatomyViewer` from the anatomy folder
- Provides full-screen view of the enhanced SVG systems
- Allows toggling between systems (Skeletal, Muscular, Cardiovascular)
- Enables structure selection, layer visibility, and highlighting

**Add route to `App.tsx`**

```tsx
<Route path="/anatomy-demo" element={<AnatomyDemo />} />
```

### Step 2: Extend MedicalAnatomyViewer with All Systems

**Modify `src/components/drawings/anatomy/MedicalAnatomyViewer.tsx`**

Update the system selector and `renderSystemSVG()` function to include all available enhanced systems:

- Skeletal (existing in svg/)
- Muscular (existing in svg/)
- Cardiovascular (existing in svg/)
- Nervous (enhanced/)
- Respiratory (enhanced/)
- Digestive (enhanced/)
- Urinary (enhanced/)
- Reproductive (enhanced/)

Add imports for the enhanced system SVGs and expand the system tabs.

### Step 3: Integrate into DrawingPad

**Modify `src/components/drawings/DrawingPad.tsx`**

Replace the current anatomy sidebar implementation with an integrated version of the MedicalAnatomyViewer:

| Current State | New State |
|--------------|-----------|
| Uses `professionalAnatomyAssets` array | Uses `MedicalAnatomyViewer` component |
| Drag-drop simplified SVG components | Embedded medical-grade SVG viewport |
| Basic layer toggles (skin/muscular/skeletal/labels) | Full hierarchical structure browser with per-structure controls |

**Changes:**

1. Replace the anatomy sidebar tab content with an embedded mini version of the MedicalAnatomyViewer
2. When a template is loaded, it displays the corresponding anatomy system in the viewer
3. Allow structures to be selected, highlighted, and annotated directly in the main canvas area
4. Retain all existing annotation tools (pen, marker, text, shapes) for overlay drawings

### Step 4: Update Templates to Use Enhanced Systems

**Modify `src/components/drawings/DrawingTemplates.tsx`**

Update template definitions to reference the new medical-grade systems:

```typescript
{
  id: "cardio-assessment",
  // Instead of old assetId references
  system: "cardiovascular", // Maps to CardiovascularSystemSVG
  defaultLayerStates: { ... },
}
```

### Step 5: Add Missing Systems (Future Phase)

The remaining 4 systems need to be created following the same pattern:

- Endocrine System
- Lymphatic System  
- Integumentary System
- Sensory Organs

---

## Technical Considerations

### Architecture Change

```text
Current Flow:
┌─────────────────┐    ┌───────────────────────┐
│ DrawingPad      │───>│ MedicalAnatomyAssets  │
│ (sessions page) │    │ (simplified SVGs)     │
└─────────────────┘    └───────────────────────┘

New Flow:
┌─────────────────┐    ┌────────────────────────┐
│ DrawingPad      │───>│ MedicalAnatomyViewer   │
│ (sessions page) │    │  └── SkeletalSystemSVG │
└─────────────────┘    │  └── MuscularSystemSVG │
                       │  └── CardiovascularSVG │
                       │  └── NervousSystemSVG  │
                       │  └── RespiratorySystemSVG
                       │  └── DigestiveSystemSVG │
                       │  └── UrinarySystemSVG   │
                       │  └── ReproductiveSystemSVG
                       └────────────────────────┘
```

### Files to Modify

| File | Change |
|------|--------|
| `src/pages/AnatomyDemo.tsx` | **NEW** - Demo page for immediate verification |
| `src/App.tsx` | Add route for `/anatomy-demo` |
| `src/components/drawings/anatomy/MedicalAnatomyViewer.tsx` | Add all enhanced systems to the viewer |
| `src/components/drawings/DrawingPad.tsx` | Integrate MedicalAnatomyViewer instead of simplified assets |
| `src/components/drawings/DrawingTemplates.tsx` | Update templates to use new system references |

### Backwards Compatibility

The `professionalAnatomyAssets` and `MedicalAnatomyAssets.tsx` will be retained for now but deprecated. Existing saved drawings that reference old asset IDs will continue to render (graceful fallback).

---

## What You'll See After Implementation

1. **At `/anatomy-demo`**: Full-screen medical anatomy viewer with all 8 available systems, structure browser, layer controls, and clinical highlighting

2. **At `/sessions`**: The DrawingPad will display clinical-quality anatomy with:
   - Hierarchical structure navigation
   - Individual structure selection and highlighting
   - Clinical highlight presets (pathology, inflammation, etc.)
   - Per-structure visibility and opacity controls
   - Annotation overlay tools unchanged

