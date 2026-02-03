/**
 * Nervous System - Medical Atlas Quality SVG
 * Brain, spinal cord, and major nerve pathways
 */

import React from "react";
import { getLayerStyle, LayerState } from "../SVGHelpers";
import { ANATOMY_COLORS } from "../AnatomyColors";

interface NervousSystemProps {
  viewType: "anterior" | "posterior" | "lateral";
  layerStates: Record<string, LayerState>;
  onLayerClick?: (layerId: string) => void;
  showLabels?: boolean;
}

const nerveColor = ANATOMY_COLORS.nerve.central;
const nerveStroke = ANATOMY_COLORS.nerve.stroke;

export const NervousSystemSVG: React.FC<NervousSystemProps> = ({
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
    fill: nerveColor, 
    stroke: nerveStroke 
  });

  return (
    <g id="nervous-system">
      {/* Brain */}
      <g id="brain-group" filter="url(#nerve-glow)">
        {/* Cerebrum - Left hemisphere */}
        <path
          id="brain-cerebrum-left"
          d="M100 50 Q90 45 85 55 Q75 60 72 75 Q68 90 72 105 Q78 120 85 130 Q95 142 110 148 Q125 152 140 150 Q148 148 150 140 L150 60 Q145 50 130 45 Q115 42 100 50 Z"
          style={getStyle("brain-cerebrum")}
          fill={layerStates["brain-cerebrum"]?.highlightColor || "url(#brain-gradient)"}
          stroke={nerveStroke}
          strokeWidth="0.8"
          onClick={click("brain-cerebrum")}
          className="cursor-pointer hover:brightness-110"
        />
        
        {/* Cerebrum - Right hemisphere */}
        <path
          id="brain-cerebrum-right"
          d="M200 50 Q210 45 215 55 Q225 60 228 75 Q232 90 228 105 Q222 120 215 130 Q205 142 190 148 Q175 152 160 150 Q152 148 150 140 L150 60 Q155 50 170 45 Q185 42 200 50 Z"
          style={getStyle("brain-cerebrum")}
          fill={layerStates["brain-cerebrum"]?.highlightColor || "url(#brain-gradient)"}
          stroke={nerveStroke}
          strokeWidth="0.8"
          onClick={click("brain-cerebrum")}
          className="cursor-pointer hover:brightness-110"
        />
        
        {/* Cerebellum */}
        <path
          id="brain-cerebellum"
          d="M115 155 Q95 160 85 175 Q80 190 90 200 Q105 210 130 210 L150 208 L170 210 Q195 210 210 200 Q220 190 215 175 Q205 160 185 155 Q165 150 150 152 Q135 150 115 155 Z"
          style={getStyle("brain-cerebellum")}
          fill={layerStates["brain-cerebellum"]?.highlightColor || "#E0C8A8"}
          stroke={nerveStroke}
          strokeWidth="0.7"
          onClick={click("brain-cerebellum")}
          className="cursor-pointer hover:brightness-110"
        />
        
        {/* Brainstem */}
        <path
          id="brain-brainstem"
          d="M140 205 Q135 215 138 230 L142 250 L145 270 Q148 280 150 290 Q152 280 155 270 L158 250 L162 230 Q165 215 160 205 Z"
          style={getStyle("brain-brainstem")}
          fill={layerStates["brain-brainstem"]?.highlightColor || "#D8C098"}
          stroke={nerveStroke}
          strokeWidth="0.6"
          onClick={click("brain-brainstem")}
          className="cursor-pointer hover:brightness-110"
        />
      </g>
      
      {/* Spinal Cord */}
      <path
        id="spinal-cord"
        d="M147 290 L147 650 Q148 660 150 665 Q152 660 153 650 L153 290 Q152 285 150 283 Q148 285 147 290 Z"
        style={getStyle("spinal-cord")}
        fill={layerStates["spinal-cord"]?.highlightColor || nerveColor}
        stroke={nerveStroke}
        strokeWidth="0.6"
        onClick={click("spinal-cord")}
        className="cursor-pointer hover:brightness-110"
      />
      
      {/* Brachial Plexus */}
      <g id="brachial-plexus" style={getStyle("brachial-plexus")}>
        <path
          d="M115 370 Q90 380 75 400 Q60 420 50 450 L45 480"
          fill="none"
          stroke={layerStates["brachial-plexus"]?.highlightColor || nerveColor}
          strokeWidth="3"
          strokeLinecap="round"
          onClick={click("brachial-plexus")}
          className="cursor-pointer hover:brightness-110"
        />
        <path
          d="M185 370 Q210 380 225 400 Q240 420 250 450 L255 480"
          fill="none"
          stroke={layerStates["brachial-plexus"]?.highlightColor || nerveColor}
          strokeWidth="3"
          strokeLinecap="round"
          onClick={click("brachial-plexus")}
          className="cursor-pointer hover:brightness-110"
        />
      </g>
      
      {/* Lumbosacral Plexus */}
      <g id="lumbosacral-plexus" style={getStyle("lumbosacral-plexus")}>
        <path
          d="M135 580 Q110 595 95 620 Q85 650 80 680"
          fill="none"
          stroke={layerStates["lumbosacral-plexus"]?.highlightColor || nerveColor}
          strokeWidth="2.5"
          strokeLinecap="round"
          onClick={click("lumbosacral-plexus")}
          className="cursor-pointer hover:brightness-110"
        />
        <path
          d="M165 580 Q190 595 205 620 Q215 650 220 680"
          fill="none"
          stroke={layerStates["lumbosacral-plexus"]?.highlightColor || nerveColor}
          strokeWidth="2.5"
          strokeLinecap="round"
          onClick={click("lumbosacral-plexus")}
          className="cursor-pointer hover:brightness-110"
        />
      </g>
      
      {/* Major Peripheral Nerves */}
      <g id="peripheral-nerves">
        {/* Sciatic Nerve */}
        <path
          id="nerve-sciatic-left"
          d="M80 680 Q75 720 72 760 Q70 800 68 840"
          style={getStyle("nerve-sciatic")}
          fill="none"
          stroke={layerStates["nerve-sciatic"]?.highlightColor || nerveColor}
          strokeWidth="3"
          onClick={click("nerve-sciatic")}
          className="cursor-pointer hover:brightness-110"
        />
        <path
          id="nerve-sciatic-right"
          d="M220 680 Q225 720 228 760 Q230 800 232 840"
          style={getStyle("nerve-sciatic")}
          fill="none"
          stroke={layerStates["nerve-sciatic"]?.highlightColor || nerveColor}
          strokeWidth="3"
          onClick={click("nerve-sciatic")}
          className="cursor-pointer hover:brightness-110"
        />
      </g>
    </g>
  );
};

export default NervousSystemSVG;
