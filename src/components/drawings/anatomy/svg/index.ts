/**
 * Anatomy SVG Index
 * Exports all anatomy system components
 */

// Colors and helpers
export { ANATOMY_COLORS, SVG_FILTERS, SVG_GRADIENTS } from "./AnatomyColors";
export type { AnatomyColorCategory } from "./AnatomyColors";

export { 
  getLayerStyle, 
  AnatomyLayer, 
  AnatomySVGDefs, 
  AnatomyLabel, 
  LeaderLine, 
  HighlightOverlay 
} from "./SVGHelpers";
export type { LayerState } from "./SVGHelpers";

// System SVGs
export { SkeletalSystemSVG } from "./SkeletalSystemSVG";
export { MuscularSystemSVG } from "./MuscularSystemSVG";
export { CardiovascularSystemSVG } from "./CardiovascularSystemSVG";

// Re-export for convenience
export type AnatomyViewType = "anterior" | "posterior" | "lateral" | "detail";

// Import LayerState for the interface
import type { LayerState as LS } from "./SVGHelpers";

export interface AnatomySystemSVGProps {
  viewType: AnatomyViewType;
  layerStates: Record<string, LS>;
  onLayerClick?: (layerId: string) => void;
  showLabels?: boolean;
}
