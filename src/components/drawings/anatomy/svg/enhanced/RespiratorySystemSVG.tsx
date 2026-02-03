/**
 * Respiratory System - Medical Atlas Quality SVG
 * Airways and lungs with lobation detail
 */

import React from "react";
import { getLayerStyle, LayerState } from "../SVGHelpers";
import { ANATOMY_COLORS } from "../AnatomyColors";

interface RespiratorySystemProps {
  viewType: "anterior" | "posterior" | "lateral";
  layerStates: Record<string, LayerState>;
  onLayerClick?: (layerId: string) => void;
  showLabels?: boolean;
}

export const RespiratorySystemSVG: React.FC<RespiratorySystemProps> = ({
  viewType,
  layerStates,
  onLayerClick,
  showLabels = false,
}) => {
  const click = (id: string) => (e: React.MouseEvent) => {
    e.stopPropagation();
    onLayerClick?.(id);
  };

  const getStyle = (id: string) => getLayerStyle(id, layerStates, { 
    fill: "#FFB6C1", 
    stroke: "#8B6969" 
  });

  return (
    <g id="respiratory-system">
      {/* Nasal Cavity */}
      <g id="nasal-cavity" style={getStyle("nasal-cavity")}>
        <path
          d="M145 60 L155 60 L158 45 Q155 35 150 32 Q145 35 142 45 Z"
          fill={layerStates["nasal-cavity"]?.highlightColor || "#FFDAB9"}
          stroke="#8B7355"
          strokeWidth="0.5"
          onClick={click("nasal-cavity")}
          className="cursor-pointer hover:brightness-110"
        />
        {/* Nasal septum */}
        <line x1="150" y1="35" x2="150" y2="60" stroke="#8B7355" strokeWidth="0.3"/>
        {/* Conchae */}
        <path d="M144 42 Q147 40 150 42" fill="none" stroke="#BC8F8F" strokeWidth="0.3"/>
        <path d="M150 42 Q153 40 156 42" fill="none" stroke="#BC8F8F" strokeWidth="0.3"/>
        <path d="M144 50 Q147 48 150 50" fill="none" stroke="#BC8F8F" strokeWidth="0.3"/>
        <path d="M150 50 Q153 48 156 50" fill="none" stroke="#BC8F8F" strokeWidth="0.3"/>
      </g>
      
      {/* Pharynx */}
      <path
        id="pharynx"
        d="M145 60 L155 60 L157 80 L158 100 L155 115 L145 115 L142 100 L143 80 Z"
        style={getStyle("pharynx")}
        fill={layerStates["pharynx"]?.highlightColor || "#F5DEB3"}
        stroke="#8B7355"
        strokeWidth="0.5"
        onClick={click("pharynx")}
        className="cursor-pointer hover:brightness-110"
      />
      
      {/* Larynx */}
      <g id="larynx" style={getStyle("larynx")}>
        {/* Thyroid cartilage */}
        <path
          d="M142 115 L145 115 L150 120 L155 115 L158 115 L160 125 L158 140 L150 145 L142 140 L140 125 Z"
          fill={layerStates["larynx"]?.highlightColor || "#E8E8F0"}
          stroke="#8B8B9B"
          strokeWidth="0.6"
          onClick={click("larynx")}
          className="cursor-pointer hover:brightness-110"
        />
        {/* Cricoid cartilage */}
        <ellipse cx="150" cy="150" rx="8" ry="5" 
          fill={layerStates["larynx"]?.highlightColor || "#E0E0E8"}
          stroke="#8B8B9B" strokeWidth="0.4"/>
      </g>
      
      {/* Trachea */}
      <g id="trachea" style={getStyle("trachea")}>
        <path
          d="M145 155 L155 155 L155 230 L145 230 Z"
          fill={layerStates["trachea"]?.highlightColor || "#F0E6D8"}
          stroke="#8B7355"
          strokeWidth="0.6"
          onClick={click("trachea")}
          className="cursor-pointer hover:brightness-110"
        />
        {/* Tracheal rings */}
        {[160, 170, 180, 190, 200, 210, 220].map((y) => (
          <line key={`ring-${y}`} x1="145" y1={y} x2="155" y2={y} 
            stroke="#C0B0A0" strokeWidth="1" strokeLinecap="round"/>
        ))}
      </g>
      
      {/* Primary Bronchi */}
      <g id="bronchi-primary" style={getStyle("bronchi-primary")}>
        {/* Left main bronchus */}
        <path
          d="M145 230 Q130 240 115 250"
          fill="none"
          stroke={layerStates["bronchi-primary"]?.highlightColor || "#D4C4A8"}
          strokeWidth="6"
          strokeLinecap="round"
          onClick={click("bronchi-primary")}
          className="cursor-pointer hover:brightness-110"
        />
        {/* Right main bronchus */}
        <path
          d="M155 230 Q170 240 185 250"
          fill="none"
          stroke={layerStates["bronchi-primary"]?.highlightColor || "#D4C4A8"}
          strokeWidth="6"
          strokeLinecap="round"
          onClick={click("bronchi-primary")}
          className="cursor-pointer hover:brightness-110"
        />
      </g>
      
      {/* Secondary bronchi (lobar) */}
      <g id="bronchi-secondary" opacity="0.8">
        {/* Left upper lobe bronchus */}
        <path d="M115 250 Q100 255 90 265" fill="none" stroke="#C8B898" strokeWidth="3"/>
        {/* Left lower lobe bronchus */}
        <path d="M115 250 Q105 270 100 295" fill="none" stroke="#C8B898" strokeWidth="3"/>
        
        {/* Right upper lobe bronchus */}
        <path d="M185 250 Q200 255 210 265" fill="none" stroke="#C8B898" strokeWidth="3"/>
        {/* Right middle lobe bronchus */}
        <path d="M185 250 Q198 265 205 280" fill="none" stroke="#C8B898" strokeWidth="2.5"/>
        {/* Right lower lobe bronchus */}
        <path d="M185 250 Q195 270 200 295" fill="none" stroke="#C8B898" strokeWidth="3"/>
      </g>
      
      {/* Left Lung */}
      <g id="lung-left" style={getStyle("lung-left")} filter="url(#organ-internal-depth)">
        {/* Upper lobe */}
        <path
          id="lung-left-upper"
          d="M120 220 Q85 225 70 250 Q55 275 55 310 Q58 340 75 370 L95 380 L115 365 Q100 340 100 310 Q100 280 120 250 Z"
          fill={layerStates["lung-left"]?.highlightColor || "url(#lung-gradient)"}
          stroke="#A08080"
          strokeWidth="0.8"
          onClick={click("lung-left")}
          className="cursor-pointer hover:brightness-110"
        />
        {/* Lower lobe */}
        <path
          id="lung-left-lower"
          d="M95 380 Q70 390 60 420 Q55 460 65 500 Q80 535 110 545 Q140 550 145 530 L148 500 Q135 490 125 460 Q115 420 115 380 Z"
          fill={layerStates["lung-left"]?.highlightColor || "#F5A0A8"}
          stroke="#A08080"
          strokeWidth="0.8"
          onClick={click("lung-left")}
          className="cursor-pointer hover:brightness-110"
        />
        {/* Oblique fissure */}
        <path d="M75 370 Q100 400 115 370" fill="none" stroke="#906060" strokeWidth="0.5" strokeDasharray="2,1"/>
        {/* Cardiac notch */}
        <path d="M145 480 Q155 475 155 460" fill="none" stroke="#A08080" strokeWidth="0.4"/>
      </g>
      
      {/* Right Lung */}
      <g id="lung-right" style={getStyle("lung-right")} filter="url(#organ-internal-depth)">
        {/* Upper lobe */}
        <path
          id="lung-right-upper"
          d="M180 220 Q215 225 230 250 Q245 275 245 310 Q240 340 220 360 L195 365 Q210 340 210 310 Q210 280 190 250 Z"
          fill={layerStates["lung-right"]?.highlightColor || "url(#lung-gradient)"}
          stroke="#A08080"
          strokeWidth="0.8"
          onClick={click("lung-right")}
          className="cursor-pointer hover:brightness-110"
        />
        {/* Middle lobe */}
        <path
          id="lung-right-middle"
          d="M195 365 L220 360 Q238 380 235 410 L210 420 Q200 400 195 380 Z"
          fill={layerStates["lung-right"]?.highlightColor || "#F8B0B8"}
          stroke="#A08080"
          strokeWidth="0.8"
          onClick={click("lung-right")}
          className="cursor-pointer hover:brightness-110"
        />
        {/* Lower lobe */}
        <path
          id="lung-right-lower"
          d="M210 420 L235 410 Q250 450 245 500 Q235 535 200 545 Q165 550 155 530 L152 500 Q165 490 175 460 Q190 420 195 390 Q200 405 210 420 Z"
          fill={layerStates["lung-right"]?.highlightColor || "#F5A0A8"}
          stroke="#A08080"
          strokeWidth="0.8"
          onClick={click("lung-right")}
          className="cursor-pointer hover:brightness-110"
        />
        {/* Horizontal fissure */}
        <path d="M195 365 Q215 360 220 360" fill="none" stroke="#906060" strokeWidth="0.5" strokeDasharray="2,1"/>
        {/* Oblique fissure */}
        <path d="M220 360 Q210 395 210 420" fill="none" stroke="#906060" strokeWidth="0.5" strokeDasharray="2,1"/>
      </g>
      
      {/* Diaphragm */}
      <path
        id="diaphragm"
        d="M50 550 Q100 520 150 530 Q200 520 250 550 L250 565 Q200 540 150 545 Q100 540 50 565 Z"
        style={getStyle("diaphragm")}
        fill={layerStates["diaphragm"]?.highlightColor || "#CD5C5C"}
        stroke="#8B3030"
        strokeWidth="0.8"
        opacity="0.7"
        onClick={click("diaphragm")}
        className="cursor-pointer hover:brightness-110"
      />
    </g>
  );
};

export default RespiratorySystemSVG;
