/**
 * Layered Anatomy SVG Component
 * Renders anatomically correct vector illustrations with individual layer control
 * Each structure is a separate layer that can be shown/hidden/highlighted
 */

import React from "react";
import { LayerState } from "./LayerControls";

interface LayeredAnatomySVGProps {
  systemId: string;
  viewType: "anterior" | "posterior" | "lateral" | "detail";
  layerStates: Record<string, LayerState>;
  onLayerClick?: (layerId: string) => void;
  className?: string;
}

// Medical color palette
const COLORS = {
  bone: { fill: "#FFFEF0", stroke: "#D2B48C", shadow: "#F5F5DC" },
  muscle: { fill: "#CD5C5C", stroke: "#8B0000" },
  nerve: { fill: "#FFD700", stroke: "#DAA520" },
  artery: { fill: "#DC143C", stroke: "#8B0000" },
  vein: { fill: "#4169E1", stroke: "#191970" },
  organ: { fill: "#DEB887", stroke: "#8B4513" },
  cartilage: { fill: "#E0E0E0", stroke: "#A0A0A0" },
  skin: { fill: "#F5DEB3", stroke: "#CD853F" },
  lymph: { fill: "#98FB98", stroke: "#228B22" },
  gland: { fill: "#DDA0DD", stroke: "#8B008B" },
};

// Helper to get layer style
function getLayerStyle(layerId: string, layerStates: Record<string, LayerState>) {
  const state = layerStates[layerId];
  if (!state) return { display: "block", opacity: 1, fill: undefined };
  
  return {
    display: state.visible ? "block" : "none",
    opacity: state.opacity,
    fill: state.highlightColor || undefined,
  };
}

// Skeletal System Full Body Anterior View
export const SkeletalAnteriorSVG: React.FC<{
  layerStates: Record<string, LayerState>;
  onLayerClick?: (layerId: string) => void;
}> = ({ layerStates, onLayerClick }) => {
  const handleClick = (layerId: string) => (e: React.MouseEvent) => {
    e.stopPropagation();
    onLayerClick?.(layerId);
  };

  return (
    <svg viewBox="0 0 300 600" className="w-full h-full">
      <defs>
        <filter id="bone-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0.5" dy="0.5" stdDeviation="1" floodOpacity="0.2"/>
        </filter>
      </defs>

      {/* Skull Group */}
      <g id="skull-group" filter="url(#bone-shadow)">
        {/* Frontal Bone */}
        <path
          id="skull-frontal"
          d="M115 20 Q150 5 185 20 Q200 35 200 50 L200 65 L100 65 L100 50 Q100 35 115 20"
          style={getLayerStyle("skull-frontal", layerStates)}
          fill={layerStates["skull-frontal"]?.highlightColor || COLORS.bone.fill}
          stroke={COLORS.bone.stroke}
          strokeWidth="1"
          onClick={handleClick("skull-frontal")}
          className="cursor-pointer hover:brightness-110 transition-all"
        />
        
        {/* Parietal Bones */}
        <g id="skull-parietal" style={getLayerStyle("skull-parietal", layerStates)}>
          <path
            d="M100 50 Q90 30 95 15 Q110 0 150 0 Q190 0 205 15 Q210 30 200 50"
            fill={layerStates["skull-parietal"]?.highlightColor || COLORS.bone.fill}
            stroke={COLORS.bone.stroke}
            strokeWidth="1"
            onClick={handleClick("skull-parietal")}
            className="cursor-pointer hover:brightness-110"
          />
        </g>

        {/* Temporal Bones */}
        <g id="skull-temporal" style={getLayerStyle("skull-temporal", layerStates)}>
          <ellipse
            cx="95" cy="55"
            rx="12" ry="20"
            fill={layerStates["skull-temporal"]?.highlightColor || COLORS.bone.fill}
            stroke={COLORS.bone.stroke}
            strokeWidth="1"
            onClick={handleClick("skull-temporal")}
            className="cursor-pointer hover:brightness-110"
          />
          <ellipse
            cx="205" cy="55"
            rx="12" ry="20"
            fill={layerStates["skull-temporal"]?.highlightColor || COLORS.bone.fill}
            stroke={COLORS.bone.stroke}
            strokeWidth="1"
            onClick={handleClick("skull-temporal")}
            className="cursor-pointer hover:brightness-110"
          />
        </g>
      </g>

      {/* Facial Bones Group */}
      <g id="facial-group" filter="url(#bone-shadow)">
        {/* Maxilla */}
        <path
          id="facial-maxilla"
          d="M120 85 Q150 80 180 85 L185 105 Q150 115 115 105 Z"
          style={getLayerStyle("facial-maxilla", layerStates)}
          fill={layerStates["facial-maxilla"]?.highlightColor || COLORS.bone.fill}
          stroke={COLORS.bone.stroke}
          strokeWidth="1"
          onClick={handleClick("facial-maxilla")}
          className="cursor-pointer hover:brightness-110"
        />

        {/* Mandible */}
        <path
          id="facial-mandible"
          d="M110 110 Q150 130 190 110 L195 135 Q190 145 180 148 L150 150 L120 148 Q110 145 105 135 Z"
          style={getLayerStyle("facial-mandible", layerStates)}
          fill={layerStates["facial-mandible"]?.highlightColor || COLORS.bone.fill}
          stroke={COLORS.bone.stroke}
          strokeWidth="1"
          onClick={handleClick("facial-mandible")}
          className="cursor-pointer hover:brightness-110"
        />

        {/* Zygomatic Bones */}
        <g id="facial-zygomatic" style={getLayerStyle("facial-zygomatic", layerStates)}>
          <ellipse
            cx="105" cy="78"
            rx="15" ry="10"
            fill={layerStates["facial-zygomatic"]?.highlightColor || COLORS.bone.fill}
            stroke={COLORS.bone.stroke}
            onClick={handleClick("facial-zygomatic")}
            className="cursor-pointer hover:brightness-110"
          />
          <ellipse
            cx="195" cy="78"
            rx="15" ry="10"
            fill={layerStates["facial-zygomatic"]?.highlightColor || COLORS.bone.fill}
            stroke={COLORS.bone.stroke}
            onClick={handleClick("facial-zygomatic")}
            className="cursor-pointer hover:brightness-110"
          />
        </g>

        {/* Nasal Bones */}
        <path
          id="facial-nasal"
          d="M145 65 L150 60 L155 65 L155 85 L150 92 L145 85 Z"
          style={getLayerStyle("facial-nasal", layerStates)}
          fill={layerStates["facial-nasal"]?.highlightColor || COLORS.bone.fill}
          stroke={COLORS.bone.stroke}
          onClick={handleClick("facial-nasal")}
          className="cursor-pointer hover:brightness-110"
        />
      </g>

      {/* Vertebral Column */}
      <g id="vertebral-column-group" filter="url(#bone-shadow)">
        {/* Cervical Vertebrae C1-C7 */}
        <g id="vertebra-c1" style={getLayerStyle("vertebra-c1", layerStates)}>
          {[0, 8, 16, 24, 32, 40, 48].map((y, i) => (
            <rect
              key={`c${i+1}`}
              x="143" y={155 + y}
              width="14" height="6"
              rx="2"
              fill={layerStates["vertebra-c1"]?.highlightColor || COLORS.bone.fill}
              stroke={COLORS.bone.stroke}
              strokeWidth="0.5"
              onClick={handleClick("vertebra-c1")}
              className="cursor-pointer hover:brightness-110"
            />
          ))}
        </g>

        {/* Thoracic Vertebrae */}
        <g id="vertebra-thoracic" style={getLayerStyle("vertebra-thoracic", layerStates)}>
          {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110].map((y, i) => (
            <rect
              key={`t${i+1}`}
              x="141" y={210 + y}
              width="18" height="8"
              rx="2"
              fill={layerStates["vertebra-thoracic"]?.highlightColor || COLORS.bone.fill}
              stroke={COLORS.bone.stroke}
              strokeWidth="0.5"
              onClick={handleClick("vertebra-thoracic")}
              className="cursor-pointer hover:brightness-110"
            />
          ))}
        </g>

        {/* Lumbar Vertebrae */}
        <g id="vertebra-lumbar" style={getLayerStyle("vertebra-lumbar", layerStates)}>
          {[0, 14, 28, 42, 56].map((y, i) => (
            <rect
              key={`l${i+1}`}
              x="138" y={335 + y}
              width="24" height="12"
              rx="3"
              fill={layerStates["vertebra-lumbar"]?.highlightColor || COLORS.bone.fill}
              stroke={COLORS.bone.stroke}
              strokeWidth="0.5"
              onClick={handleClick("vertebra-lumbar")}
              className="cursor-pointer hover:brightness-110"
            />
          ))}
        </g>

        {/* Sacrum */}
        <path
          id="vertebra-sacrum"
          d="M135 410 L150 450 L165 410 Z"
          style={getLayerStyle("vertebra-sacrum", layerStates)}
          fill={layerStates["vertebra-sacrum"]?.highlightColor || COLORS.bone.fill}
          stroke={COLORS.bone.stroke}
          onClick={handleClick("vertebra-sacrum")}
          className="cursor-pointer hover:brightness-110"
        />

        {/* Coccyx */}
        <ellipse
          id="vertebra-coccyx"
          cx="150" cy="460"
          rx="8" ry="12"
          style={getLayerStyle("vertebra-coccyx", layerStates)}
          fill={layerStates["vertebra-coccyx"]?.highlightColor || COLORS.bone.fill}
          stroke={COLORS.bone.stroke}
          onClick={handleClick("vertebra-coccyx")}
          className="cursor-pointer hover:brightness-110"
        />
      </g>

      {/* Thoracic Cage */}
      <g id="thoracic-cage-group" filter="url(#bone-shadow)">
        {/* Sternum */}
        <g id="sternum-group">
          <rect
            id="sternum-manubrium"
            x="142" y="205"
            width="16" height="25"
            rx="3"
            style={getLayerStyle("sternum-manubrium", layerStates)}
            fill={layerStates["sternum-manubrium"]?.highlightColor || COLORS.bone.fill}
            stroke={COLORS.bone.stroke}
            onClick={handleClick("sternum-manubrium")}
            className="cursor-pointer hover:brightness-110"
          />
          <rect
            id="sternum-body"
            x="143" y="230"
            width="14" height="60"
            rx="2"
            style={getLayerStyle("sternum-body", layerStates)}
            fill={layerStates["sternum-body"]?.highlightColor || COLORS.bone.fill}
            stroke={COLORS.bone.stroke}
            onClick={handleClick("sternum-body")}
            className="cursor-pointer hover:brightness-110"
          />
          <ellipse
            id="sternum-xiphoid"
            cx="150" cy="298"
            rx="5" ry="10"
            style={getLayerStyle("sternum-xiphoid", layerStates)}
            fill={layerStates["sternum-xiphoid"]?.highlightColor || COLORS.bone.fill}
            stroke={COLORS.bone.stroke}
            onClick={handleClick("sternum-xiphoid")}
            className="cursor-pointer hover:brightness-110"
          />
        </g>

        {/* Ribs - True (1-7) */}
        <g id="ribs-true" style={getLayerStyle("ribs-true", layerStates)}>
          {[0, 15, 30, 45, 60, 75, 90].map((y, i) => (
            <g key={`rib-true-${i}`}>
              <path
                d={`M142 ${215 + y} Q${100 - i * 3} ${220 + y} ${85 - i * 2} ${230 + y}`}
                fill="none"
                stroke={layerStates["ribs-true"]?.highlightColor || COLORS.bone.stroke}
                strokeWidth="3"
                strokeLinecap="round"
                onClick={handleClick("ribs-true")}
                className="cursor-pointer hover:brightness-110"
              />
              <path
                d={`M158 ${215 + y} Q${200 + i * 3} ${220 + y} ${215 + i * 2} ${230 + y}`}
                fill="none"
                stroke={layerStates["ribs-true"]?.highlightColor || COLORS.bone.stroke}
                strokeWidth="3"
                strokeLinecap="round"
                onClick={handleClick("ribs-true")}
                className="cursor-pointer hover:brightness-110"
              />
            </g>
          ))}
        </g>

        {/* Ribs - False (8-10) */}
        <g id="ribs-false" style={getLayerStyle("ribs-false", layerStates)}>
          {[105, 118, 131].map((y, i) => (
            <g key={`rib-false-${i}`}>
              <path
                d={`M142 ${215 + y} Q${90 - i * 4} ${220 + y} ${72 - i * 3} ${235 + y}`}
                fill="none"
                stroke={layerStates["ribs-false"]?.highlightColor || COLORS.bone.stroke}
                strokeWidth="2.5"
                strokeLinecap="round"
                onClick={handleClick("ribs-false")}
                className="cursor-pointer hover:brightness-110"
              />
              <path
                d={`M158 ${215 + y} Q${210 + i * 4} ${220 + y} ${228 + i * 3} ${235 + y}`}
                fill="none"
                stroke={layerStates["ribs-false"]?.highlightColor || COLORS.bone.stroke}
                strokeWidth="2.5"
                strokeLinecap="round"
                onClick={handleClick("ribs-false")}
                className="cursor-pointer hover:brightness-110"
              />
            </g>
          ))}
        </g>

        {/* Ribs - Floating (11-12) */}
        <g id="ribs-floating" style={getLayerStyle("ribs-floating", layerStates)}>
          {[144, 155].map((y, i) => (
            <g key={`rib-floating-${i}`}>
              <path
                d={`M140 ${215 + y} Q${95 - i * 5} ${220 + y} ${85 - i * 5} ${225 + y}`}
                fill="none"
                stroke={layerStates["ribs-floating"]?.highlightColor || COLORS.bone.stroke}
                strokeWidth="2"
                strokeLinecap="round"
                onClick={handleClick("ribs-floating")}
                className="cursor-pointer hover:brightness-110"
              />
              <path
                d={`M160 ${215 + y} Q${205 + i * 5} ${220 + y} ${215 + i * 5} ${225 + y}`}
                fill="none"
                stroke={layerStates["ribs-floating"]?.highlightColor || COLORS.bone.stroke}
                strokeWidth="2"
                strokeLinecap="round"
                onClick={handleClick("ribs-floating")}
                className="cursor-pointer hover:brightness-110"
              />
            </g>
          ))}
        </g>
      </g>

      {/* Upper Limb Bones */}
      <g id="upper-limb-group" filter="url(#bone-shadow)">
        {/* Clavicle */}
        <g id="bone-clavicle" style={getLayerStyle("bone-clavicle", layerStates)}>
          <path
            d="M100 200 Q125 192 150 195"
            fill="none"
            stroke={layerStates["bone-clavicle"]?.highlightColor || COLORS.bone.stroke}
            strokeWidth="5"
            strokeLinecap="round"
            onClick={handleClick("bone-clavicle")}
            className="cursor-pointer hover:brightness-110"
          />
          <path
            d="M200 200 Q175 192 150 195"
            fill="none"
            stroke={layerStates["bone-clavicle"]?.highlightColor || COLORS.bone.stroke}
            strokeWidth="5"
            strokeLinecap="round"
            onClick={handleClick("bone-clavicle")}
            className="cursor-pointer hover:brightness-110"
          />
        </g>

        {/* Scapula */}
        <g id="bone-scapula" style={getLayerStyle("bone-scapula", layerStates)}>
          <path
            d="M75 205 L65 260 L90 280 L105 235 Z"
            fill={layerStates["bone-scapula"]?.highlightColor || COLORS.bone.fill}
            stroke={COLORS.bone.stroke}
            opacity="0.7"
            onClick={handleClick("bone-scapula")}
            className="cursor-pointer hover:brightness-110"
          />
          <path
            d="M225 205 L235 260 L210 280 L195 235 Z"
            fill={layerStates["bone-scapula"]?.highlightColor || COLORS.bone.fill}
            stroke={COLORS.bone.stroke}
            opacity="0.7"
            onClick={handleClick("bone-scapula")}
            className="cursor-pointer hover:brightness-110"
          />
        </g>

        {/* Humerus */}
        <g id="bone-humerus" style={getLayerStyle("bone-humerus", layerStates)}>
          <path
            d="M78 210 L55 320"
            fill="none"
            stroke={layerStates["bone-humerus"]?.highlightColor || COLORS.bone.stroke}
            strokeWidth="8"
            strokeLinecap="round"
            onClick={handleClick("bone-humerus")}
            className="cursor-pointer hover:brightness-110"
          />
          <circle
            cx="78" cy="212"
            r="12"
            fill={layerStates["bone-humerus"]?.highlightColor || COLORS.bone.fill}
            stroke={COLORS.bone.stroke}
            onClick={handleClick("bone-humerus")}
            className="cursor-pointer hover:brightness-110"
          />
          <path
            d="M222 210 L245 320"
            fill="none"
            stroke={layerStates["bone-humerus"]?.highlightColor || COLORS.bone.stroke}
            strokeWidth="8"
            strokeLinecap="round"
            onClick={handleClick("bone-humerus")}
            className="cursor-pointer hover:brightness-110"
          />
          <circle
            cx="222" cy="212"
            r="12"
            fill={layerStates["bone-humerus"]?.highlightColor || COLORS.bone.fill}
            stroke={COLORS.bone.stroke}
            onClick={handleClick("bone-humerus")}
            className="cursor-pointer hover:brightness-110"
          />
        </g>

        {/* Radius */}
        <g id="bone-radius" style={getLayerStyle("bone-radius", layerStates)}>
          <path
            d="M52 325 L38 410"
            fill="none"
            stroke={layerStates["bone-radius"]?.highlightColor || COLORS.bone.stroke}
            strokeWidth="5"
            strokeLinecap="round"
            onClick={handleClick("bone-radius")}
            className="cursor-pointer hover:brightness-110"
          />
          <path
            d="M248 325 L262 410"
            fill="none"
            stroke={layerStates["bone-radius"]?.highlightColor || COLORS.bone.stroke}
            strokeWidth="5"
            strokeLinecap="round"
            onClick={handleClick("bone-radius")}
            className="cursor-pointer hover:brightness-110"
          />
        </g>

        {/* Ulna */}
        <g id="bone-ulna" style={getLayerStyle("bone-ulna", layerStates)}>
          <path
            d="M58 325 L48 410"
            fill="none"
            stroke={layerStates["bone-ulna"]?.highlightColor || COLORS.bone.stroke}
            strokeWidth="4"
            strokeLinecap="round"
            onClick={handleClick("bone-ulna")}
            className="cursor-pointer hover:brightness-110"
          />
          <path
            d="M242 325 L252 410"
            fill="none"
            stroke={layerStates["bone-ulna"]?.highlightColor || COLORS.bone.stroke}
            strokeWidth="4"
            strokeLinecap="round"
            onClick={handleClick("bone-ulna")}
            className="cursor-pointer hover:brightness-110"
          />
        </g>

        {/* Carpal Bones */}
        <g id="bone-carpals" style={getLayerStyle("bone-carpals", layerStates)}>
          <rect
            x="32" y="412"
            width="22" height="15"
            rx="3"
            fill={layerStates["bone-carpals"]?.highlightColor || COLORS.bone.fill}
            stroke={COLORS.bone.stroke}
            onClick={handleClick("bone-carpals")}
            className="cursor-pointer hover:brightness-110"
          />
          <rect
            x="246" y="412"
            width="22" height="15"
            rx="3"
            fill={layerStates["bone-carpals"]?.highlightColor || COLORS.bone.fill}
            stroke={COLORS.bone.stroke}
            onClick={handleClick("bone-carpals")}
            className="cursor-pointer hover:brightness-110"
          />
        </g>

        {/* Metacarpals */}
        <g id="bone-metacarpals" style={getLayerStyle("bone-metacarpals", layerStates)}>
          {[0, 4, 8, 12, 16].map((x, i) => (
            <g key={`metacarpal-${i}`}>
              <line
                x1={33 + x} y1="428"
                x2={30 + x + (i - 2) * 2} y2="455"
                stroke={layerStates["bone-metacarpals"]?.highlightColor || COLORS.bone.stroke}
                strokeWidth="2"
                strokeLinecap="round"
                onClick={handleClick("bone-metacarpals")}
                className="cursor-pointer hover:brightness-110"
              />
              <line
                x1={267 - x} y1="428"
                x2={270 - x + (2 - i) * 2} y2="455"
                stroke={layerStates["bone-metacarpals"]?.highlightColor || COLORS.bone.stroke}
                strokeWidth="2"
                strokeLinecap="round"
                onClick={handleClick("bone-metacarpals")}
                className="cursor-pointer hover:brightness-110"
              />
            </g>
          ))}
        </g>

        {/* Phalanges Hand */}
        <g id="bone-phalanges-hand" style={getLayerStyle("bone-phalanges-hand", layerStates)}>
          {[0, 4, 8, 12, 16].map((x, i) => (
            <g key={`phalanx-${i}`}>
              <line
                x1={30 + x + (i - 2) * 2} y1="456"
                x2={28 + x + (i - 2) * 3} y2="478"
                stroke={layerStates["bone-phalanges-hand"]?.highlightColor || COLORS.bone.stroke}
                strokeWidth="1.5"
                strokeLinecap="round"
                onClick={handleClick("bone-phalanges-hand")}
                className="cursor-pointer hover:brightness-110"
              />
              <line
                x1={270 - x + (2 - i) * 2} y1="456"
                x2={272 - x + (2 - i) * 3} y2="478"
                stroke={layerStates["bone-phalanges-hand"]?.highlightColor || COLORS.bone.stroke}
                strokeWidth="1.5"
                strokeLinecap="round"
                onClick={handleClick("bone-phalanges-hand")}
                className="cursor-pointer hover:brightness-110"
              />
            </g>
          ))}
        </g>
      </g>

      {/* Pelvic Girdle */}
      <g id="pelvis-group" filter="url(#bone-shadow)">
        {/* Ilium */}
        <g id="pelvis-ilium" style={getLayerStyle("pelvis-ilium", layerStates)}>
          <path
            d="M90 405 Q75 380 85 355 Q105 330 150 340 Q195 330 215 355 Q225 380 210 405"
            fill={layerStates["pelvis-ilium"]?.highlightColor || COLORS.bone.fill}
            stroke={COLORS.bone.stroke}
            onClick={handleClick("pelvis-ilium")}
            className="cursor-pointer hover:brightness-110"
          />
        </g>

        {/* Ischium */}
        <g id="pelvis-ischium" style={getLayerStyle("pelvis-ischium", layerStates)}>
          <path
            d="M100 430 Q95 450 105 460 L120 455"
            fill={layerStates["pelvis-ischium"]?.highlightColor || COLORS.bone.fill}
            stroke={COLORS.bone.stroke}
            strokeWidth="8"
            strokeLinecap="round"
            onClick={handleClick("pelvis-ischium")}
            className="cursor-pointer hover:brightness-110"
          />
          <path
            d="M200 430 Q205 450 195 460 L180 455"
            fill={layerStates["pelvis-ischium"]?.highlightColor || COLORS.bone.fill}
            stroke={COLORS.bone.stroke}
            strokeWidth="8"
            strokeLinecap="round"
            onClick={handleClick("pelvis-ischium")}
            className="cursor-pointer hover:brightness-110"
          />
        </g>

        {/* Pubis */}
        <g id="pelvis-pubis" style={getLayerStyle("pelvis-pubis", layerStates)}>
          <path
            d="M120 455 Q150 470 180 455"
            fill="none"
            stroke={layerStates["pelvis-pubis"]?.highlightColor || COLORS.bone.stroke}
            strokeWidth="6"
            strokeLinecap="round"
            onClick={handleClick("pelvis-pubis")}
            className="cursor-pointer hover:brightness-110"
          />
        </g>

        {/* Acetabulum */}
        <g id="pelvis-acetabulum" style={getLayerStyle("pelvis-acetabulum", layerStates)}>
          <circle
            cx="108" cy="425"
            r="18"
            fill={layerStates["pelvis-acetabulum"]?.highlightColor || COLORS.bone.shadow}
            stroke={COLORS.bone.stroke}
            strokeWidth="2"
            onClick={handleClick("pelvis-acetabulum")}
            className="cursor-pointer hover:brightness-110"
          />
          <circle
            cx="192" cy="425"
            r="18"
            fill={layerStates["pelvis-acetabulum"]?.highlightColor || COLORS.bone.shadow}
            stroke={COLORS.bone.stroke}
            strokeWidth="2"
            onClick={handleClick("pelvis-acetabulum")}
            className="cursor-pointer hover:brightness-110"
          />
        </g>
      </g>

      {/* Lower Limb Bones */}
      <g id="lower-limb-group" filter="url(#bone-shadow)">
        {/* Femur */}
        <g id="bone-femur" style={getLayerStyle("bone-femur", layerStates)}>
          <circle
            cx="108" cy="430"
            r="10"
            fill={layerStates["bone-femur"]?.highlightColor || COLORS.bone.fill}
            stroke={COLORS.bone.stroke}
            onClick={handleClick("bone-femur")}
            className="cursor-pointer hover:brightness-110"
          />
          <path
            d="M108 440 L105 520"
            fill="none"
            stroke={layerStates["bone-femur"]?.highlightColor || COLORS.bone.stroke}
            strokeWidth="10"
            strokeLinecap="round"
            onClick={handleClick("bone-femur")}
            className="cursor-pointer hover:brightness-110"
          />
          <circle
            cx="192" cy="430"
            r="10"
            fill={layerStates["bone-femur"]?.highlightColor || COLORS.bone.fill}
            stroke={COLORS.bone.stroke}
            onClick={handleClick("bone-femur")}
            className="cursor-pointer hover:brightness-110"
          />
          <path
            d="M192 440 L195 520"
            fill="none"
            stroke={layerStates["bone-femur"]?.highlightColor || COLORS.bone.stroke}
            strokeWidth="10"
            strokeLinecap="round"
            onClick={handleClick("bone-femur")}
            className="cursor-pointer hover:brightness-110"
          />
        </g>

        {/* Patella */}
        <g id="bone-patella" style={getLayerStyle("bone-patella", layerStates)}>
          <ellipse
            cx="105" cy="525"
            rx="10" ry="12"
            fill={layerStates["bone-patella"]?.highlightColor || COLORS.bone.fill}
            stroke={COLORS.bone.stroke}
            strokeWidth="1.5"
            onClick={handleClick("bone-patella")}
            className="cursor-pointer hover:brightness-110"
          />
          <ellipse
            cx="195" cy="525"
            rx="10" ry="12"
            fill={layerStates["bone-patella"]?.highlightColor || COLORS.bone.fill}
            stroke={COLORS.bone.stroke}
            strokeWidth="1.5"
            onClick={handleClick("bone-patella")}
            className="cursor-pointer hover:brightness-110"
          />
        </g>

        {/* Tibia */}
        <g id="bone-tibia" style={getLayerStyle("bone-tibia", layerStates)}>
          <path
            d="M105 538 L102 590"
            fill="none"
            stroke={layerStates["bone-tibia"]?.highlightColor || COLORS.bone.stroke}
            strokeWidth="7"
            strokeLinecap="round"
            onClick={handleClick("bone-tibia")}
            className="cursor-pointer hover:brightness-110"
          />
          <path
            d="M195 538 L198 590"
            fill="none"
            stroke={layerStates["bone-tibia"]?.highlightColor || COLORS.bone.stroke}
            strokeWidth="7"
            strokeLinecap="round"
            onClick={handleClick("bone-tibia")}
            className="cursor-pointer hover:brightness-110"
          />
        </g>

        {/* Fibula */}
        <g id="bone-fibula" style={getLayerStyle("bone-fibula", layerStates)}>
          <path
            d="M115 540 L118 588"
            fill="none"
            stroke={layerStates["bone-fibula"]?.highlightColor || COLORS.bone.stroke}
            strokeWidth="3"
            strokeLinecap="round"
            onClick={handleClick("bone-fibula")}
            className="cursor-pointer hover:brightness-110"
          />
          <path
            d="M185 540 L182 588"
            fill="none"
            stroke={layerStates["bone-fibula"]?.highlightColor || COLORS.bone.stroke}
            strokeWidth="3"
            strokeLinecap="round"
            onClick={handleClick("bone-fibula")}
            className="cursor-pointer hover:brightness-110"
          />
        </g>

        {/* Tarsal Bones */}
        <g id="bone-tarsals" style={getLayerStyle("bone-tarsals", layerStates)}>
          <ellipse
            cx="105" cy="595"
            rx="15" ry="8"
            fill={layerStates["bone-tarsals"]?.highlightColor || COLORS.bone.fill}
            stroke={COLORS.bone.stroke}
            onClick={handleClick("bone-tarsals")}
            className="cursor-pointer hover:brightness-110"
          />
          <ellipse
            cx="195" cy="595"
            rx="15" ry="8"
            fill={layerStates["bone-tarsals"]?.highlightColor || COLORS.bone.fill}
            stroke={COLORS.bone.stroke}
            onClick={handleClick("bone-tarsals")}
            className="cursor-pointer hover:brightness-110"
          />
        </g>
      </g>
    </svg>
  );
};

// Export main component that switches between system views
export const LayeredAnatomySVG: React.FC<LayeredAnatomySVGProps> = ({
  systemId,
  viewType,
  layerStates,
  onLayerClick,
  className,
}) => {
  // For now, we render the skeletal anterior view
  // This can be extended to support all 12 systems
  return (
    <div className={className}>
      <SkeletalAnteriorSVG 
        layerStates={layerStates} 
        onLayerClick={onLayerClick}
      />
    </div>
  );
};
