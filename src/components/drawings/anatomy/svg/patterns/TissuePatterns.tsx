/**
 * Tissue Patterns
 * Medical-grade SVG patterns for nerve, vessel, organ, and other tissue types
 */

import React from "react";

export const TissuePatterns: React.FC = () => (
  <>
    {/* ==================== NERVE PATTERNS ==================== */}
    
    {/* Nerve Fascicle Bundle */}
    <pattern
      id="nerve-fascicle"
      patternUnits="userSpaceOnUse"
      width="6"
      height="12"
    >
      <rect width="6" height="12" fill="#FFFACD" />
      {/* Individual nerve fibers */}
      <circle cx="1.5" cy="2" r="0.8" fill="#FFD700" opacity="0.5" />
      <circle cx="4" cy="2.5" r="0.7" fill="#FAFAD2" opacity="0.6" />
      <circle cx="2.5" cy="5" r="0.9" fill="#FFD700" opacity="0.45" />
      <circle cx="4.5" cy="6" r="0.6" fill="#FAFAD2" opacity="0.5" />
      <circle cx="1" cy="8" r="0.7" fill="#FFD700" opacity="0.5" />
      <circle cx="3.5" cy="9" r="0.8" fill="#FAFAD2" opacity="0.55" />
      <circle cx="5" cy="10.5" r="0.65" fill="#FFD700" opacity="0.45" />
      {/* Epineurium outline hints */}
      <path d="M0 0 Q3 1 6 0 M0 12 Q3 11 6 12" stroke="#DAA520" strokeWidth="0.3" fill="none" opacity="0.4" />
    </pattern>

    {/* Peripheral Nerve */}
    <pattern
      id="peripheral-nerve"
      patternUnits="userSpaceOnUse"
      width="4"
      height="8"
    >
      <rect width="4" height="8" fill="#FFF8DC" />
      <line x1="0.5" y1="0" x2="0.5" y2="8" stroke="#FFD700" strokeWidth="0.5" opacity="0.5" />
      <line x1="2" y1="0" x2="2" y2="8" stroke="#FAFAD2" strokeWidth="0.4" opacity="0.6" />
      <line x1="3.5" y1="0" x2="3.5" y2="8" stroke="#FFD700" strokeWidth="0.5" opacity="0.5" />
    </pattern>

    {/* ==================== VESSEL PATTERNS ==================== */}
    
    {/* Arterial Wall */}
    <pattern
      id="arterial-wall"
      patternUnits="userSpaceOnUse"
      width="4"
      height="6"
    >
      <rect width="4" height="6" fill="#DC143C" />
      {/* Smooth muscle layer */}
      <ellipse cx="2" cy="3" rx="1.5" ry="0.8" fill="none" stroke="#B01030" strokeWidth="0.3" opacity="0.5" />
      <line x1="0" y1="2" x2="4" y2="2" stroke="#A01020" strokeWidth="0.2" opacity="0.4" />
      <line x1="0" y1="4" x2="4" y2="4" stroke="#A01020" strokeWidth="0.2" opacity="0.4" />
    </pattern>

    {/* Venous Wall */}
    <pattern
      id="venous-wall"
      patternUnits="userSpaceOnUse"
      width="4"
      height="5"
    >
      <rect width="4" height="5" fill="#4169E1" />
      <line x1="0" y1="1.5" x2="4" y2="1.5" stroke="#2850A0" strokeWidth="0.2" opacity="0.4" />
      <line x1="0" y1="3.5" x2="4" y2="3.5" stroke="#2850A0" strokeWidth="0.2" opacity="0.4" />
    </pattern>

    {/* Capillary Network */}
    <pattern
      id="capillary-network"
      patternUnits="userSpaceOnUse"
      width="10"
      height="10"
    >
      <rect width="10" height="10" fill="transparent" />
      <path
        d="M0 5 Q2 3 4 5 T8 5 M2 0 Q4 2 2 4 M8 6 Q6 8 8 10 M5 0 Q6 2 5 4"
        stroke="#DC143C"
        strokeWidth="0.4"
        fill="none"
        opacity="0.4"
      />
    </pattern>

    {/* ==================== ORGAN PATTERNS ==================== */}
    
    {/* Liver Lobule Pattern */}
    <pattern
      id="liver-lobule"
      patternUnits="userSpaceOnUse"
      width="12"
      height="14"
    >
      <rect width="12" height="14" fill="#8B4513" />
      {/* Hexagonal lobule structure */}
      <polygon
        points="6,1 10,3.5 10,8.5 6,11 2,8.5 2,3.5"
        fill="none"
        stroke="#6B3010"
        strokeWidth="0.5"
        opacity="0.5"
      />
      {/* Central vein */}
      <circle cx="6" cy="6" r="1" fill="#4169E1" opacity="0.4" />
      {/* Portal triads at corners */}
      <circle cx="2" cy="3.5" r="0.5" fill="#DC143C" opacity="0.3" />
      <circle cx="10" cy="3.5" r="0.5" fill="#DC143C" opacity="0.3" />
      <circle cx="6" cy="11" r="0.5" fill="#DC143C" opacity="0.3" />
    </pattern>

    {/* Lung Alveoli Pattern */}
    <pattern
      id="lung-alveoli"
      patternUnits="userSpaceOnUse"
      width="10"
      height="10"
    >
      <rect width="10" height="10" fill="#FFB6C1" />
      {/* Alveolar sacs */}
      <circle cx="3" cy="3" r="2" fill="none" stroke="#E8A0A8" strokeWidth="0.4" />
      <circle cx="7" cy="3" r="1.8" fill="none" stroke="#E8A0A8" strokeWidth="0.4" />
      <circle cx="5" cy="7" r="2.2" fill="none" stroke="#E8A0A8" strokeWidth="0.4" />
      {/* Capillary hints */}
      <path d="M1 5 Q2 4 3 5" stroke="#DC143C" strokeWidth="0.2" fill="none" opacity="0.3" />
      <path d="M7 8 Q8 7 9 8" stroke="#DC143C" strokeWidth="0.2" fill="none" opacity="0.3" />
    </pattern>

    {/* Kidney Nephron Pattern */}
    <pattern
      id="kidney-nephron"
      patternUnits="userSpaceOnUse"
      width="8"
      height="12"
    >
      <rect width="8" height="12" fill="#CD853F" />
      {/* Glomerulus */}
      <circle cx="4" cy="3" r="1.5" fill="#DC143C" opacity="0.4" />
      {/* Tubule */}
      <path
        d="M4 4.5 Q2 6 2 8 Q2 10 4 11 Q6 10 6 8 Q6 6 4 4.5"
        stroke="#A0522D"
        strokeWidth="0.5"
        fill="none"
        opacity="0.5"
      />
    </pattern>

    {/* Intestinal Villi Pattern */}
    <pattern
      id="intestinal-villi"
      patternUnits="userSpaceOnUse"
      width="8"
      height="10"
    >
      <rect width="8" height="10" fill="#DEB887" />
      {/* Villi projections */}
      <path d="M2 10 Q2 5 2 2" stroke="#BC8F8F" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
      <path d="M5 10 Q5 4 5 1" stroke="#BC8F8F" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
      {/* Microvilli hint at tips */}
      <line x1="1" y1="2" x2="3" y2="2" stroke="#A08060" strokeWidth="0.3" opacity="0.4" />
      <line x1="4" y1="1" x2="6" y2="1" stroke="#A08060" strokeWidth="0.3" opacity="0.4" />
    </pattern>

    {/* ==================== CONNECTIVE TISSUE ==================== */}
    
    {/* Adipose (Fat) Tissue */}
    <pattern
      id="adipose-tissue"
      patternUnits="userSpaceOnUse"
      width="10"
      height="10"
    >
      <rect width="10" height="10" fill="#FFDAB9" />
      <circle cx="3" cy="3" r="2.5" fill="#FFE4B5" stroke="#DEB887" strokeWidth="0.3" />
      <circle cx="8" cy="4" r="2" fill="#FFE4B5" stroke="#DEB887" strokeWidth="0.3" />
      <circle cx="5" cy="8" r="2.2" fill="#FFE4B5" stroke="#DEB887" strokeWidth="0.3" />
    </pattern>

    {/* Lymph Node Pattern */}
    <pattern
      id="lymph-node"
      patternUnits="userSpaceOnUse"
      width="8"
      height="8"
    >
      <rect width="8" height="8" fill="#98FB98" />
      {/* Follicles */}
      <circle cx="4" cy="4" r="2.5" fill="#90EE90" opacity="0.7" />
      <circle cx="4" cy="4" r="1.5" fill="#7CCD7C" opacity="0.5" />
      {/* Medullary cords */}
      <path d="M0 7 Q2 6 4 7 T8 7" stroke="#6B8E6B" strokeWidth="0.5" fill="none" opacity="0.4" />
    </pattern>

    {/* Skin/Dermis Pattern */}
    <pattern
      id="dermis"
      patternUnits="userSpaceOnUse"
      width="8"
      height="8"
    >
      <rect width="8" height="8" fill="#FFDAB9" />
      {/* Collagen bundles */}
      <path d="M0 2 Q2 1 4 2 T8 2" stroke="#DEB887" strokeWidth="0.5" fill="none" opacity="0.4" />
      <path d="M0 5 Q2 4 4 5 T8 5" stroke="#D4A574" strokeWidth="0.4" fill="none" opacity="0.35" />
      {/* Elastic fibers hint */}
      <path d="M1 0 Q2 4 1 8" stroke="#E8D4BC" strokeWidth="0.3" fill="none" opacity="0.3" />
      <path d="M6 0 Q5 4 6 8" stroke="#E8D4BC" strokeWidth="0.3" fill="none" opacity="0.3" />
    </pattern>

    {/* Epidermis Pattern */}
    <pattern
      id="epidermis"
      patternUnits="userSpaceOnUse"
      width="6"
      height="4"
    >
      <rect width="6" height="4" fill="#F5DEB3" />
      {/* Stratified layers */}
      <line x1="0" y1="1" x2="6" y2="1" stroke="#DEB887" strokeWidth="0.3" opacity="0.5" />
      <line x1="0" y1="2.5" x2="6" y2="2.5" stroke="#D4A574" strokeWidth="0.25" opacity="0.4" />
    </pattern>
  </>
);

export default TissuePatterns;
