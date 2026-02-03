/**
 * Enhanced Anatomy Renderer
 * Medical-grade SVG base renderer with advanced techniques
 * Integrates textures, filters, and depth effects
 */

import React from "react";
import { BoneTexturePatterns } from "../patterns/BoneTexture";
import { MuscleTexturePatterns } from "../patterns/MuscleTexture";
import { TissuePatterns } from "../patterns/TissuePatterns";
import { DepthFilters } from "../filters/DepthFilters";
import { ShadingFilters } from "../filters/ShadingFilters";
import { ANATOMY_COLORS } from "../AnatomyColors";

export interface EnhancedAnatomyRendererProps {
  children: React.ReactNode;
  viewBox?: string;
  width?: string | number;
  height?: string | number;
  className?: string;
  backgroundColor?: string;
}

/**
 * Enhanced SVG Definitions
 * Includes all textures, filters, gradients for medical-grade rendering
 */
export const EnhancedSVGDefs: React.FC = () => (
  <defs>
    {/* Texture Patterns */}
    <BoneTexturePatterns />
    <MuscleTexturePatterns />
    <TissuePatterns />
    
    {/* Filters */}
    <DepthFilters />
    <ShadingFilters />
    
    {/* ==================== ENHANCED GRADIENTS ==================== */}
    
    {/* Multi-stop bone gradient for realism */}
    <linearGradient id="bone-gradient-enhanced" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95"/>
      <stop offset="25%" stopColor="#FFFEF8" stopOpacity="1"/>
      <stop offset="50%" stopColor="#FFF8F0" stopOpacity="1"/>
      <stop offset="75%" stopColor="#F5E6D8" stopOpacity="0.95"/>
      <stop offset="100%" stopColor="#DEB887" stopOpacity="0.85"/>
    </linearGradient>
    
    {/* Radial bone highlight */}
    <radialGradient id="bone-highlight" cx="30%" cy="30%" r="70%">
      <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.8"/>
      <stop offset="50%" stopColor="#FFFEF8" stopOpacity="0.4"/>
      <stop offset="100%" stopColor="#F5E6D8" stopOpacity="0"/>
    </radialGradient>
    
    {/* Multi-stop muscle gradient */}
    <linearGradient id="muscle-gradient-enhanced" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stopColor="#E06060" stopOpacity="0.9"/>
      <stop offset="20%" stopColor="#CD5C5C"/>
      <stop offset="50%" stopColor="#A52A2A"/>
      <stop offset="80%" stopColor="#8B0000"/>
      <stop offset="100%" stopColor="#660000" stopOpacity="0.9"/>
    </linearGradient>
    
    {/* Muscle belly highlight */}
    <radialGradient id="muscle-belly-highlight" cx="40%" cy="35%" r="60%">
      <stop offset="0%" stopColor="#E07070" stopOpacity="0.6"/>
      <stop offset="60%" stopColor="#CD5C5C" stopOpacity="0.3"/>
      <stop offset="100%" stopColor="#A52A2A" stopOpacity="0"/>
    </radialGradient>
    
    {/* Artery gradient with vessel wall */}
    <radialGradient id="artery-gradient-enhanced" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stopColor="#FF4040"/>
      <stop offset="70%" stopColor="#DC143C"/>
      <stop offset="85%" stopColor="#B01030"/>
      <stop offset="100%" stopColor="#8B0000"/>
    </radialGradient>
    
    {/* Vein gradient with vessel wall */}
    <radialGradient id="vein-gradient-enhanced" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stopColor="#6495ED"/>
      <stop offset="70%" stopColor="#4169E1"/>
      <stop offset="85%" stopColor="#3050B0"/>
      <stop offset="100%" stopColor="#00008B"/>
    </radialGradient>
    
    {/* Nerve gradient */}
    <linearGradient id="nerve-gradient-enhanced" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stopColor="#FFFACD"/>
      <stop offset="30%" stopColor="#FFD700"/>
      <stop offset="50%" stopColor="#FFD700"/>
      <stop offset="70%" stopColor="#FFD700"/>
      <stop offset="100%" stopColor="#FFFACD"/>
    </linearGradient>
    
    {/* Organ gradients */}
    <linearGradient id="liver-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="#A0522D"/>
      <stop offset="50%" stopColor="#8B4513"/>
      <stop offset="100%" stopColor="#6B3510"/>
    </linearGradient>
    
    <linearGradient id="kidney-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="#CD853F"/>
      <stop offset="50%" stopColor="#B8733D"/>
      <stop offset="100%" stopColor="#8B5A2B"/>
    </linearGradient>
    
    <linearGradient id="lung-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stopColor="#FFB6C1"/>
      <stop offset="50%" stopColor="#F08080"/>
      <stop offset="100%" stopColor="#E07070"/>
    </linearGradient>
    
    <linearGradient id="heart-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="#DC143C"/>
      <stop offset="40%" stopColor="#B01030"/>
      <stop offset="100%" stopColor="#8B0000"/>
    </linearGradient>
    
    <linearGradient id="brain-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stopColor="#F5DEB3"/>
      <stop offset="50%" stopColor="#E8D0A0"/>
      <stop offset="100%" stopColor="#D4B896"/>
    </linearGradient>
    
    <linearGradient id="stomach-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="#DEB887"/>
      <stop offset="50%" stopColor="#D4A574"/>
      <stop offset="100%" stopColor="#BC8F8F"/>
    </linearGradient>
    
    <linearGradient id="intestine-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stopColor="#F5DEB3"/>
      <stop offset="50%" stopColor="#DEB887"/>
      <stop offset="100%" stopColor="#BC8F8F"/>
    </linearGradient>
    
    {/* Cartilage gradient */}
    <linearGradient id="cartilage-gradient-enhanced" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stopColor="#F8F8FF"/>
      <stop offset="50%" stopColor="#E8E8F0"/>
      <stop offset="100%" stopColor="#C0C0D0"/>
    </linearGradient>
    
    {/* Skin/dermis gradient */}
    <linearGradient id="skin-gradient-enhanced" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stopColor="#FFDAB9"/>
      <stop offset="30%" stopColor="#F5D0A9"/>
      <stop offset="70%" stopColor="#E8C099"/>
      <stop offset="100%" stopColor="#DEB887"/>
    </linearGradient>
    
    {/* ==================== CLINICAL HIGHLIGHTS ==================== */}
    
    {/* Pathology overlay */}
    <linearGradient id="pathology-overlay">
      <stop offset="0%" stopColor="#FF0000" stopOpacity="0.4"/>
      <stop offset="100%" stopColor="#FF4444" stopOpacity="0.3"/>
    </linearGradient>
    
    {/* Inflammation overlay */}
    <radialGradient id="inflammation-overlay" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stopColor="#FF0000" stopOpacity="0.5"/>
      <stop offset="100%" stopColor="#FF0000" stopOpacity="0"/>
    </radialGradient>
    
    {/* Selection glow */}
    <radialGradient id="selection-glow" cx="50%" cy="50%" r="60%">
      <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.5"/>
      <stop offset="100%" stopColor="#3B82F6" stopOpacity="0"/>
    </radialGradient>
    
    {/* ==================== MASKS & CLIPS ==================== */}
    
    {/* Body outline for clipping */}
    <clipPath id="body-clip-anterior">
      <path d="
        M150 20
        Q180 20 200 60
        L220 120
        Q240 180 230 250
        L225 300
        Q220 350 200 400
        L190 450
        L200 550
        L210 650
        L205 750
        L200 850
        L180 850
        L170 750
        L165 650
        L150 650
        L135 650
        L130 750
        L120 850
        L100 850
        L95 750
        L90 650
        L100 550
        L110 450
        Q80 350 75 300
        L70 250
        Q60 180 80 120
        L100 60
        Q120 20 150 20
        Z"/>
    </clipPath>
  </defs>
);

/**
 * Enhanced Anatomy Renderer wrapper component
 */
export const EnhancedAnatomyRenderer: React.FC<EnhancedAnatomyRendererProps> = ({
  children,
  viewBox = "0 0 300 900",
  width = "100%",
  height = "100%",
  className = "",
  backgroundColor = "transparent",
}) => {
  return (
    <svg
      viewBox={viewBox}
      width={width}
      height={height}
      className={className}
      style={{ backgroundColor }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <EnhancedSVGDefs />
      {children}
    </svg>
  );
};

export default EnhancedAnatomyRenderer;
