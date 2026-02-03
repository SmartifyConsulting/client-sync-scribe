/**
 * Muscle Texture Patterns
 * Medical-grade SVG patterns for realistic muscle tissue rendering
 * Includes fiber direction, fascicle structure, and tendon attachments
 */

import React from "react";

export const MuscleTexturePatterns: React.FC = () => (
  <>
    {/* Parallel Muscle Fibers - For fusiform muscles */}
    <pattern
      id="muscle-fibers-parallel"
      patternUnits="userSpaceOnUse"
      width="4"
      height="20"
      patternTransform="rotate(0)"
    >
      <rect width="4" height="20" fill="#B85450" />
      <line x1="0.5" y1="0" x2="0.5" y2="20" stroke="#A04040" strokeWidth="0.6" opacity="0.5" />
      <line x1="2" y1="0" x2="2" y2="20" stroke="#C06060" strokeWidth="0.4" opacity="0.4" />
      <line x1="3.5" y1="0" x2="3.5" y2="20" stroke="#8B3030" strokeWidth="0.5" opacity="0.45" />
      {/* Striation bands */}
      <line x1="0" y1="5" x2="4" y2="5" stroke="#902020" strokeWidth="0.2" opacity="0.3" />
      <line x1="0" y1="10" x2="4" y2="10" stroke="#902020" strokeWidth="0.2" opacity="0.3" />
      <line x1="0" y1="15" x2="4" y2="15" stroke="#902020" strokeWidth="0.2" opacity="0.3" />
    </pattern>

    {/* Pennate Muscle Fibers - For penniform muscles */}
    <pattern
      id="muscle-fibers-pennate"
      patternUnits="userSpaceOnUse"
      width="12"
      height="16"
    >
      <rect width="12" height="16" fill="#B85450" />
      {/* Central tendon line */}
      <line x1="6" y1="0" x2="6" y2="16" stroke="#F5DEB3" strokeWidth="1" opacity="0.7" />
      {/* Angled fibers - left side */}
      <line x1="0" y1="2" x2="5.5" y2="4" stroke="#A04040" strokeWidth="0.5" opacity="0.5" />
      <line x1="0" y1="6" x2="5.5" y2="8" stroke="#8B3030" strokeWidth="0.5" opacity="0.5" />
      <line x1="0" y1="10" x2="5.5" y2="12" stroke="#A04040" strokeWidth="0.5" opacity="0.5" />
      <line x1="0" y1="14" x2="5.5" y2="16" stroke="#8B3030" strokeWidth="0.5" opacity="0.5" />
      {/* Angled fibers - right side */}
      <line x1="12" y1="2" x2="6.5" y2="4" stroke="#A04040" strokeWidth="0.5" opacity="0.5" />
      <line x1="12" y1="6" x2="6.5" y2="8" stroke="#8B3030" strokeWidth="0.5" opacity="0.5" />
      <line x1="12" y1="10" x2="6.5" y2="12" stroke="#A04040" strokeWidth="0.5" opacity="0.5" />
      <line x1="12" y1="14" x2="6.5" y2="16" stroke="#8B3030" strokeWidth="0.5" opacity="0.5" />
    </pattern>

    {/* Superficial Muscle Layer */}
    <pattern
      id="muscle-superficial"
      patternUnits="userSpaceOnUse"
      width="6"
      height="10"
    >
      <rect width="6" height="10" fill="#CD5C5C" />
      <path
        d="M0 2 Q1 1 2 2 T4 2 T6 2 M0 5 Q1.5 4 3 5 T6 5 M0 8 Q1 7 2 8 T4 8 T6 8"
        stroke="#A52A2A"
        strokeWidth="0.4"
        fill="none"
        opacity="0.4"
      />
    </pattern>

    {/* Deep Muscle Layer */}
    <pattern
      id="muscle-deep"
      patternUnits="userSpaceOnUse"
      width="5"
      height="8"
    >
      <rect width="5" height="8" fill="#8B4040" />
      <line x1="0" y1="2" x2="5" y2="2" stroke="#702828" strokeWidth="0.3" opacity="0.4" />
      <line x1="0" y1="5" x2="5" y2="5" stroke="#702828" strokeWidth="0.3" opacity="0.4" />
      <line x1="1" y1="0" x2="1" y2="8" stroke="#6B3030" strokeWidth="0.25" opacity="0.35" />
      <line x1="3" y1="0" x2="3" y2="8" stroke="#6B3030" strokeWidth="0.25" opacity="0.35" />
    </pattern>

    {/* Tendon Pattern */}
    <pattern
      id="tendon"
      patternUnits="userSpaceOnUse"
      width="4"
      height="12"
    >
      <rect width="4" height="12" fill="#F5DEB3" />
      {/* Collagen fiber bundles */}
      <path
        d="M0 0 Q1 2 0.5 4 Q0 6 0.5 8 Q1 10 0 12"
        stroke="#DEB887"
        strokeWidth="0.6"
        fill="none"
        opacity="0.6"
      />
      <path
        d="M2 0 Q2.5 2 2 4 Q1.5 6 2 8 Q2.5 10 2 12"
        stroke="#D4A574"
        strokeWidth="0.5"
        fill="none"
        opacity="0.5"
      />
      <path
        d="M3.5 0 Q4 2 3.5 4 Q3 6 3.5 8 Q4 10 3.5 12"
        stroke="#DEB887"
        strokeWidth="0.6"
        fill="none"
        opacity="0.55"
      />
    </pattern>

    {/* Aponeurosis Pattern - Flat tendon sheet */}
    <pattern
      id="aponeurosis"
      patternUnits="userSpaceOnUse"
      width="8"
      height="8"
    >
      <rect width="8" height="8" fill="#F0E6DC" />
      <line x1="0" y1="0" x2="8" y2="8" stroke="#DEB887" strokeWidth="0.3" opacity="0.4" />
      <line x1="0" y1="4" x2="4" y2="8" stroke="#D4A574" strokeWidth="0.25" opacity="0.35" />
      <line x1="4" y1="0" x2="8" y2="4" stroke="#D4A574" strokeWidth="0.25" opacity="0.35" />
      <line x1="8" y1="0" x2="0" y2="8" stroke="#E8D4BC" strokeWidth="0.3" opacity="0.4" />
    </pattern>

    {/* Fascia Pattern */}
    <pattern
      id="fascia"
      patternUnits="userSpaceOnUse"
      width="6"
      height="6"
    >
      <rect width="6" height="6" fill="#FFF8F0" opacity="0.8" />
      <path
        d="M0 3 Q1.5 2 3 3 T6 3"
        stroke="#E8DCC8"
        strokeWidth="0.3"
        fill="none"
        opacity="0.5"
      />
      <path
        d="M0 1 Q1.5 0 3 1 T6 1 M0 5 Q1.5 4 3 5 T6 5"
        stroke="#F0E6D8"
        strokeWidth="0.2"
        fill="none"
        opacity="0.4"
      />
    </pattern>

    {/* Muscle Belly Gradient Pattern */}
    <pattern
      id="muscle-belly"
      patternUnits="userSpaceOnUse"
      width="8"
      height="16"
    >
      <rect width="8" height="16" fill="#BC5555" />
      {/* Fiber bundles */}
      <path d="M1 0 V16" stroke="#A04545" strokeWidth="0.8" opacity="0.4" />
      <path d="M4 0 V16" stroke="#8B3535" strokeWidth="0.6" opacity="0.35" />
      <path d="M7 0 V16" stroke="#A04545" strokeWidth="0.8" opacity="0.4" />
      {/* Cross striations */}
      <line x1="0" y1="4" x2="8" y2="4" stroke="#953535" strokeWidth="0.2" opacity="0.25" />
      <line x1="0" y1="8" x2="8" y2="8" stroke="#953535" strokeWidth="0.2" opacity="0.25" />
      <line x1="0" y1="12" x2="8" y2="12" stroke="#953535" strokeWidth="0.2" opacity="0.25" />
    </pattern>
  </>
);

export default MuscleTexturePatterns;
