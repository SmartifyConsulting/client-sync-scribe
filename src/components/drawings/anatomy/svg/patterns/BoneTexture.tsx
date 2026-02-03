/**
 * Bone Texture Patterns
 * Medical-grade SVG patterns for realistic bone tissue rendering
 * Includes trabecular (cancellous) and cortical bone patterns
 */

import React from "react";

export const BoneTexturePatterns: React.FC = () => (
  <>
    {/* Trabecular (Cancellous) Bone Pattern - Spongy internal structure */}
    <pattern
      id="trabecular-bone"
      patternUnits="userSpaceOnUse"
      width="12"
      height="12"
    >
      <rect width="12" height="12" fill="#FFF8F0" />
      {/* Irregular trabecular network */}
      <path
        d="M2 2 Q4 1 5 3 T8 2 M1 6 Q3 5 4 7 T7 6 M3 10 Q5 9 6 11 T10 10"
        stroke="#E8DCC8"
        strokeWidth="0.5"
        fill="none"
        opacity="0.7"
      />
      <circle cx="3" cy="4" r="0.8" fill="#DEB887" opacity="0.4" />
      <circle cx="8" cy="8" r="0.6" fill="#D4C4A8" opacity="0.5" />
      <circle cx="6" cy="2" r="0.5" fill="#E8DCC8" opacity="0.3" />
      <circle cx="10" cy="5" r="0.7" fill="#DEB887" opacity="0.4" />
      <circle cx="2" cy="9" r="0.6" fill="#D4C4A8" opacity="0.4" />
    </pattern>

    {/* Cortical (Compact) Bone Pattern - Dense outer layer */}
    <pattern
      id="cortical-bone"
      patternUnits="userSpaceOnUse"
      width="8"
      height="8"
    >
      <rect width="8" height="8" fill="#FFFEF5" />
      {/* Haversian canal-like structures */}
      <circle cx="4" cy="4" r="1.5" fill="none" stroke="#E8DCC8" strokeWidth="0.3" />
      <circle cx="4" cy="4" r="0.5" fill="#DEB887" opacity="0.5" />
      {/* Lamellae rings */}
      <circle cx="4" cy="4" r="2.5" fill="none" stroke="#F0E6D8" strokeWidth="0.2" />
      <circle cx="4" cy="4" r="3.2" fill="none" stroke="#F5EDE0" strokeWidth="0.2" />
    </pattern>

    {/* Periosteum Pattern - Outer bone membrane */}
    <pattern
      id="periosteum"
      patternUnits="userSpaceOnUse"
      width="4"
      height="4"
    >
      <rect width="4" height="4" fill="#F5E6D3" />
      <line x1="0" y1="0" x2="4" y2="4" stroke="#E8D4BC" strokeWidth="0.3" opacity="0.6" />
      <line x1="0" y1="2" x2="2" y2="4" stroke="#E8D4BC" strokeWidth="0.2" opacity="0.4" />
    </pattern>

    {/* Bone Marrow Pattern */}
    <pattern
      id="bone-marrow"
      patternUnits="userSpaceOnUse"
      width="6"
      height="6"
    >
      <rect width="6" height="6" fill="#FFE4E1" />
      <circle cx="2" cy="2" r="0.8" fill="#DC143C" opacity="0.3" />
      <circle cx="5" cy="4" r="0.6" fill="#CD5C5C" opacity="0.25" />
      <circle cx="3" cy="5" r="0.5" fill="#BC8F8F" opacity="0.3" />
      <circle cx="1" cy="4" r="0.4" fill="#DC143C" opacity="0.2" />
    </pattern>

    {/* Articular Cartilage Pattern */}
    <pattern
      id="articular-cartilage"
      patternUnits="userSpaceOnUse"
      width="6"
      height="6"
    >
      <rect width="6" height="6" fill="#F0F8FF" />
      <ellipse cx="3" cy="3" rx="2" ry="1.5" fill="none" stroke="#E0E8F0" strokeWidth="0.3" />
      <circle cx="2" cy="2" r="0.4" fill="#D8E8F0" opacity="0.5" />
      <circle cx="4" cy="4" r="0.3" fill="#E0EEF5" opacity="0.4" />
    </pattern>

    {/* Bone Surface Texture - For detailed landmarks */}
    <pattern
      id="bone-surface"
      patternUnits="userSpaceOnUse"
      width="10"
      height="10"
    >
      <rect width="10" height="10" fill="#FFFEF8" />
      {/* Fine surface striations */}
      <path
        d="M0 2 Q2 1.5 4 2.5 T8 2 M0 5 Q3 4 5 5.5 T10 5 M0 8 Q2 7.5 4 8.5 T8 8"
        stroke="#F0E6D8"
        strokeWidth="0.4"
        fill="none"
        opacity="0.6"
      />
      {/* Nutrient foramina hints */}
      <circle cx="7" cy="3" r="0.3" fill="#DEB887" opacity="0.4" />
      <circle cx="3" cy="7" r="0.25" fill="#D4C4A8" opacity="0.3" />
    </pattern>

    {/* Bone Landmark Pattern - For processes, tuberosities */}
    <pattern
      id="bone-landmark"
      patternUnits="userSpaceOnUse"
      width="8"
      height="8"
    >
      <rect width="8" height="8" fill="#FFF8E8" />
      <path
        d="M1 4 Q2 2 4 3 Q6 4 7 2 M1 7 Q3 5 5 6 Q7 7 8 5"
        stroke="#E8D4B8"
        strokeWidth="0.5"
        fill="none"
        opacity="0.5"
      />
      {/* Roughened surface for muscle attachment */}
      <circle cx="2" cy="3" r="0.4" fill="#DEB887" opacity="0.3" />
      <circle cx="5" cy="5" r="0.35" fill="#E8D4BC" opacity="0.35" />
      <circle cx="7" cy="2" r="0.3" fill="#D4C4A8" opacity="0.3" />
    </pattern>
  </>
);

export default BoneTexturePatterns;
