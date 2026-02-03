/**
 * Anatomy Validation Index
 * Exports quality validation utilities
 */

export { 
  validateAnatomyAsset, 
  hasCartoonIndicators,
  validateColorPalette,
  generateQualityReport,
  QUALITY_CODES,
} from "./AnatomyQualityValidator";

export type { 
  QualityValidationResult, 
  QualityViolation, 
  AnatomyAssetMetadata 
} from "./AnatomyQualityValidator";

export { QualityRejectionOverlay } from "./QualityRejectionOverlay";
