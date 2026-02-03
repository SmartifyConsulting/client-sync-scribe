/**
 * SVG Helper Components and Utilities
 * Provides reusable elements for medical-grade anatomy illustrations
 */

import React from "react";
import { ANATOMY_COLORS, SVG_FILTERS, SVG_GRADIENTS } from "./AnatomyColors";

export interface LayerStyleProps {
  layerId: string;
  layerStates: Record<string, LayerState>;
  defaultFill?: string;
  defaultStroke?: string;
  defaultOpacity?: number;
}

export interface LayerState {
  visible: boolean;
  opacity: number;
  highlightColor?: string;
}

// Get computed style for a layer
export function getLayerStyle(
  layerId: string,
  layerStates: Record<string, LayerState>,
  defaults?: { fill?: string; stroke?: string; opacity?: number }
) {
  const state = layerStates[layerId];
  const isVisible = state?.visible ?? true;
  const opacity = state?.opacity ?? defaults?.opacity ?? 1;
  
  return {
    display: isVisible ? "block" : "none",
    opacity,
    fill: state?.highlightColor || defaults?.fill,
    stroke: defaults?.stroke,
    cursor: "pointer",
    transition: "all 0.15s ease-out",
  };
}

// Wrapper for clickable anatomy structures
interface AnatomyLayerProps {
  layerId: string;
  layerStates: Record<string, LayerState>;
  onClick?: (layerId: string) => void;
  children: React.ReactNode;
  className?: string;
}

export const AnatomyLayer: React.FC<AnatomyLayerProps> = ({
  layerId,
  layerStates,
  onClick,
  children,
  className = "",
}) => {
  const state = layerStates[layerId];
  const isVisible = state?.visible ?? true;
  
  if (!isVisible) return null;
  
  return (
    <g
      id={layerId}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(layerId);
      }}
      style={{ opacity: state?.opacity ?? 1 }}
      className={`anatomy-layer ${className}`}
    >
      {children}
    </g>
  );
};

// SVG Definitions (filters, gradients)
export const AnatomySVGDefs: React.FC = () => (
  <defs>
    {/* Shadows */}
    <filter id="bone-shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0.5" dy="1" stdDeviation="0.8" floodColor="#8B7355" floodOpacity="0.3"/>
    </filter>
    <filter id="muscle-shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0.3" dy="0.6" stdDeviation="0.5" floodColor="#660000" floodOpacity="0.4"/>
    </filter>
    <filter id="organ-depth" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="1" dy="2" stdDeviation="1.5" floodColor="#000000" floodOpacity="0.15"/>
    </filter>
    <filter id="nerve-glow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="#FFD700" floodOpacity="0.5"/>
    </filter>
    
    {/* Bone Gradient */}
    <linearGradient id="bone-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9"/>
      <stop offset="50%" stopColor="#FFFEF0" stopOpacity="1"/>
      <stop offset="100%" stopColor="#DEB887" stopOpacity="0.8"/>
    </linearGradient>
    
    {/* Muscle Gradient */}
    <linearGradient id="muscle-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stopColor="#CD5C5C"/>
      <stop offset="50%" stopColor="#A52A2A"/>
      <stop offset="100%" stopColor="#8B0000"/>
    </linearGradient>
    
    {/* Artery Gradient */}
    <radialGradient id="artery-gradient" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stopColor="#FF6B6B"/>
      <stop offset="100%" stopColor="#DC143C"/>
    </radialGradient>
    
    {/* Vein Gradient */}
    <radialGradient id="vein-gradient" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stopColor="#6495ED"/>
      <stop offset="100%" stopColor="#4169E1"/>
    </radialGradient>
    
    {/* Skin Gradient */}
    <linearGradient id="skin-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stopColor="#FFDAB9"/>
      <stop offset="100%" stopColor="#DEB887"/>
    </linearGradient>
    
    {/* Nerve Gradient */}
    <linearGradient id="nerve-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stopColor="#FAFAD2"/>
      <stop offset="50%" stopColor="#FFD700"/>
      <stop offset="100%" stopColor="#FAFAD2"/>
    </linearGradient>
    
    {/* Organ Gradient */}
    <linearGradient id="organ-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="#DEB887"/>
      <stop offset="100%" stopColor="#BC8F8F"/>
    </linearGradient>
    
    {/* Cartilage Gradient */}
    <linearGradient id="cartilage-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stopColor="#F0F0F0"/>
      <stop offset="100%" stopColor="#C0C0C0"/>
    </linearGradient>
    
    {/* Patterns for tissue textures */}
    <pattern id="muscle-fiber-pattern" patternUnits="userSpaceOnUse" width="4" height="20" patternTransform="rotate(75)">
      <line x1="0" y1="0" x2="0" y2="20" stroke="#A52A2A" strokeWidth="0.5" opacity="0.3"/>
    </pattern>
    
    <pattern id="bone-texture" patternUnits="userSpaceOnUse" width="8" height="8">
      <circle cx="4" cy="4" r="0.5" fill="#DEB887" opacity="0.3"/>
    </pattern>
    
    {/* Clips for complex shapes */}
    <clipPath id="body-outline-clip">
      <path d="M150 30 Q180 30 200 60 L220 120 Q230 180 220 250 L210 350 Q200 400 190 450 L180 520 L170 580 L160 580 L150 520 L140 580 L130 580 L120 520 L110 450 Q100 400 90 350 L80 250 Q70 180 80 120 L100 60 Q120 30 150 30 Z"/>
    </clipPath>
  </defs>
);

// Anatomical label component
interface AnatomyLabelProps {
  x: number;
  y: number;
  text: string;
  latinName?: string;
  anchor?: "start" | "middle" | "end";
  size?: "small" | "medium" | "large";
  visible?: boolean;
}

export const AnatomyLabel: React.FC<AnatomyLabelProps> = ({
  x,
  y,
  text,
  latinName,
  anchor = "start",
  size = "medium",
  visible = true,
}) => {
  if (!visible) return null;
  
  const fontSize = size === "small" ? 6 : size === "medium" ? 8 : 10;
  const latinSize = fontSize - 2;
  
  return (
    <g className="anatomy-label" style={{ pointerEvents: "none" }}>
      <text
        x={x}
        y={y}
        textAnchor={anchor}
        fill="#333333"
        fontSize={fontSize}
        fontFamily="Inter, system-ui, sans-serif"
        fontWeight="500"
      >
        {text}
      </text>
      {latinName && (
        <text
          x={x}
          y={y + fontSize + 2}
          textAnchor={anchor}
          fill="#666666"
          fontSize={latinSize}
          fontFamily="Inter, system-ui, sans-serif"
          fontStyle="italic"
        >
          {latinName}
        </text>
      )}
    </g>
  );
};

// Leader line for labels
interface LeaderLineProps {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  visible?: boolean;
}

export const LeaderLine: React.FC<LeaderLineProps> = ({
  x1,
  y1,
  x2,
  y2,
  visible = true,
}) => {
  if (!visible) return null;
  
  return (
    <g className="leader-line" style={{ pointerEvents: "none" }}>
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke="#666666"
        strokeWidth="0.5"
        strokeDasharray="2,2"
      />
      <circle cx={x1} cy={y1} r="1.5" fill="#666666"/>
    </g>
  );
};

// Highlight overlay for selected structures
interface HighlightOverlayProps {
  pathData: string;
  color: string;
  opacity?: number;
  animated?: boolean;
}

export const HighlightOverlay: React.FC<HighlightOverlayProps> = ({
  pathData,
  color,
  opacity = 0.4,
  animated = true,
}) => (
  <path
    d={pathData}
    fill={color}
    opacity={opacity}
    stroke={color}
    strokeWidth="2"
    className={animated ? "animate-pulse" : ""}
    style={{ pointerEvents: "none" }}
  />
);

// LayerState type is defined and exported at line 18
