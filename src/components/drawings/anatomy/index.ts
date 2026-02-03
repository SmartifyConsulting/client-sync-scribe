/**
 * Anatomy Module Index
 * Exports all anatomy-related components and types
 */

// Types and Data
export { 
  COMPLETE_ANATOMY_HIERARCHY,
  findStructureById,
  getSystemLayerIds,
  getAllStructures,
} from "./AnatomyHierarchy";

export type { 
  AnatomyStructure, 
  AnatomySubsystem, 
  AnatomySystem 
} from "./AnatomyHierarchy";

// Components
export { LayerControls } from "./LayerControls";
export type { LayerState } from "./LayerControls";

export { LayeredAnatomySVG, SkeletalAnteriorSVG } from "./LayeredAnatomySVG";

export { 
  CompleteAnatomyBrowser, 
  StructureDetailPanel 
} from "./CompleteAnatomyBrowser";
