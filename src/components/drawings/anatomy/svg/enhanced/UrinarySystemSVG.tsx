/**
 * Urinary System - Medical Atlas Quality SVG
 * Kidneys, ureters, bladder, and urethra
 */

import React from "react";
import { getLayerStyle, LayerState } from "../SVGHelpers";

interface UrinarySystemProps {
  viewType: "anterior" | "posterior" | "lateral";
  layerStates: Record<string, LayerState>;
  onLayerClick?: (layerId: string) => void;
  showLabels?: boolean;
}

export const UrinarySystemSVG: React.FC<UrinarySystemProps> = ({
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
    fill: "#CD853F", 
    stroke: "#8B5A2B" 
  });

  return (
    <g id="urinary-system">
      {/* Left Kidney */}
      <g id="kidney-left" filter="url(#organ-parenchymal-depth)">
        <path
          d="M85 430 
             Q70 440 68 465 
             Q65 490 72 515 
             Q80 540 100 545 
             Q115 545 125 530 
             Q130 510 128 485 
             Q125 455 110 440 
             Q95 430 85 430
             Z"
          style={getStyle("kidney-left")}
          fill={layerStates["kidney-left"]?.highlightColor || "url(#kidney-gradient)"}
          stroke="#6B4520"
          strokeWidth="0.8"
          onClick={click("kidney-left")}
          className="cursor-pointer hover:brightness-110"
        />
        {/* Renal hilum */}
        <path
          d="M115 470 Q125 480 125 490 Q125 500 115 510"
          fill="none"
          stroke="#6B4520"
          strokeWidth="0.5"
        />
        {/* Cortex/medulla indication */}
        <path
          d="M85 445 Q78 465 80 490 Q82 515 95 535"
          fill="none"
          stroke="#8B5A30"
          strokeWidth="0.4"
          opacity="0.5"
        />
        {/* Renal pyramids hint */}
        <g opacity="0.3">
          <path d="M90 460 L100 480 L90 475 Z" fill="#8B4513"/>
          <path d="M85 480 L95 500 L85 495 Z" fill="#8B4513"/>
          <path d="M88 500 L98 520 L88 515 Z" fill="#8B4513"/>
        </g>
      </g>
      
      {/* Right Kidney */}
      <g id="kidney-right" filter="url(#organ-parenchymal-depth)">
        <path
          d="M215 430 
             Q230 440 232 465 
             Q235 490 228 515 
             Q220 540 200 545 
             Q185 545 175 530 
             Q170 510 172 485 
             Q175 455 190 440 
             Q205 430 215 430
             Z"
          style={getStyle("kidney-right")}
          fill={layerStates["kidney-right"]?.highlightColor || "url(#kidney-gradient)"}
          stroke="#6B4520"
          strokeWidth="0.8"
          onClick={click("kidney-right")}
          className="cursor-pointer hover:brightness-110"
        />
        {/* Renal hilum */}
        <path
          d="M185 470 Q175 480 175 490 Q175 500 185 510"
          fill="none"
          stroke="#6B4520"
          strokeWidth="0.5"
        />
        {/* Cortex/medulla indication */}
        <path
          d="M215 445 Q222 465 220 490 Q218 515 205 535"
          fill="none"
          stroke="#8B5A30"
          strokeWidth="0.4"
          opacity="0.5"
        />
        {/* Renal pyramids hint */}
        <g opacity="0.3">
          <path d="M210 460 L200 480 L210 475 Z" fill="#8B4513"/>
          <path d="M215 480 L205 500 L215 495 Z" fill="#8B4513"/>
          <path d="M212 500 L202 520 L212 515 Z" fill="#8B4513"/>
        </g>
      </g>
      
      {/* Adrenal Glands */}
      <g id="adrenal-glands">
        {/* Left adrenal */}
        <path
          id="adrenal-left"
          d="M80 420 Q90 410 105 415 Q112 420 110 430 Q105 438 92 435 Q78 430 80 420 Z"
          style={getStyle("adrenal-left")}
          fill={layerStates["adrenal-left"]?.highlightColor || "#FFD700"}
          stroke="#B8860B"
          strokeWidth="0.5"
          onClick={click("adrenal-left")}
          className="cursor-pointer hover:brightness-110"
        />
        {/* Right adrenal */}
        <path
          id="adrenal-right"
          d="M220 420 Q210 410 195 415 Q188 420 190 430 Q195 438 208 435 Q222 430 220 420 Z"
          style={getStyle("adrenal-right")}
          fill={layerStates["adrenal-right"]?.highlightColor || "#FFD700"}
          stroke="#B8860B"
          strokeWidth="0.5"
          onClick={click("adrenal-right")}
          className="cursor-pointer hover:brightness-110"
        />
      </g>
      
      {/* Ureters */}
      <g id="ureters" style={getStyle("ureters")}>
        {/* Left ureter */}
        <path
          id="ureter-left"
          d="M115 510 
             Q118 550 120 590 
             Q122 630 125 670 
             Q128 700 135 720"
          fill="none"
          stroke={layerStates["ureters"]?.highlightColor || "#DEB887"}
          strokeWidth="3"
          strokeLinecap="round"
          onClick={click("ureters")}
          className="cursor-pointer hover:brightness-110"
        />
        {/* Right ureter */}
        <path
          id="ureter-right"
          d="M185 510 
             Q182 550 180 590 
             Q178 630 175 670 
             Q172 700 165 720"
          fill="none"
          stroke={layerStates["ureters"]?.highlightColor || "#DEB887"}
          strokeWidth="3"
          strokeLinecap="round"
          onClick={click("ureters")}
          className="cursor-pointer hover:brightness-110"
        />
      </g>
      
      {/* Urinary Bladder */}
      <g id="bladder" filter="url(#organ-hollow-depth)">
        <path
          d="M110 720 
             Q95 730 90 755 
             Q88 780 100 805 
             Q120 825 150 828 
             Q180 825 200 805 
             Q212 780 210 755 
             Q205 730 190 720 
             Q170 712 150 715 
             Q130 712 110 720
             Z"
          style={getStyle("bladder")}
          fill={layerStates["bladder"]?.highlightColor || "#FFE4B5"}
          stroke="#A08060"
          strokeWidth="0.8"
          onClick={click("bladder")}
          className="cursor-pointer hover:brightness-110"
        />
        {/* Bladder wall thickness indication */}
        <path
          d="M115 725 Q100 738 98 760 Q97 785 108 805"
          fill="none"
          stroke="#BC9060"
          strokeWidth="0.4"
          opacity="0.5"
        />
        {/* Trigone area */}
        <path
          d="M135 810 L150 820 L165 810"
          fill="none"
          stroke="#A08060"
          strokeWidth="0.3"
          opacity="0.4"
        />
      </g>
      
      {/* Urethra */}
      <path
        id="urethra"
        d="M150 828 L150 870"
        style={getStyle("urethra")}
        fill="none"
        stroke={layerStates["urethra"]?.highlightColor || "#DEB887"}
        strokeWidth="4"
        strokeLinecap="round"
        onClick={click("urethra")}
        className="cursor-pointer hover:brightness-110"
      />
      
      {/* Renal vessels (simplified) */}
      <g id="renal-vessels" opacity="0.7">
        {/* Left renal artery */}
        <path d="M150 480 L120 485" stroke="#DC143C" strokeWidth="2" fill="none"/>
        {/* Left renal vein */}
        <path d="M150 490 L120 492" stroke="#4169E1" strokeWidth="2.5" fill="none"/>
        {/* Right renal artery */}
        <path d="M150 480 L180 485" stroke="#DC143C" strokeWidth="2" fill="none"/>
        {/* Right renal vein */}
        <path d="M150 490 L180 492" stroke="#4169E1" strokeWidth="2.5" fill="none"/>
      </g>
    </g>
  );
};

export default UrinarySystemSVG;
