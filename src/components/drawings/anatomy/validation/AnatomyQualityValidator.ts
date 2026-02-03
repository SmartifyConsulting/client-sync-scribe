/**
 * Anatomy Quality Validator
 * Enforces medical-grade standards for anatomy visualizations
 * Rejects non-clinical assets (cartoons, simplified forms, etc.)
 */

export interface QualityValidationResult {
  isValid: boolean;
  score: number; // 0-100
  violations: QualityViolation[];
  warnings: string[];
}

export interface QualityViolation {
  code: string;
  severity: "critical" | "major" | "minor";
  message: string;
  remediation: string;
}

export interface AnatomyAssetMetadata {
  id: string;
  systemType: string;
  structureCount: number;
  hasLandmarks: boolean;
  hasLayeredStructure: boolean;
  hasProperArticulations: boolean;
  hasTexturePatterns: boolean;
  colorPaletteType: "clinical" | "stylized" | "unknown";
  morphologyType: "realistic" | "simplified" | "cartoon";
  viewTypes: string[];
}

// Quality criteria codes
export const QUALITY_CODES = {
  // Critical violations (blocks display)
  CARTOON_FORM: "Q001",
  SILHOUETTE_ONLY: "Q002",
  SINGLE_LAYER: "Q003",
  NO_LANDMARKS: "Q004",
  BLOB_SHAPES: "Q005",
  GRADIENT_ONLY_SHADING: "Q006",
  
  // Major violations (warning, may block)
  MISSING_ARTICULATIONS: "Q101",
  SIMPLIFIED_MORPHOLOGY: "Q102",
  NON_CLINICAL_COLORS: "Q103",
  INSUFFICIENT_STRUCTURES: "Q104",
  MISSING_FIBER_DIRECTION: "Q105",
  
  // Minor violations (warnings)
  LIMITED_VIEWS: "Q201",
  MISSING_TEXTURES: "Q202",
  INCOMPLETE_LABELING: "Q203",
} as const;

/**
 * Validates anatomy asset metadata against clinical standards
 */
export function validateAnatomyAsset(metadata: AnatomyAssetMetadata): QualityValidationResult {
  const violations: QualityViolation[] = [];
  const warnings: string[] = [];
  let score = 100;

  // CRITICAL CHECKS (blocks display)
  
  // Check for cartoon/stylized morphology
  if (metadata.morphologyType === "cartoon") {
    violations.push({
      code: QUALITY_CODES.CARTOON_FORM,
      severity: "critical",
      message: "Cartoon or stylized anatomy form detected",
      remediation: "Replace with anatomically accurate medical illustration",
    });
    score -= 50;
  }

  // Check for single-layer (non-interactive) assets
  if (!metadata.hasLayeredStructure) {
    violations.push({
      code: QUALITY_CODES.SINGLE_LAYER,
      severity: "critical",
      message: "Asset lacks layered structure for individual selection",
      remediation: "Implement separate SVG groups for each anatomical structure",
    });
    score -= 40;
  }

  // Check for missing anatomical landmarks
  if (!metadata.hasLandmarks) {
    violations.push({
      code: QUALITY_CODES.NO_LANDMARKS,
      severity: "critical",
      message: "No visible anatomical landmarks (processes, condyles, etc.)",
      remediation: "Add bone landmarks, muscle attachment sites, and surface features",
    });
    score -= 35;
  }

  // MAJOR CHECKS
  
  // Check for missing joint articulations
  if (!metadata.hasProperArticulations && 
      (metadata.systemType === "skeletal" || metadata.systemType === "muscular")) {
    violations.push({
      code: QUALITY_CODES.MISSING_ARTICULATIONS,
      severity: "major",
      message: "Joint articulations not properly defined",
      remediation: "Define clear articulation surfaces between bones",
    });
    score -= 20;
  }

  // Check for simplified morphology
  if (metadata.morphologyType === "simplified") {
    violations.push({
      code: QUALITY_CODES.SIMPLIFIED_MORPHOLOGY,
      severity: "major",
      message: "Morphology is oversimplified for clinical use",
      remediation: "Add anatomically accurate contours and proportions",
    });
    score -= 25;
  }

  // Check for non-clinical color palette
  if (metadata.colorPaletteType !== "clinical") {
    violations.push({
      code: QUALITY_CODES.NON_CLINICAL_COLORS,
      severity: "major",
      message: "Color palette does not match medical atlas standards",
      remediation: "Use tissue-appropriate colors matching Netter/Gray's Anatomy",
    });
    score -= 15;
  }

  // Check structure count thresholds by system
  const minStructures = getMinimumStructureCount(metadata.systemType);
  if (metadata.structureCount < minStructures) {
    violations.push({
      code: QUALITY_CODES.INSUFFICIENT_STRUCTURES,
      severity: "major",
      message: `Insufficient structures: ${metadata.structureCount}/${minStructures} required`,
      remediation: `Add at least ${minStructures - metadata.structureCount} more anatomical structures`,
    });
    score -= 20;
  }

  // MINOR CHECKS
  
  // Check for limited view types
  if (metadata.viewTypes.length < 2) {
    warnings.push("Limited view types available (recommend anterior, posterior, lateral)");
    score -= 5;
  }

  // Check for missing textures
  if (!metadata.hasTexturePatterns) {
    warnings.push("No texture patterns applied (recommended for realism)");
    score -= 5;
  }

  // Ensure score doesn't go below 0
  score = Math.max(0, score);

  // Determine overall validity
  const hasCriticalViolation = violations.some(v => v.severity === "critical");
  const hasMajorViolation = violations.some(v => v.severity === "major");
  
  // Asset is invalid if any critical violation OR score below 50
  const isValid = !hasCriticalViolation && score >= 50;

  return {
    isValid,
    score,
    violations,
    warnings,
  };
}

/**
 * Get minimum required structure count by system type
 */
function getMinimumStructureCount(systemType: string): number {
  const thresholds: Record<string, number> = {
    skeletal: 50,      // Skull, spine, ribs, pelvis, limbs
    muscular: 30,      // Major muscle groups
    cardiovascular: 15, // Heart, major vessels
    nervous: 20,       // Brain, spinal cord, major nerves
    respiratory: 10,   // Airways, lungs
    digestive: 12,     // GI tract organs
    urinary: 5,        // Kidneys, ureters, bladder
    reproductive: 8,   // Reproductive organs
    endocrine: 8,      // Major glands
    lymphatic: 10,     // Lymph nodes, vessels
    integumentary: 5,  // Skin layers
    sensory: 6,        // Eye, ear structures
  };
  
  return thresholds[systemType] || 10;
}

/**
 * Quick check for obvious non-clinical indicators
 */
export function hasCartoonIndicators(svgContent: string): boolean {
  const cartoonPatterns = [
    /smiling|smile/i,
    /face.*emoji/i,
    /😊|😀|🙂/,
    /rounded-full.*body/i,
    /blob/i,
  ];
  
  return cartoonPatterns.some(pattern => pattern.test(svgContent));
}

/**
 * Check if colors match clinical palette
 */
export function validateColorPalette(colors: string[]): boolean {
  // Clinical color ranges (HSL approximations)
  const clinicalColorRanges = {
    bone: { hMin: 30, hMax: 50, sMin: 20, sMax: 50 },
    muscle: { hMin: 0, hMax: 15, sMin: 40, sMax: 70 },
    artery: { hMin: 350, hMax: 10, sMin: 70, sMax: 100 },
    vein: { hMin: 220, hMax: 250, sMin: 50, sMax: 80 },
    nerve: { hMin: 45, hMax: 60, sMin: 50, sMax: 80 },
    organ: { hMin: 15, hMax: 40, sMin: 30, sMax: 60 },
  };
  
  // TODO: Implement actual color analysis
  // For now, return true as placeholder
  return true;
}

/**
 * Generate quality report for display
 */
export function generateQualityReport(result: QualityValidationResult): string {
  const lines: string[] = [];
  
  lines.push(`Quality Score: ${result.score}/100`);
  lines.push(`Status: ${result.isValid ? "✓ APPROVED" : "✗ REJECTED"}`);
  lines.push("");
  
  if (result.violations.length > 0) {
    lines.push("Violations:");
    result.violations.forEach(v => {
      const icon = v.severity === "critical" ? "🔴" : v.severity === "major" ? "🟠" : "🟡";
      lines.push(`  ${icon} [${v.code}] ${v.message}`);
      lines.push(`     Fix: ${v.remediation}`);
    });
  }
  
  if (result.warnings.length > 0) {
    lines.push("");
    lines.push("Warnings:");
    result.warnings.forEach(w => {
      lines.push(`  ⚠️ ${w}`);
    });
  }
  
  return lines.join("\n");
}
