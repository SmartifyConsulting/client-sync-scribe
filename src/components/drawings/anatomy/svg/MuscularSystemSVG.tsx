/**
 * Muscular System - Medical Atlas Quality SVG
 * Anatomically accurate muscle illustrations with fiber direction
 */

import React from "react";
import { AnatomySVGDefs, AnatomyLabel, getLayerStyle, LayerState } from "./SVGHelpers";
import { ANATOMY_COLORS } from "./AnatomyColors";

interface MuscularSystemProps {
  viewType: "anterior" | "posterior" | "lateral";
  layerStates: Record<string, LayerState>;
  onLayerClick?: (layerId: string) => void;
  showLabels?: boolean;
}

const MUSCLE = ANATOMY_COLORS.muscle;

// Head and Neck Muscles
const HeadNeckMuscles: React.FC<{
  layerStates: Record<string, LayerState>;
  onLayerClick?: (layerId: string) => void;
  offsetX?: number;
  offsetY?: number;
}> = ({ layerStates, onLayerClick, offsetX = 0, offsetY = 0 }) => {
  const click = (id: string) => (e: React.MouseEvent) => {
    e.stopPropagation();
    onLayerClick?.(id);
  };
  
  const getStyle = (id: string) => getLayerStyle(id, layerStates, { fill: MUSCLE.superficial, stroke: MUSCLE.stroke });
  
  return (
    <g id="head-neck-muscles" transform={`translate(${offsetX}, ${offsetY})`} filter="url(#muscle-shadow)">
      {/* Frontalis */}
      <path
        id="muscle-frontalis"
        d="M115 25 Q130 20 150 18 Q170 20 185 25 L188 55 Q150 50 112 55 Z"
        style={getStyle("muscle-frontalis")}
        fill={layerStates["muscle-frontalis"]?.highlightColor || "url(#muscle-gradient)"}
        stroke={MUSCLE.stroke}
        strokeWidth="0.5"
        onClick={click("muscle-frontalis")}
        className="cursor-pointer hover:brightness-110 transition-all"
      />
      {/* Fiber direction lines */}
      <g opacity="0.3">
        {[120, 130, 140, 150, 160, 170, 180].map((x) => (
          <line key={`frontalis-fiber-${x}`} x1={x} y1={20} x2={x} y2={55} stroke={MUSCLE.fiber} strokeWidth="0.3"/>
        ))}
      </g>
      
      {/* Orbicularis Oculi */}
      <g id="muscle-orbicularis-oculi" style={getStyle("muscle-orbicularis-oculi")}>
        {/* Left */}
        <ellipse
          cx="125" cy="75"
          rx="22" ry="18"
          fill="none"
          stroke={layerStates["muscle-orbicularis-oculi"]?.highlightColor || MUSCLE.superficial}
          strokeWidth="4"
          onClick={click("muscle-orbicularis-oculi")}
          className="cursor-pointer hover:brightness-110"
        />
        {/* Right */}
        <ellipse
          cx="175" cy="75"
          rx="22" ry="18"
          fill="none"
          stroke={layerStates["muscle-orbicularis-oculi"]?.highlightColor || MUSCLE.superficial}
          strokeWidth="4"
          onClick={click("muscle-orbicularis-oculi")}
          className="cursor-pointer hover:brightness-110"
        />
      </g>
      
      {/* Orbicularis Oris */}
      <ellipse
        id="muscle-orbicularis-oris"
        cx="150" cy="115"
        rx="18" ry="12"
        style={getStyle("muscle-orbicularis-oris")}
        fill="none"
        stroke={layerStates["muscle-orbicularis-oris"]?.highlightColor || MUSCLE.superficial}
        strokeWidth="5"
        onClick={click("muscle-orbicularis-oris")}
        className="cursor-pointer hover:brightness-110"
      />
      
      {/* Masseter */}
      <g id="muscle-masseter" style={getStyle("muscle-masseter")}>
        {/* Left */}
        <path
          d="M100 88 L95 105 L100 130 L115 135 L120 115 L118 90 Z"
          fill={layerStates["muscle-masseter"]?.highlightColor || MUSCLE.superficial}
          stroke={MUSCLE.stroke}
          strokeWidth="0.5"
          onClick={click("muscle-masseter")}
          className="cursor-pointer hover:brightness-110"
        />
        {/* Right */}
        <path
          d="M200 88 L205 105 L200 130 L185 135 L180 115 L182 90 Z"
          fill={layerStates["muscle-masseter"]?.highlightColor || MUSCLE.superficial}
          stroke={MUSCLE.stroke}
          strokeWidth="0.5"
          onClick={click("muscle-masseter")}
          className="cursor-pointer hover:brightness-110"
        />
      </g>
      
      {/* Temporalis */}
      <g id="muscle-temporalis" style={getStyle("muscle-temporalis")}>
        {/* Left */}
        <path
          d="M95 40 Q85 50 85 70 L100 85 L110 70 L105 45 Z"
          fill={layerStates["muscle-temporalis"]?.highlightColor || MUSCLE.deep}
          stroke={MUSCLE.stroke}
          strokeWidth="0.4"
          onClick={click("muscle-temporalis")}
          className="cursor-pointer hover:brightness-110"
        />
        {/* Right */}
        <path
          d="M205 40 Q215 50 215 70 L200 85 L190 70 L195 45 Z"
          fill={layerStates["muscle-temporalis"]?.highlightColor || MUSCLE.deep}
          stroke={MUSCLE.stroke}
          strokeWidth="0.4"
          onClick={click("muscle-temporalis")}
          className="cursor-pointer hover:brightness-110"
        />
      </g>
      
      {/* Sternocleidomastoid */}
      <g id="muscle-scm" style={getStyle("muscle-scm")}>
        {/* Left SCM */}
        <path
          d="M115 135 Q100 155 95 175 L90 195 L85 205 L92 210 L98 200 L105 180 L120 150 L130 145 L120 140 Z"
          fill={layerStates["muscle-scm"]?.highlightColor || "url(#muscle-gradient)"}
          stroke={MUSCLE.stroke}
          strokeWidth="0.6"
          onClick={click("muscle-scm")}
          className="cursor-pointer hover:brightness-110"
        />
        {/* Right SCM */}
        <path
          d="M185 135 Q200 155 205 175 L210 195 L215 205 L208 210 L202 200 L195 180 L180 150 L170 145 L180 140 Z"
          fill={layerStates["muscle-scm"]?.highlightColor || "url(#muscle-gradient)"}
          stroke={MUSCLE.stroke}
          strokeWidth="0.6"
          onClick={click("muscle-scm")}
          className="cursor-pointer hover:brightness-110"
        />
      </g>
      
      {/* Platysma */}
      <path
        id="muscle-platysma"
        d="M100 145 L85 210 L100 220 L120 210 L130 150 Z M200 145 L215 210 L200 220 L180 210 L170 150 Z"
        style={getStyle("muscle-platysma")}
        fill={layerStates["muscle-platysma"]?.highlightColor || MUSCLE.superficial}
        stroke={MUSCLE.stroke}
        strokeWidth="0.4"
        opacity="0.6"
        onClick={click("muscle-platysma")}
        className="cursor-pointer hover:brightness-110"
      />
    </g>
  );
};

// Thoracic Muscles
const ThoracicMuscles: React.FC<{
  layerStates: Record<string, LayerState>;
  onLayerClick?: (layerId: string) => void;
  offsetX?: number;
  offsetY?: number;
}> = ({ layerStates, onLayerClick, offsetX = 0, offsetY = 0 }) => {
  const click = (id: string) => (e: React.MouseEvent) => {
    e.stopPropagation();
    onLayerClick?.(id);
  };
  
  const getStyle = (id: string) => getLayerStyle(id, layerStates, { fill: MUSCLE.superficial, stroke: MUSCLE.stroke });
  
  return (
    <g id="thoracic-muscles" transform={`translate(${offsetX}, ${offsetY})`} filter="url(#muscle-shadow)">
      {/* Pectoralis Major */}
      <g id="muscle-pec-major" style={getStyle("muscle-pec-major")}>
        {/* Left pec */}
        <path
          d="M138 0 L90 10 L60 30 L55 55 L65 80 L90 90 L120 85 L138 70 L138 0"
          fill={layerStates["muscle-pec-major"]?.highlightColor || "url(#muscle-gradient)"}
          stroke={MUSCLE.stroke}
          strokeWidth="0.7"
          onClick={click("muscle-pec-major")}
          className="cursor-pointer hover:brightness-110"
        />
        {/* Fiber direction */}
        <g opacity="0.25">
          <path d="M130 10 L80 50" stroke={MUSCLE.fiber} strokeWidth="0.4"/>
          <path d="M130 25 L75 60" stroke={MUSCLE.fiber} strokeWidth="0.4"/>
          <path d="M125 40 L70 70" stroke={MUSCLE.fiber} strokeWidth="0.4"/>
          <path d="M120 55 L85 80" stroke={MUSCLE.fiber} strokeWidth="0.4"/>
        </g>
        
        {/* Right pec */}
        <path
          d="M162 0 L210 10 L240 30 L245 55 L235 80 L210 90 L180 85 L162 70 L162 0"
          fill={layerStates["muscle-pec-major"]?.highlightColor || "url(#muscle-gradient)"}
          stroke={MUSCLE.stroke}
          strokeWidth="0.7"
          onClick={click("muscle-pec-major")}
          className="cursor-pointer hover:brightness-110"
        />
        <g opacity="0.25">
          <path d="M170 10 L220 50" stroke={MUSCLE.fiber} strokeWidth="0.4"/>
          <path d="M170 25 L225 60" stroke={MUSCLE.fiber} strokeWidth="0.4"/>
          <path d="M175 40 L230 70" stroke={MUSCLE.fiber} strokeWidth="0.4"/>
          <path d="M180 55 L215 80" stroke={MUSCLE.fiber} strokeWidth="0.4"/>
        </g>
      </g>
      
      {/* Deltoid */}
      <g id="muscle-deltoid" style={getStyle("muscle-deltoid")}>
        {/* Left deltoid */}
        <path
          d="M90 0 L55 25 L45 55 L40 85 L55 100 L75 95 L90 80 L95 50 L95 15 Z"
          fill={layerStates["muscle-deltoid"]?.highlightColor || "url(#muscle-gradient)"}
          stroke={MUSCLE.stroke}
          strokeWidth="0.6"
          onClick={click("muscle-deltoid")}
          className="cursor-pointer hover:brightness-110"
        />
        {/* Fiber striations */}
        <g opacity="0.2">
          <path d="M85 10 L55 80" stroke={MUSCLE.fiber} strokeWidth="0.3"/>
          <path d="M75 15 L50 85" stroke={MUSCLE.fiber} strokeWidth="0.3"/>
          <path d="M65 20 L45 90" stroke={MUSCLE.fiber} strokeWidth="0.3"/>
        </g>
        
        {/* Right deltoid */}
        <path
          d="M210 0 L245 25 L255 55 L260 85 L245 100 L225 95 L210 80 L205 50 L205 15 Z"
          fill={layerStates["muscle-deltoid"]?.highlightColor || "url(#muscle-gradient)"}
          stroke={MUSCLE.stroke}
          strokeWidth="0.6"
          onClick={click("muscle-deltoid")}
          className="cursor-pointer hover:brightness-110"
        />
        <g opacity="0.2">
          <path d="M215 10 L245 80" stroke={MUSCLE.fiber} strokeWidth="0.3"/>
          <path d="M225 15 L250 85" stroke={MUSCLE.fiber} strokeWidth="0.3"/>
          <path d="M235 20 L255 90" stroke={MUSCLE.fiber} strokeWidth="0.3"/>
        </g>
      </g>
      
      {/* Serratus Anterior */}
      <g id="muscle-serratus" style={getStyle("muscle-serratus")}>
        {/* Left serratus - visible digitations */}
        {[50, 60, 70, 80, 90].map((y, i) => (
          <path
            key={`serratus-l-${i}`}
            d={`M75 ${y} L90 ${y + 5} L105 ${y + 2} L100 ${y + 8} L85 ${y + 10} L75 ${y + 8} Z`}
            fill={layerStates["muscle-serratus"]?.highlightColor || MUSCLE.deep}
            stroke={MUSCLE.stroke}
            strokeWidth="0.3"
            onClick={click("muscle-serratus")}
            className="cursor-pointer hover:brightness-110"
          />
        ))}
        {/* Right serratus */}
        {[50, 60, 70, 80, 90].map((y, i) => (
          <path
            key={`serratus-r-${i}`}
            d={`M225 ${y} L210 ${y + 5} L195 ${y + 2} L200 ${y + 8} L215 ${y + 10} L225 ${y + 8} Z`}
            fill={layerStates["muscle-serratus"]?.highlightColor || MUSCLE.deep}
            stroke={MUSCLE.stroke}
            strokeWidth="0.3"
            onClick={click("muscle-serratus")}
            className="cursor-pointer hover:brightness-110"
          />
        ))}
      </g>
    </g>
  );
};

// Abdominal Muscles
const AbdominalMuscles: React.FC<{
  layerStates: Record<string, LayerState>;
  onLayerClick?: (layerId: string) => void;
  offsetX?: number;
  offsetY?: number;
}> = ({ layerStates, onLayerClick, offsetX = 0, offsetY = 0 }) => {
  const click = (id: string) => (e: React.MouseEvent) => {
    e.stopPropagation();
    onLayerClick?.(id);
  };
  
  const getStyle = (id: string) => getLayerStyle(id, layerStates, { fill: MUSCLE.superficial, stroke: MUSCLE.stroke });
  
  return (
    <g id="abdominal-muscles" transform={`translate(${offsetX}, ${offsetY})`} filter="url(#muscle-shadow)">
      {/* Rectus Abdominis - 6-pack */}
      <g id="muscle-rectus-abdominis" style={getStyle("muscle-rectus-abdominis")}>
        {/* Left column */}
        {[0, 28, 56, 84].map((y, i) => (
          <rect
            key={`rectus-l-${i}`}
            x="125" y={y}
            width="22" height="26"
            rx="3"
            fill={layerStates["muscle-rectus-abdominis"]?.highlightColor || "url(#muscle-gradient)"}
            stroke={MUSCLE.stroke}
            strokeWidth="0.5"
            onClick={click("muscle-rectus-abdominis")}
            className="cursor-pointer hover:brightness-110"
          />
        ))}
        {/* Right column */}
        {[0, 28, 56, 84].map((y, i) => (
          <rect
            key={`rectus-r-${i}`}
            x="153" y={y}
            width="22" height="26"
            rx="3"
            fill={layerStates["muscle-rectus-abdominis"]?.highlightColor || "url(#muscle-gradient)"}
            stroke={MUSCLE.stroke}
            strokeWidth="0.5"
            onClick={click("muscle-rectus-abdominis")}
            className="cursor-pointer hover:brightness-110"
          />
        ))}
        {/* Linea alba (center line) */}
        <line x1="150" y1="0" x2="150" y2="120" stroke={MUSCLE.tendon} strokeWidth="2"/>
      </g>
      
      {/* External Oblique */}
      <g id="muscle-ext-oblique" style={getStyle("muscle-ext-oblique")}>
        {/* Left external oblique */}
        <path
          d="M80 10 L75 50 L80 100 L95 120 L120 115 L125 80 L125 20 L105 8 Z"
          fill={layerStates["muscle-ext-oblique"]?.highlightColor || MUSCLE.superficial}
          stroke={MUSCLE.stroke}
          strokeWidth="0.5"
          onClick={click("muscle-ext-oblique")}
          className="cursor-pointer hover:brightness-110"
        />
        {/* Fiber direction */}
        <g opacity="0.2">
          <path d="M115 20 L85 80" stroke={MUSCLE.fiber} strokeWidth="0.4"/>
          <path d="M110 35 L80 95" stroke={MUSCLE.fiber} strokeWidth="0.4"/>
          <path d="M105 50 L85 105" stroke={MUSCLE.fiber} strokeWidth="0.4"/>
        </g>
        
        {/* Right external oblique */}
        <path
          d="M220 10 L225 50 L220 100 L205 120 L180 115 L175 80 L175 20 L195 8 Z"
          fill={layerStates["muscle-ext-oblique"]?.highlightColor || MUSCLE.superficial}
          stroke={MUSCLE.stroke}
          strokeWidth="0.5"
          onClick={click("muscle-ext-oblique")}
          className="cursor-pointer hover:brightness-110"
        />
        <g opacity="0.2">
          <path d="M185 20 L215 80" stroke={MUSCLE.fiber} strokeWidth="0.4"/>
          <path d="M190 35 L220 95" stroke={MUSCLE.fiber} strokeWidth="0.4"/>
          <path d="M195 50 L215 105" stroke={MUSCLE.fiber} strokeWidth="0.4"/>
        </g>
      </g>
    </g>
  );
};

// Upper Limb Muscles
const UpperLimbMuscles: React.FC<{
  layerStates: Record<string, LayerState>;
  onLayerClick?: (layerId: string) => void;
  offsetX?: number;
  offsetY?: number;
}> = ({ layerStates, onLayerClick, offsetX = 0, offsetY = 0 }) => {
  const click = (id: string) => (e: React.MouseEvent) => {
    e.stopPropagation();
    onLayerClick?.(id);
  };
  
  const getStyle = (id: string) => getLayerStyle(id, layerStates, { fill: MUSCLE.superficial, stroke: MUSCLE.stroke });
  
  return (
    <g id="upper-limb-muscles" transform={`translate(${offsetX}, ${offsetY})`} filter="url(#muscle-shadow)">
      {/* Biceps Brachii */}
      <g id="muscle-biceps" style={getStyle("muscle-biceps")}>
        {/* Left biceps */}
        <path
          d="M50 0 L45 15 L42 45 L45 80 L55 90 L65 85 L70 60 L68 30 L60 5 Z"
          fill={layerStates["muscle-biceps"]?.highlightColor || "url(#muscle-gradient)"}
          stroke={MUSCLE.stroke}
          strokeWidth="0.6"
          onClick={click("muscle-biceps")}
          className="cursor-pointer hover:brightness-110"
        />
        {/* Muscle belly contour */}
        <ellipse cx="55" cy="50" rx="12" ry="25" fill="none" stroke={MUSCLE.stroke} strokeWidth="0.3" opacity="0.3"/>
        
        {/* Right biceps */}
        <path
          d="M250 0 L255 15 L258 45 L255 80 L245 90 L235 85 L230 60 L232 30 L240 5 Z"
          fill={layerStates["muscle-biceps"]?.highlightColor || "url(#muscle-gradient)"}
          stroke={MUSCLE.stroke}
          strokeWidth="0.6"
          onClick={click("muscle-biceps")}
          className="cursor-pointer hover:brightness-110"
        />
        <ellipse cx="245" cy="50" rx="12" ry="25" fill="none" stroke={MUSCLE.stroke} strokeWidth="0.3" opacity="0.3"/>
      </g>
      
      {/* Triceps Brachii */}
      <g id="muscle-triceps" style={getStyle("muscle-triceps")}>
        {/* Left triceps (posterior aspect, visible from sides) */}
        <path
          d="M62 5 L75 10 L80 50 L75 85 L70 88 L68 60 L65 25 Z"
          fill={layerStates["muscle-triceps"]?.highlightColor || MUSCLE.deep}
          stroke={MUSCLE.stroke}
          strokeWidth="0.5"
          opacity="0.7"
          onClick={click("muscle-triceps")}
          className="cursor-pointer hover:brightness-110"
        />
        
        {/* Right triceps */}
        <path
          d="M238 5 L225 10 L220 50 L225 85 L230 88 L232 60 L235 25 Z"
          fill={layerStates["muscle-triceps"]?.highlightColor || MUSCLE.deep}
          stroke={MUSCLE.stroke}
          strokeWidth="0.5"
          opacity="0.7"
          onClick={click("muscle-triceps")}
          className="cursor-pointer hover:brightness-110"
        />
      </g>
      
      {/* Brachialis */}
      <g id="muscle-brachialis" style={getStyle("muscle-brachialis")}>
        {/* Left */}
        <path
          d="M40 50 L35 75 L40 95 L50 100 L55 80 L52 55 Z"
          fill={layerStates["muscle-brachialis"]?.highlightColor || MUSCLE.deep}
          stroke={MUSCLE.stroke}
          strokeWidth="0.4"
          onClick={click("muscle-brachialis")}
          className="cursor-pointer hover:brightness-110"
        />
        {/* Right */}
        <path
          d="M260 50 L265 75 L260 95 L250 100 L245 80 L248 55 Z"
          fill={layerStates["muscle-brachialis"]?.highlightColor || MUSCLE.deep}
          stroke={MUSCLE.stroke}
          strokeWidth="0.4"
          onClick={click("muscle-brachialis")}
          className="cursor-pointer hover:brightness-110"
        />
      </g>
      
      {/* Forearm Flexors */}
      <g id="muscle-forearm-flexors" style={getStyle("muscle-forearm-flexors")}>
        {/* Left forearm flexor group */}
        <path
          d="M38 100 L25 130 L18 180 L22 185 L35 140 L45 105 Z"
          fill={layerStates["muscle-forearm-flexors"]?.highlightColor || MUSCLE.superficial}
          stroke={MUSCLE.stroke}
          strokeWidth="0.5"
          onClick={click("muscle-forearm-flexors")}
          className="cursor-pointer hover:brightness-110"
        />
        {/* Right forearm flexors */}
        <path
          d="M262 100 L275 130 L282 180 L278 185 L265 140 L255 105 Z"
          fill={layerStates["muscle-forearm-flexors"]?.highlightColor || MUSCLE.superficial}
          stroke={MUSCLE.stroke}
          strokeWidth="0.5"
          onClick={click("muscle-forearm-flexors")}
          className="cursor-pointer hover:brightness-110"
        />
      </g>
      
      {/* Forearm Extensors */}
      <g id="muscle-forearm-extensors" style={getStyle("muscle-forearm-extensors")}>
        {/* Left forearm extensors */}
        <path
          d="M48 100 L55 130 L50 175 L45 180 L40 135 L42 105 Z"
          fill={layerStates["muscle-forearm-extensors"]?.highlightColor || MUSCLE.superficial}
          stroke={MUSCLE.stroke}
          strokeWidth="0.5"
          onClick={click("muscle-forearm-extensors")}
          className="cursor-pointer hover:brightness-110"
        />
        {/* Right forearm extensors */}
        <path
          d="M252 100 L245 130 L250 175 L255 180 L260 135 L258 105 Z"
          fill={layerStates["muscle-forearm-extensors"]?.highlightColor || MUSCLE.superficial}
          stroke={MUSCLE.stroke}
          strokeWidth="0.5"
          onClick={click("muscle-forearm-extensors")}
          className="cursor-pointer hover:brightness-110"
        />
      </g>
    </g>
  );
};

// Lower Limb Muscles
const LowerLimbMuscles: React.FC<{
  layerStates: Record<string, LayerState>;
  onLayerClick?: (layerId: string) => void;
  offsetX?: number;
  offsetY?: number;
}> = ({ layerStates, onLayerClick, offsetX = 0, offsetY = 0 }) => {
  const click = (id: string) => (e: React.MouseEvent) => {
    e.stopPropagation();
    onLayerClick?.(id);
  };
  
  const getStyle = (id: string) => getLayerStyle(id, layerStates, { fill: MUSCLE.superficial, stroke: MUSCLE.stroke });
  
  return (
    <g id="lower-limb-muscles" transform={`translate(${offsetX}, ${offsetY})`} filter="url(#muscle-shadow)">
      {/* Quadriceps Femoris */}
      <g id="muscle-quadriceps" style={getStyle("muscle-quadriceps")}>
        {/* Left Rectus Femoris */}
        <path
          d="M100 0 L95 40 L92 100 L95 160 L105 175 L120 170 L125 160 L128 100 L125 40 L115 5 Z"
          fill={layerStates["muscle-quadriceps"]?.highlightColor || "url(#muscle-gradient)"}
          stroke={MUSCLE.stroke}
          strokeWidth="0.6"
          onClick={click("muscle-quadriceps")}
          className="cursor-pointer hover:brightness-110"
        />
        {/* Left Vastus Lateralis */}
        <path
          d="M125 10 L135 20 L142 80 L138 150 L125 170 L125 100 L128 30 Z"
          fill={layerStates["muscle-quadriceps"]?.highlightColor || MUSCLE.superficial}
          stroke={MUSCLE.stroke}
          strokeWidth="0.5"
          onClick={click("muscle-quadriceps")}
          className="cursor-pointer hover:brightness-110"
        />
        {/* Left Vastus Medialis */}
        <path
          d="M95 20 L85 30 L78 100 L82 160 L95 172 L95 100 L92 40 Z"
          fill={layerStates["muscle-quadriceps"]?.highlightColor || MUSCLE.superficial}
          stroke={MUSCLE.stroke}
          strokeWidth="0.5"
          onClick={click("muscle-quadriceps")}
          className="cursor-pointer hover:brightness-110"
        />
        
        {/* Right Rectus Femoris */}
        <path
          d="M200 0 L205 40 L208 100 L205 160 L195 175 L180 170 L175 160 L172 100 L175 40 L185 5 Z"
          fill={layerStates["muscle-quadriceps"]?.highlightColor || "url(#muscle-gradient)"}
          stroke={MUSCLE.stroke}
          strokeWidth="0.6"
          onClick={click("muscle-quadriceps")}
          className="cursor-pointer hover:brightness-110"
        />
        {/* Right Vastus Lateralis */}
        <path
          d="M175 10 L165 20 L158 80 L162 150 L175 170 L175 100 L172 30 Z"
          fill={layerStates["muscle-quadriceps"]?.highlightColor || MUSCLE.superficial}
          stroke={MUSCLE.stroke}
          strokeWidth="0.5"
          onClick={click("muscle-quadriceps")}
          className="cursor-pointer hover:brightness-110"
        />
        {/* Right Vastus Medialis */}
        <path
          d="M205 20 L215 30 L222 100 L218 160 L205 172 L205 100 L208 40 Z"
          fill={layerStates["muscle-quadriceps"]?.highlightColor || MUSCLE.superficial}
          stroke={MUSCLE.stroke}
          strokeWidth="0.5"
          onClick={click("muscle-quadriceps")}
          className="cursor-pointer hover:brightness-110"
        />
      </g>
      
      {/* Adductors */}
      <g id="muscle-adductors" style={getStyle("muscle-adductors")}>
        {/* Left adductor group */}
        <path
          d="M95 10 L80 20 L75 80 L80 140 L95 150 L95 80 Z"
          fill={layerStates["muscle-adductors"]?.highlightColor || MUSCLE.deep}
          stroke={MUSCLE.stroke}
          strokeWidth="0.5"
          onClick={click("muscle-adductors")}
          className="cursor-pointer hover:brightness-110"
        />
        {/* Right adductor group */}
        <path
          d="M205 10 L220 20 L225 80 L220 140 L205 150 L205 80 Z"
          fill={layerStates["muscle-adductors"]?.highlightColor || MUSCLE.deep}
          stroke={MUSCLE.stroke}
          strokeWidth="0.5"
          onClick={click("muscle-adductors")}
          className="cursor-pointer hover:brightness-110"
        />
      </g>
      
      {/* Tibialis Anterior */}
      <g id="muscle-tibialis-ant" style={getStyle("muscle-tibialis-ant")}>
        {/* Left tibialis anterior */}
        <path
          d="M105 190 L100 220 L98 280 L102 320 L112 325 L118 290 L115 230 L110 195 Z"
          fill={layerStates["muscle-tibialis-ant"]?.highlightColor || MUSCLE.superficial}
          stroke={MUSCLE.stroke}
          strokeWidth="0.5"
          onClick={click("muscle-tibialis-ant")}
          className="cursor-pointer hover:brightness-110"
        />
        {/* Right tibialis anterior */}
        <path
          d="M195 190 L200 220 L202 280 L198 320 L188 325 L182 290 L185 230 L190 195 Z"
          fill={layerStates["muscle-tibialis-ant"]?.highlightColor || MUSCLE.superficial}
          stroke={MUSCLE.stroke}
          strokeWidth="0.5"
          onClick={click("muscle-tibialis-ant")}
          className="cursor-pointer hover:brightness-110"
        />
      </g>
      
      {/* Gastrocnemius */}
      <g id="muscle-gastrocnemius" style={getStyle("muscle-gastrocnemius")}>
        {/* Left gastrocnemius */}
        <path
          d="M90 185 L85 220 L88 280 L95 310 L110 315 L118 285 L115 220 L108 190 Z"
          fill={layerStates["muscle-gastrocnemius"]?.highlightColor || "url(#muscle-gradient)"}
          stroke={MUSCLE.stroke}
          strokeWidth="0.6"
          onClick={click("muscle-gastrocnemius")}
          className="cursor-pointer hover:brightness-110"
        />
        {/* Right gastrocnemius */}
        <path
          d="M210 185 L215 220 L212 280 L205 310 L190 315 L182 285 L185 220 L192 190 Z"
          fill={layerStates["muscle-gastrocnemius"]?.highlightColor || "url(#muscle-gradient)"}
          stroke={MUSCLE.stroke}
          strokeWidth="0.6"
          onClick={click("muscle-gastrocnemius")}
          className="cursor-pointer hover:brightness-110"
        />
      </g>
      
      {/* Soleus */}
      <g id="muscle-soleus" style={getStyle("muscle-soleus")}>
        {/* Left soleus */}
        <path
          d="M92 275 L90 310 L95 340 L105 345 L110 320 L108 280 Z"
          fill={layerStates["muscle-soleus"]?.highlightColor || MUSCLE.deep}
          stroke={MUSCLE.stroke}
          strokeWidth="0.4"
          onClick={click("muscle-soleus")}
          className="cursor-pointer hover:brightness-110"
        />
        {/* Right soleus */}
        <path
          d="M208 275 L210 310 L205 340 L195 345 L190 320 L192 280 Z"
          fill={layerStates["muscle-soleus"]?.highlightColor || MUSCLE.deep}
          stroke={MUSCLE.stroke}
          strokeWidth="0.4"
          onClick={click("muscle-soleus")}
          className="cursor-pointer hover:brightness-110"
        />
      </g>
    </g>
  );
};

// Main Muscular System Component
export const MuscularSystemSVG: React.FC<MuscularSystemProps> = ({
  viewType,
  layerStates,
  onLayerClick,
  showLabels = true,
}) => {
  return (
    <svg 
      viewBox="0 0 300 850" 
      className="w-full h-full"
      style={{ background: "transparent" }}
    >
      <AnatomySVGDefs />
      
      {viewType === "anterior" && (
        <g id="muscular-anterior">
          <HeadNeckMuscles 
            layerStates={layerStates} 
            onLayerClick={onLayerClick}
            offsetX={0}
            offsetY={0}
          />
          
          <ThoracicMuscles
            layerStates={layerStates}
            onLayerClick={onLayerClick}
            offsetX={0}
            offsetY={200}
          />
          
          <AbdominalMuscles
            layerStates={layerStates}
            onLayerClick={onLayerClick}
            offsetX={0}
            offsetY={300}
          />
          
          <UpperLimbMuscles
            layerStates={layerStates}
            onLayerClick={onLayerClick}
            offsetX={0}
            offsetY={200}
          />
          
          <LowerLimbMuscles
            layerStates={layerStates}
            onLayerClick={onLayerClick}
            offsetX={0}
            offsetY={430}
          />
          
          {/* Labels */}
          {showLabels && (
            <g id="muscular-labels" style={{ pointerEvents: "none" }}>
              <AnatomyLabel x={220} y={140} text="SCM" latinName="Sternocleidomastoid" size="small"/>
              <AnatomyLabel x={5} y={240} text="Deltoid" latinName="M. deltoideus" size="small"/>
              <AnatomyLabel x={220} y={270} text="Pectoralis" latinName="M. pectoralis major" size="small"/>
              <AnatomyLabel x={5} y={310} text="Biceps" latinName="M. biceps brachii" size="small"/>
              <AnatomyLabel x={220} y={380} text="Rectus abdominis" size="small"/>
              <AnatomyLabel x={5} y={520} text="Quadriceps" latinName="M. quadriceps femoris" size="small"/>
              <AnatomyLabel x={220} y={700} text="Tibialis anterior" size="small"/>
              <AnatomyLabel x={5} y={750} text="Gastrocnemius" size="small"/>
            </g>
          )}
        </g>
      )}
    </svg>
  );
};

export default MuscularSystemSVG;
