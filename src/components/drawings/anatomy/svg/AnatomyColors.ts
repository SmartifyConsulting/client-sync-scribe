/**
 * Clinical-Grade Anatomy Color System
 * Medical atlas-accurate colors with proper depth and shading
 */

export const ANATOMY_COLORS = {
  // Bone colors with realistic shading
  bone: {
    cortical: "#FFFEF0",     // Outer compact bone
    cancellous: "#FFF8DC",   // Inner spongy bone
    periosteum: "#DEB887",   // Outer membrane
    marrow: "#FFE4B5",       // Bone marrow
    stroke: "#B8860B",       // Primary outline
    shadow: "#8B7355",       // Depth shadow
    highlight: "#FFFFFF",    // Light reflection
    articular: "#E8E8E0",    // Cartilage-covered surfaces
  },
  
  // Muscle colors with fiber detail
  muscle: {
    deep: "#8B0000",         // Deep muscle tissue
    superficial: "#CD5C5C",  // Superficial muscle
    tendon: "#F5DEB3",       // Tendinous tissue
    aponeurosis: "#FAF0E6",  // Flat tendons
    fascia: "#FFE4E1",       // Connective tissue
    stroke: "#660000",       // Outline
    fiber: "#A52A2A",        // Fiber direction lines
    insertion: "#D2691E",    // Attachment points
  },
  
  // Nerve colors with clinical accuracy
  nerve: {
    central: "#FFD700",      // CNS tissue
    peripheral: "#FAFAD2",   // Peripheral nerves
    ganglion: "#F0E68C",     // Nerve clusters
    plexus: "#EEE8AA",       // Nerve networks
    stroke: "#DAA520",       // Outline
    myelin: "#FFFACD",       // Myelinated areas
  },
  
  // Vascular colors
  artery: {
    main: "#DC143C",         // Large arteries
    branch: "#FF6B6B",       // Smaller branches
    wall: "#B22222",         // Arterial wall
    stroke: "#8B0000",       // Outline
  },
  vein: {
    main: "#4169E1",         // Large veins
    branch: "#6495ED",       // Smaller tributaries
    wall: "#191970",         // Venous wall
    stroke: "#000080",       // Outline
  },
  capillary: {
    fill: "#DDA0DD",         // Capillary beds
    stroke: "#8B008B",       // Outline
  },
  
  // Organ colors
  organ: {
    parenchyma: "#DEB887",   // Functional tissue
    capsule: "#D2B48C",      // Outer covering
    hilum: "#BC8F8F",        // Entry/exit points
    stroke: "#8B4513",       // Outline
  },
  
  // Respiratory
  respiratory: {
    airway: "#F0FFFF",       // Air passages
    mucosa: "#FFB6C1",       // Mucosal lining
    cartilage: "#87CEEB",    // Cartilage rings
    alveoli: "#E6E6FA",      // Alveolar tissue
    stroke: "#708090",       // Outline
  },
  
  // Digestive
  digestive: {
    mucosa: "#FFB6C1",       // Inner lining
    muscularis: "#CD853F",   // Muscular layer
    serosa: "#FAEBD7",       // Outer layer
    liver: "#8B4513",        // Liver tissue
    stroke: "#A0522D",       // Outline
  },
  
  // Lymphatic
  lymphatic: {
    node: "#90EE90",         // Lymph nodes
    vessel: "#98FB98",       // Lymph vessels
    thymus: "#7CFC00",       // Thymus gland
    spleen: "#8B0000",       // Splenic tissue
    stroke: "#228B22",       // Outline
  },
  
  // Endocrine
  endocrine: {
    gland: "#DDA0DD",        // Glandular tissue
    hormone: "#DA70D6",      // Secretory areas
    stroke: "#8B008B",       // Outline
  },
  
  // Integumentary
  skin: {
    epidermis: "#FFDAB9",    // Outer layer
    dermis: "#DEB887",       // Middle layer
    subcutaneous: "#FFE4B5", // Fat layer
    stroke: "#CD853F",       // Outline
  },
  
  // Sensory
  sensory: {
    cornea: "#E0FFFF",       // Eye cornea
    lens: "#F0FFFF",         // Eye lens
    retina: "#FFB6C1",       // Retinal tissue
    cochlea: "#DDA0DD",      // Inner ear
    stroke: "#696969",       // Outline
  },
  
  // Cartilage
  cartilage: {
    hyaline: "#E0E0E0",      // Articular cartilage
    fibro: "#D3D3D3",        // Fibrocartilage
    elastic: "#C0C0C0",      // Elastic cartilage
    stroke: "#808080",       // Outline
  },
  
  // Connective tissue
  connective: {
    ligament: "#F5DEB3",     // Ligaments
    joint: "#DCDCDC",        // Joint capsules
    bursa: "#F0F8FF",        // Bursal sacs
    stroke: "#A0A0A0",       // Outline
  },
  
  // Clinical highlights
  clinical: {
    pathology: "#FF0000",    // Abnormal findings
    inflammation: "#FF6347", // Inflammatory areas
    ischemia: "#9370DB",     // Reduced blood flow
    edema: "#87CEFA",        // Swelling
    normal: "#90EE90",       // Normal findings
    attention: "#FFD700",    // Areas of concern
  },
} as const;

// Shadow and filter definitions for SVG
export const SVG_FILTERS = {
  boneShadow: `
    <filter id="bone-shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0.5" dy="1" stdDeviation="0.8" flood-color="#8B7355" flood-opacity="0.3"/>
    </filter>
  `,
  muscleShadow: `
    <filter id="muscle-shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0.3" dy="0.6" stdDeviation="0.5" flood-color="#660000" flood-opacity="0.4"/>
    </filter>
  `,
  vesselGlow: `
    <filter id="vessel-glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="1" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  `,
  nerveGlow: `
    <filter id="nerve-glow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="0" stdDeviation="2" flood-color="#FFD700" flood-opacity="0.5"/>
    </filter>
  `,
  organDepth: `
    <filter id="organ-depth" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="1" dy="2" stdDeviation="1.5" flood-color="#000000" flood-opacity="0.15"/>
    </filter>
  `,
};

// Gradient definitions for realistic shading
export const SVG_GRADIENTS = {
  boneGradient: `
    <linearGradient id="bone-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#FFFFFF;stop-opacity:0.9"/>
      <stop offset="50%" style="stop-color:#FFFEF0;stop-opacity:1"/>
      <stop offset="100%" style="stop-color:#DEB887;stop-opacity:0.8"/>
    </linearGradient>
  `,
  muscleGradient: `
    <linearGradient id="muscle-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#CD5C5C;stop-opacity:1"/>
      <stop offset="50%" style="stop-color:#A52A2A;stop-opacity:1"/>
      <stop offset="100%" style="stop-color:#8B0000;stop-opacity:1"/>
    </linearGradient>
  `,
  arteryGradient: `
    <radialGradient id="artery-gradient" cx="50%" cy="50%" r="50%">
      <stop offset="0%" style="stop-color:#FF6B6B;stop-opacity:1"/>
      <stop offset="100%" style="stop-color:#DC143C;stop-opacity:1"/>
    </radialGradient>
  `,
  veinGradient: `
    <radialGradient id="vein-gradient" cx="50%" cy="50%" r="50%">
      <stop offset="0%" style="stop-color:#6495ED;stop-opacity:1"/>
      <stop offset="100%" style="stop-color:#4169E1;stop-opacity:1"/>
    </radialGradient>
  `,
  skinGradient: `
    <linearGradient id="skin-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#FFDAB9;stop-opacity:1"/>
      <stop offset="100%" style="stop-color:#DEB887;stop-opacity:1"/>
    </linearGradient>
  `,
};

export type AnatomyColorCategory = keyof typeof ANATOMY_COLORS;
