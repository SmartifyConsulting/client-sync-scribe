/**
 * Depth Filters
 * Advanced SVG filters for medical-grade depth simulation and 3D effects
 */

import React from "react";

export const DepthFilters: React.FC = () => (
  <>
    {/* ==================== BONE DEPTH FILTERS ==================== */}
    
    {/* Deep bone shadow for 3D effect */}
    <filter id="bone-depth-shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="1" dy="2" stdDeviation="1.5" floodColor="#8B7355" floodOpacity="0.35" />
      <feDropShadow dx="0.5" dy="1" stdDeviation="0.5" floodColor="#5C4D3D" floodOpacity="0.2" />
    </filter>

    {/* Bone surface relief */}
    <filter id="bone-relief" x="-10%" y="-10%" width="120%" height="120%">
      <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="3" result="noise" />
      <feDisplacementMap in="SourceGraphic" in2="noise" scale="2" xChannelSelector="R" yChannelSelector="G" />
      <feDropShadow dx="0.3" dy="0.6" stdDeviation="0.4" floodColor="#8B7355" floodOpacity="0.25" />
    </filter>

    {/* Bone landmark emphasis */}
    <filter id="bone-landmark-emphasis" x="-15%" y="-15%" width="130%" height="130%">
      <feDropShadow dx="0.5" dy="1" stdDeviation="0.8" floodColor="#6B5B4D" floodOpacity="0.4" />
      <feDropShadow dx="-0.3" dy="-0.5" stdDeviation="0.3" floodColor="#FFFFFF" floodOpacity="0.3" />
    </filter>

    {/* ==================== MUSCLE DEPTH FILTERS ==================== */}
    
    {/* Superficial muscle layer */}
    <filter id="muscle-superficial-depth" x="-15%" y="-15%" width="130%" height="130%">
      <feDropShadow dx="0.5" dy="1" stdDeviation="1" floodColor="#660000" floodOpacity="0.4" />
    </filter>

    {/* Deep muscle layer - appears recessed */}
    <filter id="muscle-deep-depth" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="#330000" floodOpacity="0.3" />
      <feDropShadow dx="0.3" dy="0.5" stdDeviation="0.5" floodColor="#220000" floodOpacity="0.25" />
    </filter>

    {/* Muscle belly curvature */}
    <filter id="muscle-belly-curve" x="-15%" y="-15%" width="130%" height="130%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="2" result="blur" />
      <feSpecularLighting in="blur" surfaceScale="3" specularConstant="0.5" specularExponent="10" result="spec">
        <fePointLight x="-5000" y="-5000" z="8000" />
      </feSpecularLighting>
      <feComposite in="SourceGraphic" in2="spec" operator="arithmetic" k1="0" k2="1" k3="0.3" k4="0" />
    </filter>

    {/* ==================== ORGAN DEPTH FILTERS ==================== */}
    
    {/* Internal organ depth */}
    <filter id="organ-internal-depth" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="1.5" dy="3" stdDeviation="2" floodColor="#000000" floodOpacity="0.2" />
      <feDropShadow dx="0.5" dy="1" stdDeviation="0.8" floodColor="#000000" floodOpacity="0.15" />
    </filter>

    {/* Hollow organ (e.g., heart chambers, stomach) */}
    <filter id="organ-hollow-depth" x="-15%" y="-15%" width="130%" height="130%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="3" result="blur" />
      <feOffset in="blur" dx="2" dy="3" result="offsetBlur" />
      <feMerge>
        <feMergeNode in="offsetBlur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>

    {/* Parenchymal organ (liver, kidney) */}
    <filter id="organ-parenchymal-depth" x="-15%" y="-15%" width="130%" height="130%">
      <feDropShadow dx="1" dy="2" stdDeviation="1.5" floodColor="#4A3728" floodOpacity="0.3" />
      <feTurbulence type="fractalNoise" baseFrequency="0.08" numOctaves="2" result="noise" />
      <feDisplacementMap in="SourceGraphic" in2="noise" scale="1" xChannelSelector="R" yChannelSelector="G" />
    </filter>

    {/* ==================== VESSEL DEPTH FILTERS ==================== */}
    
    {/* Arterial vessel depth */}
    <filter id="artery-depth" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0.3" dy="0.6" stdDeviation="0.5" floodColor="#8B0000" floodOpacity="0.4" />
    </filter>

    {/* Venous vessel depth */}
    <filter id="vein-depth" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0.3" dy="0.6" stdDeviation="0.5" floodColor="#00008B" floodOpacity="0.35" />
    </filter>

    {/* Major vessel (aorta, vena cava) */}
    <filter id="major-vessel-depth" x="-25%" y="-25%" width="150%" height="150%">
      <feDropShadow dx="1" dy="2" stdDeviation="1.5" floodColor="#000000" floodOpacity="0.25" />
      <feDropShadow dx="0.5" dy="1" stdDeviation="0.5" floodColor="#000000" floodOpacity="0.15" />
    </filter>

    {/* ==================== NERVE DEPTH FILTERS ==================== */}
    
    {/* Peripheral nerve */}
    <filter id="nerve-peripheral-depth" x="-15%" y="-15%" width="130%" height="130%">
      <feDropShadow dx="0.2" dy="0.4" stdDeviation="0.3" floodColor="#B8860B" floodOpacity="0.35" />
    </filter>

    {/* Major nerve trunk */}
    <filter id="nerve-trunk-depth" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0.5" dy="1" stdDeviation="0.8" floodColor="#8B7500" floodOpacity="0.4" />
    </filter>

    {/* Nerve glow effect for highlighting */}
    <filter id="nerve-glow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>

    {/* ==================== GENERAL DEPTH FILTERS ==================== */}
    
    {/* Subtle ambient occlusion */}
    <filter id="ambient-occlusion" x="-10%" y="-10%" width="120%" height="120%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="1.5" result="blur" />
      <feOffset in="blur" dx="0" dy="0" result="offsetBlur" />
      <feFlood floodColor="#000000" floodOpacity="0.15" />
      <feComposite in2="offsetBlur" operator="in" />
      <feMerge>
        <feMergeNode />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>

    {/* Layer separation shadow */}
    <filter id="layer-separation" x="-15%" y="-15%" width="130%" height="130%">
      <feDropShadow dx="2" dy="4" stdDeviation="2" floodColor="#000000" floodOpacity="0.15" />
    </filter>

    {/* Recessed structure (for deep anatomy) */}
    <filter id="recessed-depth" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="-0.5" dy="-1" stdDeviation="0.5" floodColor="#FFFFFF" floodOpacity="0.15" />
      <feDropShadow dx="0.5" dy="1" stdDeviation="1" floodColor="#000000" floodOpacity="0.2" />
    </filter>

    {/* Raised structure (for prominent anatomy) */}
    <filter id="raised-depth" x="-15%" y="-15%" width="130%" height="130%">
      <feDropShadow dx="-0.5" dy="-0.5" stdDeviation="0.3" floodColor="#FFFFFF" floodOpacity="0.25" />
      <feDropShadow dx="1" dy="2" stdDeviation="1" floodColor="#000000" floodOpacity="0.25" />
    </filter>
  </>
);

export default DepthFilters;
