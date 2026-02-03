/**
 * Shading Filters
 * Advanced SVG filters for realistic tissue shading and lighting effects
 */

import React from "react";

export const ShadingFilters: React.FC = () => (
  <>
    {/* ==================== LIGHTING FILTERS ==================== */}
    
    {/* Diffuse lighting - soft overall illumination */}
    <filter id="diffuse-light" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="2" result="blur" />
      <feDiffuseLighting in="blur" surfaceScale="3" diffuseConstant="0.8" result="light">
        <feDistantLight azimuth="315" elevation="45" />
      </feDiffuseLighting>
      <feComposite in="SourceGraphic" in2="light" operator="arithmetic" k1="0.8" k2="0.5" k3="0.2" k4="0" />
    </filter>

    {/* Specular highlight - for wet/glossy surfaces */}
    <filter id="specular-highlight" x="-15%" y="-15%" width="130%" height="130%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="1" result="blur" />
      <feSpecularLighting in="blur" surfaceScale="2" specularConstant="1" specularExponent="20" result="spec">
        <fePointLight x="-3000" y="-3000" z="6000" />
      </feSpecularLighting>
      <feComposite in="spec" in2="SourceAlpha" operator="in" result="specOut" />
      <feMerge>
        <feMergeNode in="SourceGraphic" />
        <feMergeNode in="specOut" />
      </feMerge>
    </filter>

    {/* Subsurface scattering - for skin/soft tissue */}
    <filter id="subsurface-scatter" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
      <feColorMatrix in="blur" type="matrix" 
        values="1 0 0 0 0.05
                0 0.8 0 0 0.02
                0 0 0.7 0 0
                0 0 0 0.5 0" result="tinted" />
      <feMerge>
        <feMergeNode in="tinted" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>

    {/* ==================== TISSUE-SPECIFIC SHADING ==================== */}
    
    {/* Bone shading - ivory/cream tones */}
    <filter id="bone-shading" x="-15%" y="-15%" width="130%" height="130%">
      <feColorMatrix type="matrix"
        values="1.05 0 0 0 0.02
                0 1.02 0 0 0.01
                0 0 0.95 0 -0.02
                0 0 0 1 0" />
      <feGaussianBlur in="SourceAlpha" stdDeviation="1.5" result="blur" />
      <feDiffuseLighting in="blur" surfaceScale="2" diffuseConstant="0.6" result="light">
        <feDistantLight azimuth="300" elevation="50" />
      </feDiffuseLighting>
      <feComposite in="SourceGraphic" in2="light" operator="arithmetic" k1="0.9" k2="0.4" k3="0.15" k4="0" />
    </filter>

    {/* Muscle shading - red tones with depth */}
    <filter id="muscle-shading" x="-15%" y="-15%" width="130%" height="130%">
      <feColorMatrix type="matrix"
        values="1.1 0 0 0 0
                0 0.85 0 0 0
                0 0 0.85 0 0
                0 0 0 1 0" />
      <feGaussianBlur in="SourceAlpha" stdDeviation="1" result="blur" />
      <feDiffuseLighting in="blur" surfaceScale="2.5" diffuseConstant="0.7" result="light">
        <feDistantLight azimuth="315" elevation="40" />
      </feDiffuseLighting>
      <feComposite in="SourceGraphic" in2="light" operator="arithmetic" k1="0.85" k2="0.45" k3="0.2" k4="0" />
    </filter>

    {/* Organ shading - variable based on organ type */}
    <filter id="organ-shading" x="-15%" y="-15%" width="130%" height="130%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="1.5" result="blur" />
      <feDiffuseLighting in="blur" surfaceScale="2" diffuseConstant="0.65" result="light">
        <feDistantLight azimuth="330" elevation="45" />
      </feDiffuseLighting>
      <feComposite in="SourceGraphic" in2="light" operator="arithmetic" k1="0.9" k2="0.4" k3="0.15" k4="0" />
    </filter>

    {/* Nerve shading - yellow tones */}
    <filter id="nerve-shading" x="-10%" y="-10%" width="120%" height="120%">
      <feColorMatrix type="matrix"
        values="1 0 0 0 0.05
                0 1.05 0 0 0.02
                0 0 0.8 0 -0.05
                0 0 0 1 0" />
    </filter>

    {/* Vessel shading - for arteries */}
    <filter id="artery-shading" x="-15%" y="-15%" width="130%" height="130%">
      <feColorMatrix type="matrix"
        values="1.15 0 0 0 0
                0 0.7 0 0 0
                0 0 0.7 0 0
                0 0 0 1 0" />
      <feGaussianBlur in="SourceAlpha" stdDeviation="0.5" result="blur" />
      <feSpecularLighting in="blur" surfaceScale="1.5" specularConstant="0.8" specularExponent="15" result="spec">
        <feDistantLight azimuth="315" elevation="60" />
      </feSpecularLighting>
      <feComposite in="spec" in2="SourceAlpha" operator="in" result="specOut" />
      <feMerge>
        <feMergeNode in="SourceGraphic" />
        <feMergeNode in="specOut" />
      </feMerge>
    </filter>

    {/* Vessel shading - for veins */}
    <filter id="vein-shading" x="-15%" y="-15%" width="130%" height="130%">
      <feColorMatrix type="matrix"
        values="0.8 0 0 0 0
                0 0.8 0 0 0
                0 0 1.15 0 0.05
                0 0 0 1 0" />
    </filter>

    {/* ==================== CLINICAL HIGHLIGHTING ==================== */}
    
    {/* Pathology highlight - red/inflamed */}
    <filter id="pathology-highlight" x="-25%" y="-25%" width="150%" height="150%">
      <feColorMatrix type="matrix"
        values="1.3 0.2 0.1 0 0.1
                0 0.7 0 0 0
                0 0 0.7 0 0
                0 0 0 1 0" />
      <feGaussianBlur stdDeviation="1.5" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>

    {/* Inflammation highlight */}
    <filter id="inflammation-highlight" x="-30%" y="-30%" width="160%" height="160%">
      <feFlood floodColor="#FF4444" floodOpacity="0.3" result="flood" />
      <feComposite in="flood" in2="SourceAlpha" operator="in" result="tint" />
      <feGaussianBlur in="SourceAlpha" stdDeviation="3" result="glow" />
      <feFlood floodColor="#FF0000" floodOpacity="0.4" />
      <feComposite in2="glow" operator="in" result="redGlow" />
      <feMerge>
        <feMergeNode in="redGlow" />
        <feMergeNode in="SourceGraphic" />
        <feMergeNode in="tint" />
      </feMerge>
    </filter>

    {/* Fracture highlight */}
    <filter id="fracture-highlight" x="-20%" y="-20%" width="140%" height="140%">
      <feColorMatrix type="matrix"
        values="1 0 0 0 0
                0 1 0 0 0
                0 0 1 0 0
                0 0 0 1 0" />
      <feGaussianBlur in="SourceAlpha" stdDeviation="2" result="blur" />
      <feFlood floodColor="#FF6600" floodOpacity="0.5" />
      <feComposite in2="blur" operator="in" result="glow" />
      <feMerge>
        <feMergeNode in="glow" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>

    {/* Surgical focus highlight */}
    <filter id="surgical-focus" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="4" result="blur" />
      <feFlood floodColor="#00FF88" floodOpacity="0.4" />
      <feComposite in2="blur" operator="in" result="glow" />
      <feMerge>
        <feMergeNode in="glow" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>

    {/* Selection highlight */}
    <filter id="selection-highlight" x="-25%" y="-25%" width="150%" height="150%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="2" result="blur" />
      <feFlood floodColor="#3B82F6" floodOpacity="0.5" />
      <feComposite in2="blur" operator="in" result="glow" />
      <feMerge>
        <feMergeNode in="glow" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>

    {/* ==================== TEXTURE ENHANCEMENT ==================== */}
    
    {/* Texture noise for organic surfaces */}
    <filter id="organic-texture" x="0%" y="0%" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="3" result="noise" />
      <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.5" xChannelSelector="R" yChannelSelector="G" />
    </filter>

    {/* Fine grain texture */}
    <filter id="fine-grain" x="0%" y="0%" width="100%" height="100%">
      <feTurbulence type="turbulence" baseFrequency="0.8" numOctaves="2" result="noise" />
      <feColorMatrix in="noise" type="matrix"
        values="0 0 0 0 0
                0 0 0 0 0
                0 0 0 0 0
                0 0 0 0.05 0" result="alphaOnly" />
      <feMerge>
        <feMergeNode in="SourceGraphic" />
        <feMergeNode in="alphaOnly" />
      </feMerge>
    </filter>
  </>
);

export default ShadingFilters;
