/**
 * Skeletal System - Medical Atlas Quality SVG
 * Anatomically accurate bone illustrations with individual structure selection
 */

import React from "react";
import { AnatomySVGDefs, AnatomyLayer, AnatomyLabel, LeaderLine, getLayerStyle, LayerState } from "./SVGHelpers";
import { ANATOMY_COLORS } from "./AnatomyColors";

interface SkeletalSystemProps {
  viewType: "anterior" | "posterior" | "lateral";
  layerStates: Record<string, LayerState>;
  onLayerClick?: (layerId: string) => void;
  showLabels?: boolean;
}

const BONE = ANATOMY_COLORS.bone;

// Skull Anterior View Component
const SkullAnterior: React.FC<{
  layerStates: Record<string, LayerState>;
  onLayerClick?: (layerId: string) => void;
  offsetX?: number;
  offsetY?: number;
}> = ({ layerStates, onLayerClick, offsetX = 0, offsetY = 0 }) => {
  const click = (id: string) => (e: React.MouseEvent) => {
    e.stopPropagation();
    onLayerClick?.(id);
  };
  
  const getStyle = (id: string) => getLayerStyle(id, layerStates, { fill: BONE.cortical, stroke: BONE.stroke });
  
  return (
    <g id="skull-group" transform={`translate(${offsetX}, ${offsetY})`} filter="url(#bone-shadow)">
      {/* Frontal Bone - Forms forehead */}
      <path
        id="skull-frontal"
        d="M110 28 
           C115 18, 130 10, 150 8 
           C170 10, 185 18, 190 28 
           L195 38 
           C198 48, 198 60, 195 70 
           L190 75 
           L110 75 
           L105 70 
           C102 60, 102 48, 105 38 
           Z"
        style={getStyle("skull-frontal")}
        fill={layerStates["skull-frontal"]?.highlightColor || "url(#bone-gradient)"}
        stroke={BONE.stroke}
        strokeWidth="0.8"
        onClick={click("skull-frontal")}
        className="cursor-pointer hover:brightness-110 transition-all"
      />
      
      {/* Supraorbital Ridge - Brow ridge */}
      <path
        id="skull-supraorbital"
        d="M112 73 Q130 68 150 67 Q170 68 188 73 L186 78 Q170 74 150 73 Q130 74 114 78 Z"
        style={getStyle("skull-supraorbital")}
        fill={layerStates["skull-supraorbital"]?.highlightColor || BONE.cortical}
        stroke={BONE.stroke}
        strokeWidth="0.6"
        onClick={click("skull-supraorbital")}
        className="cursor-pointer hover:brightness-110"
      />
      
      {/* Parietal Bones - Top of skull (visible portion) */}
      <g id="skull-parietal" style={getStyle("skull-parietal")}>
        <path
          d="M105 28 C102 20, 110 8, 125 4 L150 2 L175 4 C190 8, 198 20, 195 28 L190 28 C187 20, 178 12, 165 9 L150 8 L135 9 C122 12, 113 20, 110 28 Z"
          fill={layerStates["skull-parietal"]?.highlightColor || BONE.cortical}
          stroke={BONE.stroke}
          strokeWidth="0.6"
          onClick={click("skull-parietal")}
          className="cursor-pointer hover:brightness-110"
        />
      </g>
      
      {/* Temporal Bones - Sides of skull */}
      <g id="skull-temporal" style={getStyle("skull-temporal")}>
        {/* Left temporal */}
        <path
          d="M100 45 C95 40, 92 48, 90 58 C88 70, 90 82, 95 90 L100 88 L108 75 L105 60 L100 45"
          fill={layerStates["skull-temporal"]?.highlightColor || BONE.cortical}
          stroke={BONE.stroke}
          strokeWidth="0.6"
          onClick={click("skull-temporal")}
          className="cursor-pointer hover:brightness-110"
        />
        {/* Right temporal */}
        <path
          d="M200 45 C205 40, 208 48, 210 58 C212 70, 210 82, 205 90 L200 88 L192 75 L195 60 L200 45"
          fill={layerStates["skull-temporal"]?.highlightColor || BONE.cortical}
          stroke={BONE.stroke}
          strokeWidth="0.6"
          onClick={click("skull-temporal")}
          className="cursor-pointer hover:brightness-110"
        />
        {/* Zygomatic processes */}
        <path
          d="M95 88 L85 95 L80 92 L78 85 C78 82, 82 80, 88 82 L95 88"
          fill={layerStates["skull-temporal"]?.highlightColor || BONE.cortical}
          stroke={BONE.stroke}
          strokeWidth="0.5"
          onClick={click("skull-temporal")}
          className="cursor-pointer hover:brightness-110"
        />
        <path
          d="M205 88 L215 95 L220 92 L222 85 C222 82, 218 80, 212 82 L205 88"
          fill={layerStates["skull-temporal"]?.highlightColor || BONE.cortical}
          stroke={BONE.stroke}
          strokeWidth="0.5"
          onClick={click("skull-temporal")}
          className="cursor-pointer hover:brightness-110"
        />
      </g>
      
      {/* Orbital Cavities */}
      <g id="orbital-cavities">
        {/* Left orbit */}
        <ellipse
          cx="125" cy="88"
          rx="18" ry="14"
          fill="#1a1a1a"
          stroke={BONE.stroke}
          strokeWidth="0.8"
        />
        {/* Right orbit */}
        <ellipse
          cx="175" cy="88"
          rx="18" ry="14"
          fill="#1a1a1a"
          stroke={BONE.stroke}
          strokeWidth="0.8"
        />
      </g>
      
      {/* Nasal Bones */}
      <path
        id="facial-nasal"
        d="M145 78 L150 72 L155 78 L155 98 Q152 105 150 108 Q148 105 145 98 Z"
        style={getStyle("facial-nasal")}
        fill={layerStates["facial-nasal"]?.highlightColor || BONE.cortical}
        stroke={BONE.stroke}
        strokeWidth="0.6"
        onClick={click("facial-nasal")}
        className="cursor-pointer hover:brightness-110"
      />
      
      {/* Nasal Aperture */}
      <path
        id="nasal-aperture"
        d="M143 98 Q150 95 157 98 L158 115 Q150 120 142 115 Z"
        fill="#2a2a2a"
        stroke={BONE.stroke}
        strokeWidth="0.5"
      />
      
      {/* Zygomatic Bones - Cheekbones */}
      <g id="facial-zygomatic" style={getStyle("facial-zygomatic")}>
        {/* Left zygomatic */}
        <path
          d="M105 85 L85 90 C78 92, 75 98, 78 105 L82 115 L95 118 L108 110 L115 95 L115 88 L105 85"
          fill={layerStates["facial-zygomatic"]?.highlightColor || BONE.cortical}
          stroke={BONE.stroke}
          strokeWidth="0.6"
          onClick={click("facial-zygomatic")}
          className="cursor-pointer hover:brightness-110"
        />
        {/* Right zygomatic */}
        <path
          d="M195 85 L215 90 C222 92, 225 98, 222 105 L218 115 L205 118 L192 110 L185 95 L185 88 L195 85"
          fill={layerStates["facial-zygomatic"]?.highlightColor || BONE.cortical}
          stroke={BONE.stroke}
          strokeWidth="0.6"
          onClick={click("facial-zygomatic")}
          className="cursor-pointer hover:brightness-110"
        />
      </g>
      
      {/* Maxilla - Upper jaw */}
      <path
        id="facial-maxilla"
        d="M108 105 L95 118 L92 130 L100 145 L115 152 L135 155 L150 157 L165 155 L185 152 L200 145 L208 130 L205 118 L192 105 L185 110 Q150 125 115 110 Z"
        style={getStyle("facial-maxilla")}
        fill={layerStates["facial-maxilla"]?.highlightColor || BONE.cortical}
        stroke={BONE.stroke}
        strokeWidth="0.7"
        onClick={click("facial-maxilla")}
        className="cursor-pointer hover:brightness-110"
      />
      
      {/* Upper teeth row indication */}
      <path
        d="M115 152 Q150 158 185 152"
        fill="none"
        stroke={BONE.shadow}
        strokeWidth="0.5"
        strokeDasharray="2,1"
      />
      
      {/* Mandible - Lower jaw */}
      <path
        id="facial-mandible"
        d="M100 148 L95 158 L90 175 L88 190 C88 200, 92 210, 100 218 
           L115 228 L135 235 L150 238 L165 235 L185 228 L200 218 
           C208 210, 212 200, 212 190 L210 175 L205 158 L200 148
           L185 156 Q150 165 115 156 Z"
        style={getStyle("facial-mandible")}
        fill={layerStates["facial-mandible"]?.highlightColor || "url(#bone-gradient)"}
        stroke={BONE.stroke}
        strokeWidth="0.8"
        onClick={click("facial-mandible")}
        className="cursor-pointer hover:brightness-110"
      />
      
      {/* Mandible body detail - mental protuberance (chin) */}
      <path
        d="M135 228 Q150 235 165 228"
        fill="none"
        stroke={BONE.shadow}
        strokeWidth="0.4"
      />
      
      {/* Mental foramen */}
      <circle cx="118" cy="200" r="2" fill={BONE.shadow} opacity="0.5"/>
      <circle cx="182" cy="200" r="2" fill={BONE.shadow} opacity="0.5"/>
      
      {/* Mandibular angle */}
      <path
        d="M90 190 Q85 205 100 218"
        fill="none"
        stroke={BONE.shadow}
        strokeWidth="0.4"
      />
      <path
        d="M210 190 Q215 205 200 218"
        fill="none"
        stroke={BONE.shadow}
        strokeWidth="0.4"
      />
    </g>
  );
};

// Vertebral Column Component
const VertebralColumn: React.FC<{
  layerStates: Record<string, LayerState>;
  onLayerClick?: (layerId: string) => void;
  offsetX?: number;
  offsetY?: number;
}> = ({ layerStates, onLayerClick, offsetX = 0, offsetY = 0 }) => {
  const click = (id: string) => (e: React.MouseEvent) => {
    e.stopPropagation();
    onLayerClick?.(id);
  };
  
  const getStyle = (id: string) => getLayerStyle(id, layerStates, { fill: BONE.cortical, stroke: BONE.stroke });
  
  // Cervical vertebrae positions
  const cervicalY = [0, 10, 20, 30, 40, 50, 60];
  
  return (
    <g id="vertebral-column" transform={`translate(${offsetX}, ${offsetY})`}>
      {/* Cervical Vertebrae C1-C7 */}
      <g id="vertebra-cervical" style={getStyle("vertebra-cervical")} filter="url(#bone-shadow)">
        {cervicalY.map((y, i) => (
          <g key={`c${i + 1}`}>
            {/* Vertebral body */}
            <rect
              x="140" y={y}
              width="20" height="8"
              rx="2"
              fill={layerStates["vertebra-cervical"]?.highlightColor || BONE.cortical}
              stroke={BONE.stroke}
              strokeWidth="0.5"
              onClick={click("vertebra-cervical")}
              className="cursor-pointer hover:brightness-110"
            />
            {/* Transverse processes */}
            <path
              d={`M140 ${y + 4} L132 ${y + 3} L130 ${y + 5} L132 ${y + 7} L140 ${y + 4}`}
              fill={layerStates["vertebra-cervical"]?.highlightColor || BONE.cortical}
              stroke={BONE.stroke}
              strokeWidth="0.3"
              onClick={click("vertebra-cervical")}
              className="cursor-pointer hover:brightness-110"
            />
            <path
              d={`M160 ${y + 4} L168 ${y + 3} L170 ${y + 5} L168 ${y + 7} L160 ${y + 4}`}
              fill={layerStates["vertebra-cervical"]?.highlightColor || BONE.cortical}
              stroke={BONE.stroke}
              strokeWidth="0.3"
              onClick={click("vertebra-cervical")}
              className="cursor-pointer hover:brightness-110"
            />
          </g>
        ))}
      </g>
      
      {/* Thoracic Vertebrae T1-T12 */}
      <g id="vertebra-thoracic" style={getStyle("vertebra-thoracic")} filter="url(#bone-shadow)">
        {Array.from({ length: 12 }, (_, i) => (
          <g key={`t${i + 1}`}>
            <rect
              x="138" y={80 + i * 14}
              width="24" height="12"
              rx="2"
              fill={layerStates["vertebra-thoracic"]?.highlightColor || BONE.cortical}
              stroke={BONE.stroke}
              strokeWidth="0.5"
              onClick={click("vertebra-thoracic")}
              className="cursor-pointer hover:brightness-110"
            />
            {/* Spinous process visible behind */}
            <rect
              x="147" y={82 + i * 14}
              width="6" height="4"
              rx="1"
              fill={BONE.shadow}
              opacity="0.3"
            />
          </g>
        ))}
      </g>
      
      {/* Lumbar Vertebrae L1-L5 */}
      <g id="vertebra-lumbar" style={getStyle("vertebra-lumbar")} filter="url(#bone-shadow)">
        {Array.from({ length: 5 }, (_, i) => (
          <g key={`l${i + 1}`}>
            <rect
              x="135" y={252 + i * 18}
              width="30" height="16"
              rx="3"
              fill={layerStates["vertebra-lumbar"]?.highlightColor || "url(#bone-gradient)"}
              stroke={BONE.stroke}
              strokeWidth="0.6"
              onClick={click("vertebra-lumbar")}
              className="cursor-pointer hover:brightness-110"
            />
            {/* Transverse processes */}
            <path
              d={`M135 ${258 + i * 18} L122 ${260 + i * 18} L120 ${262 + i * 18} L123 ${264 + i * 18} L135 ${262 + i * 18}`}
              fill={layerStates["vertebra-lumbar"]?.highlightColor || BONE.cortical}
              stroke={BONE.stroke}
              strokeWidth="0.4"
              onClick={click("vertebra-lumbar")}
              className="cursor-pointer hover:brightness-110"
            />
            <path
              d={`M165 ${258 + i * 18} L178 ${260 + i * 18} L180 ${262 + i * 18} L177 ${264 + i * 18} L165 ${262 + i * 18}`}
              fill={layerStates["vertebra-lumbar"]?.highlightColor || BONE.cortical}
              stroke={BONE.stroke}
              strokeWidth="0.4"
              onClick={click("vertebra-lumbar")}
              className="cursor-pointer hover:brightness-110"
            />
          </g>
        ))}
      </g>
      
      {/* Sacrum */}
      <path
        id="vertebra-sacrum"
        d="M130 348 L150 395 L170 348 L168 350 Q150 365 132 350 Z"
        style={getStyle("vertebra-sacrum")}
        fill={layerStates["vertebra-sacrum"]?.highlightColor || "url(#bone-gradient)"}
        stroke={BONE.stroke}
        strokeWidth="0.7"
        filter="url(#bone-shadow)"
        onClick={click("vertebra-sacrum")}
        className="cursor-pointer hover:brightness-110"
      />
      
      {/* Sacral foramina */}
      <g opacity="0.4">
        {[360, 372, 384].map((y, i) => (
          <g key={`sacral-foramen-${i}`}>
            <circle cx="138" cy={y} r="2" fill={BONE.shadow}/>
            <circle cx="162" cy={y} r="2" fill={BONE.shadow}/>
          </g>
        ))}
      </g>
      
      {/* Coccyx */}
      <path
        id="vertebra-coccyx"
        d="M145 398 Q150 395 155 398 L153 418 Q150 422 147 418 Z"
        style={getStyle("vertebra-coccyx")}
        fill={layerStates["vertebra-coccyx"]?.highlightColor || BONE.cortical}
        stroke={BONE.stroke}
        strokeWidth="0.5"
        filter="url(#bone-shadow)"
        onClick={click("vertebra-coccyx")}
        className="cursor-pointer hover:brightness-110"
      />
    </g>
  );
};

// Thoracic Cage (Ribs and Sternum)
const ThoracicCage: React.FC<{
  layerStates: Record<string, LayerState>;
  onLayerClick?: (layerId: string) => void;
  offsetX?: number;
  offsetY?: number;
}> = ({ layerStates, onLayerClick, offsetX = 0, offsetY = 0 }) => {
  const click = (id: string) => (e: React.MouseEvent) => {
    e.stopPropagation();
    onLayerClick?.(id);
  };
  
  const getStyle = (id: string) => getLayerStyle(id, layerStates, { fill: BONE.cortical, stroke: BONE.stroke });
  
  return (
    <g id="thoracic-cage" transform={`translate(${offsetX}, ${offsetY})`}>
      {/* Sternum */}
      <g id="sternum-group" filter="url(#bone-shadow)">
        {/* Manubrium */}
        <path
          id="sternum-manubrium"
          d="M142 0 L158 0 L162 8 L165 25 L160 30 L140 30 L135 25 L138 8 Z"
          style={getStyle("sternum-manubrium")}
          fill={layerStates["sternum-manubrium"]?.highlightColor || "url(#bone-gradient)"}
          stroke={BONE.stroke}
          strokeWidth="0.6"
          onClick={click("sternum-manubrium")}
          className="cursor-pointer hover:brightness-110"
        />
        
        {/* Sternal body */}
        <path
          id="sternum-body"
          d="M140 32 L160 32 L158 100 L142 100 Z"
          style={getStyle("sternum-body")}
          fill={layerStates["sternum-body"]?.highlightColor || BONE.cortical}
          stroke={BONE.stroke}
          strokeWidth="0.6"
          onClick={click("sternum-body")}
          className="cursor-pointer hover:brightness-110"
        />
        
        {/* Sternal segments (sternebrae) */}
        {[40, 55, 70, 85].map((y, i) => (
          <line key={`sternebra-${i}`} x1="142" y1={y} x2="158" y2={y} stroke={BONE.shadow} strokeWidth="0.3"/>
        ))}
        
        {/* Xiphoid process */}
        <path
          id="sternum-xiphoid"
          d="M145 100 L155 100 L152 120 L150 125 L148 120 Z"
          style={getStyle("sternum-xiphoid")}
          fill={layerStates["sternum-xiphoid"]?.highlightColor || BONE.cortical}
          stroke={BONE.stroke}
          strokeWidth="0.5"
          onClick={click("sternum-xiphoid")}
          className="cursor-pointer hover:brightness-110"
        />
      </g>
      
      {/* True Ribs 1-7 */}
      <g id="ribs-true" style={getStyle("ribs-true")} filter="url(#bone-shadow)">
        {[0, 16, 32, 48, 64, 80, 96].map((y, i) => (
          <g key={`rib-true-${i + 1}`}>
            {/* Left rib */}
            <path
              d={`M140 ${8 + y} 
                  Q${95 - i * 4} ${15 + y} ${70 - i * 3} ${35 + y}
                  Q${55 - i * 2} ${50 + y} ${55 - i * 2} ${60 + y}`}
              fill="none"
              stroke={layerStates["ribs-true"]?.highlightColor || BONE.stroke}
              strokeWidth={4 - i * 0.2}
              strokeLinecap="round"
              onClick={click("ribs-true")}
              className="cursor-pointer hover:brightness-110"
            />
            {/* Right rib */}
            <path
              d={`M160 ${8 + y} 
                  Q${205 + i * 4} ${15 + y} ${230 + i * 3} ${35 + y}
                  Q${245 + i * 2} ${50 + y} ${245 + i * 2} ${60 + y}`}
              fill="none"
              stroke={layerStates["ribs-true"]?.highlightColor || BONE.stroke}
              strokeWidth={4 - i * 0.2}
              strokeLinecap="round"
              onClick={click("ribs-true")}
              className="cursor-pointer hover:brightness-110"
            />
          </g>
        ))}
      </g>
      
      {/* False Ribs 8-10 */}
      <g id="ribs-false" style={getStyle("ribs-false")} filter="url(#bone-shadow)">
        {[112, 126, 138].map((y, i) => (
          <g key={`rib-false-${i + 8}`}>
            {/* Left rib */}
            <path
              d={`M138 ${y} 
                  Q${80 - i * 5} ${y + 10} ${50 - i * 4} ${y + 25}`}
              fill="none"
              stroke={layerStates["ribs-false"]?.highlightColor || BONE.stroke}
              strokeWidth={3 - i * 0.3}
              strokeLinecap="round"
              onClick={click("ribs-false")}
              className="cursor-pointer hover:brightness-110"
            />
            {/* Right rib */}
            <path
              d={`M162 ${y} 
                  Q${220 + i * 5} ${y + 10} ${250 + i * 4} ${y + 25}`}
              fill="none"
              stroke={layerStates["ribs-false"]?.highlightColor || BONE.stroke}
              strokeWidth={3 - i * 0.3}
              strokeLinecap="round"
              onClick={click("ribs-false")}
              className="cursor-pointer hover:brightness-110"
            />
          </g>
        ))}
      </g>
      
      {/* Floating Ribs 11-12 */}
      <g id="ribs-floating" style={getStyle("ribs-floating")} filter="url(#bone-shadow)">
        {[150, 162].map((y, i) => (
          <g key={`rib-floating-${i + 11}`}>
            {/* Left rib */}
            <path
              d={`M135 ${y} Q${85 - i * 8} ${y + 5} ${70 - i * 10} ${y + 12}`}
              fill="none"
              stroke={layerStates["ribs-floating"]?.highlightColor || BONE.stroke}
              strokeWidth={2.5 - i * 0.3}
              strokeLinecap="round"
              onClick={click("ribs-floating")}
              className="cursor-pointer hover:brightness-110"
            />
            {/* Right rib */}
            <path
              d={`M165 ${y} Q${215 + i * 8} ${y + 5} ${230 + i * 10} ${y + 12}`}
              fill="none"
              stroke={layerStates["ribs-floating"]?.highlightColor || BONE.stroke}
              strokeWidth={2.5 - i * 0.3}
              strokeLinecap="round"
              onClick={click("ribs-floating")}
              className="cursor-pointer hover:brightness-110"
            />
          </g>
        ))}
      </g>
      
      {/* Costal cartilage indication */}
      <g id="costal-cartilage" opacity="0.4">
        {[0, 16, 32, 48, 64, 80, 96].map((y, i) => (
          <g key={`cartilage-${i}`}>
            <path
              d={`M${55 - i * 2} ${60 + y} Q${90 - i * 3} ${50 + y} ${140} ${30 + y}`}
              fill="none"
              stroke="#87CEEB"
              strokeWidth="2"
              strokeDasharray="4,2"
            />
            <path
              d={`M${245 + i * 2} ${60 + y} Q${210 + i * 3} ${50 + y} ${160} ${30 + y}`}
              fill="none"
              stroke="#87CEEB"
              strokeWidth="2"
              strokeDasharray="4,2"
            />
          </g>
        ))}
      </g>
    </g>
  );
};

// Upper Limb Bones
const UpperLimbBones: React.FC<{
  layerStates: Record<string, LayerState>;
  onLayerClick?: (layerId: string) => void;
  offsetX?: number;
  offsetY?: number;
}> = ({ layerStates, onLayerClick, offsetX = 0, offsetY = 0 }) => {
  const click = (id: string) => (e: React.MouseEvent) => {
    e.stopPropagation();
    onLayerClick?.(id);
  };
  
  const getStyle = (id: string) => getLayerStyle(id, layerStates, { fill: BONE.cortical, stroke: BONE.stroke });
  
  return (
    <g id="upper-limb-bones" transform={`translate(${offsetX}, ${offsetY})`}>
      {/* Clavicles */}
      <g id="bone-clavicle" style={getStyle("bone-clavicle")} filter="url(#bone-shadow)">
        {/* Left clavicle */}
        <path
          d="M135 0 Q100 -8 65 5 Q60 8 62 12 Q65 16 70 14 Q105 2 138 8"
          fill="none"
          stroke={layerStates["bone-clavicle"]?.highlightColor || BONE.stroke}
          strokeWidth="6"
          strokeLinecap="round"
          onClick={click("bone-clavicle")}
          className="cursor-pointer hover:brightness-110"
        />
        {/* Right clavicle */}
        <path
          d="M165 0 Q200 -8 235 5 Q240 8 238 12 Q235 16 230 14 Q195 2 162 8"
          fill="none"
          stroke={layerStates["bone-clavicle"]?.highlightColor || BONE.stroke}
          strokeWidth="6"
          strokeLinecap="round"
          onClick={click("bone-clavicle")}
          className="cursor-pointer hover:brightness-110"
        />
      </g>
      
      {/* Scapulae */}
      <g id="bone-scapula" style={getStyle("bone-scapula")} filter="url(#bone-shadow)">
        {/* Left scapula */}
        <path
          d="M55 15 L42 90 L70 115 L85 55 L75 25 Z"
          fill={layerStates["bone-scapula"]?.highlightColor || BONE.cortical}
          stroke={BONE.stroke}
          strokeWidth="0.6"
          opacity="0.7"
          onClick={click("bone-scapula")}
          className="cursor-pointer hover:brightness-110"
        />
        {/* Right scapula */}
        <path
          d="M245 15 L258 90 L230 115 L215 55 L225 25 Z"
          fill={layerStates["bone-scapula"]?.highlightColor || BONE.cortical}
          stroke={BONE.stroke}
          strokeWidth="0.6"
          opacity="0.7"
          onClick={click("bone-scapula")}
          className="cursor-pointer hover:brightness-110"
        />
      </g>
      
      {/* Humeri */}
      <g id="bone-humerus" style={getStyle("bone-humerus")} filter="url(#bone-shadow)">
        {/* Left humerus */}
        <path
          d="M58 20 L28 155"
          fill="none"
          stroke={layerStates["bone-humerus"]?.highlightColor || BONE.stroke}
          strokeWidth="10"
          strokeLinecap="round"
          onClick={click("bone-humerus")}
          className="cursor-pointer hover:brightness-110"
        />
        {/* Left humeral head */}
        <circle
          cx="60" cy="18"
          r="15"
          fill={layerStates["bone-humerus"]?.highlightColor || "url(#bone-gradient)"}
          stroke={BONE.stroke}
          strokeWidth="0.6"
          onClick={click("bone-humerus")}
          className="cursor-pointer hover:brightness-110"
        />
        {/* Left condyles */}
        <ellipse
          cx="26" cy="160"
          rx="12" ry="8"
          fill={layerStates["bone-humerus"]?.highlightColor || BONE.cortical}
          stroke={BONE.stroke}
          strokeWidth="0.5"
          onClick={click("bone-humerus")}
        />
        
        {/* Right humerus */}
        <path
          d="M242 20 L272 155"
          fill="none"
          stroke={layerStates["bone-humerus"]?.highlightColor || BONE.stroke}
          strokeWidth="10"
          strokeLinecap="round"
          onClick={click("bone-humerus")}
          className="cursor-pointer hover:brightness-110"
        />
        {/* Right humeral head */}
        <circle
          cx="240" cy="18"
          r="15"
          fill={layerStates["bone-humerus"]?.highlightColor || "url(#bone-gradient)"}
          stroke={BONE.stroke}
          strokeWidth="0.6"
          onClick={click("bone-humerus")}
          className="cursor-pointer hover:brightness-110"
        />
        {/* Right condyles */}
        <ellipse
          cx="274" cy="160"
          rx="12" ry="8"
          fill={layerStates["bone-humerus"]?.highlightColor || BONE.cortical}
          stroke={BONE.stroke}
          strokeWidth="0.5"
          onClick={click("bone-humerus")}
        />
      </g>
      
      {/* Radius */}
      <g id="bone-radius" style={getStyle("bone-radius")} filter="url(#bone-shadow)">
        {/* Left radius */}
        <path
          d="M22 168 L5 280"
          fill="none"
          stroke={layerStates["bone-radius"]?.highlightColor || BONE.stroke}
          strokeWidth="6"
          strokeLinecap="round"
          onClick={click("bone-radius")}
          className="cursor-pointer hover:brightness-110"
        />
        {/* Radial head */}
        <ellipse cx="23" cy="166" rx="6" ry="4" fill={BONE.cortical} stroke={BONE.stroke} strokeWidth="0.4"/>
        {/* Styloid process */}
        <circle cx="4" cy="282" r="4" fill={BONE.cortical} stroke={BONE.stroke} strokeWidth="0.4"/>
        
        {/* Right radius */}
        <path
          d="M278 168 L295 280"
          fill="none"
          stroke={layerStates["bone-radius"]?.highlightColor || BONE.stroke}
          strokeWidth="6"
          strokeLinecap="round"
          onClick={click("bone-radius")}
          className="cursor-pointer hover:brightness-110"
        />
        <ellipse cx="277" cy="166" rx="6" ry="4" fill={BONE.cortical} stroke={BONE.stroke} strokeWidth="0.4"/>
        <circle cx="296" cy="282" r="4" fill={BONE.cortical} stroke={BONE.stroke} strokeWidth="0.4"/>
      </g>
      
      {/* Ulna */}
      <g id="bone-ulna" style={getStyle("bone-ulna")} filter="url(#bone-shadow)">
        {/* Left ulna */}
        <path
          d="M30 165 L18 280"
          fill="none"
          stroke={layerStates["bone-ulna"]?.highlightColor || BONE.stroke}
          strokeWidth="5"
          strokeLinecap="round"
          onClick={click("bone-ulna")}
          className="cursor-pointer hover:brightness-110"
        />
        {/* Olecranon */}
        <path
          d="M28 162 L32 155 L36 162"
          fill={BONE.cortical}
          stroke={BONE.stroke}
          strokeWidth="0.4"
          onClick={click("bone-ulna")}
        />
        
        {/* Right ulna */}
        <path
          d="M270 165 L282 280"
          fill="none"
          stroke={layerStates["bone-ulna"]?.highlightColor || BONE.stroke}
          strokeWidth="5"
          strokeLinecap="round"
          onClick={click("bone-ulna")}
          className="cursor-pointer hover:brightness-110"
        />
        {/* Olecranon */}
        <path
          d="M272 162 L268 155 L264 162"
          fill={BONE.cortical}
          stroke={BONE.stroke}
          strokeWidth="0.4"
          onClick={click("bone-ulna")}
        />
      </g>
      
      {/* Carpal bones (wrist) */}
      <g id="bone-carpals" style={getStyle("bone-carpals")} filter="url(#bone-shadow)">
        {/* Left carpals */}
        <g onClick={click("bone-carpals")} className="cursor-pointer hover:brightness-110">
          {[0, 6, 12, 18].map((x, i) => (
            <rect key={`carpal-l-p-${i}`} x={x} y="285" width="5" height="8" rx="1" fill={BONE.cortical} stroke={BONE.stroke} strokeWidth="0.3"/>
          ))}
          {[2, 8, 14, 19].map((x, i) => (
            <rect key={`carpal-l-d-${i}`} x={x} y="295" width="5" height="7" rx="1" fill={BONE.cortical} stroke={BONE.stroke} strokeWidth="0.3"/>
          ))}
        </g>
        {/* Right carpals */}
        <g onClick={click("bone-carpals")} className="cursor-pointer hover:brightness-110">
          {[280, 286, 292, 298].map((x, i) => (
            <rect key={`carpal-r-p-${i}`} x={x} y="285" width="5" height="8" rx="1" fill={BONE.cortical} stroke={BONE.stroke} strokeWidth="0.3"/>
          ))}
          {[278, 284, 290, 297].map((x, i) => (
            <rect key={`carpal-r-d-${i}`} x={x} y="295" width="5" height="7" rx="1" fill={BONE.cortical} stroke={BONE.stroke} strokeWidth="0.3"/>
          ))}
        </g>
      </g>
      
      {/* Metacarpals */}
      <g id="bone-metacarpals" style={getStyle("bone-metacarpals")} filter="url(#bone-shadow)">
        {/* Left hand metacarpals */}
        {[-8, -2, 5, 12, 19].map((x, i) => (
          <path
            key={`meta-l-${i}`}
            d={`M${5 + x} 303 L${i === 0 ? -5 + x : 2 + x} 340`}
            fill="none"
            stroke={layerStates["bone-metacarpals"]?.highlightColor || BONE.stroke}
            strokeWidth="3"
            strokeLinecap="round"
            onClick={click("bone-metacarpals")}
            className="cursor-pointer hover:brightness-110"
          />
        ))}
        {/* Right hand metacarpals */}
        {[275, 282, 289, 296, 303].map((x, i) => (
          <path
            key={`meta-r-${i}`}
            d={`M${x} 303 L${i === 4 ? x + 10 : x + 3} 340`}
            fill="none"
            stroke={layerStates["bone-metacarpals"]?.highlightColor || BONE.stroke}
            strokeWidth="3"
            strokeLinecap="round"
            onClick={click("bone-metacarpals")}
            className="cursor-pointer hover:brightness-110"
          />
        ))}
      </g>
      
      {/* Phalanges */}
      <g id="bone-phalanges-hand" style={getStyle("bone-phalanges-hand")} filter="url(#bone-shadow)">
        {/* Left hand phalanges */}
        {[-11, -2, 6, 14, 22].map((x, i) => (
          <g key={`phalanges-l-${i}`}>
            {/* Proximal */}
            <path
              d={`M${i === 0 ? -5 + x : 2 + x} 342 L${i === 0 ? -8 + x : 0 + x} ${i === 0 ? 360 : 368}`}
              fill="none"
              stroke={layerStates["bone-phalanges-hand"]?.highlightColor || BONE.stroke}
              strokeWidth={i === 0 ? 2.5 : 2}
              strokeLinecap="round"
              onClick={click("bone-phalanges-hand")}
              className="cursor-pointer hover:brightness-110"
            />
            {/* Middle (not thumb) */}
            {i !== 0 && (
              <path
                d={`M${0 + x} 370 L${-1 + x} 388`}
                fill="none"
                stroke={layerStates["bone-phalanges-hand"]?.highlightColor || BONE.stroke}
                strokeWidth="1.8"
                strokeLinecap="round"
                onClick={click("bone-phalanges-hand")}
                className="cursor-pointer hover:brightness-110"
              />
            )}
            {/* Distal */}
            <path
              d={`M${i === 0 ? -8 + x : -1 + x} ${i === 0 ? 362 : 390} L${i === 0 ? -10 + x : -2 + x} ${i === 0 ? 375 : 400}`}
              fill="none"
              stroke={layerStates["bone-phalanges-hand"]?.highlightColor || BONE.stroke}
              strokeWidth={i === 0 ? 2 : 1.5}
              strokeLinecap="round"
              onClick={click("bone-phalanges-hand")}
              className="cursor-pointer hover:brightness-110"
            />
          </g>
        ))}
        
        {/* Right hand phalanges */}
        {[278, 285, 292, 299, 308].map((x, i) => (
          <g key={`phalanges-r-${i}`}>
            {/* Proximal */}
            <path
              d={`M${i === 4 ? x + 10 : x + 3} 342 L${i === 4 ? x + 15 : x + 4} ${i === 4 ? 360 : 368}`}
              fill="none"
              stroke={layerStates["bone-phalanges-hand"]?.highlightColor || BONE.stroke}
              strokeWidth={i === 4 ? 2.5 : 2}
              strokeLinecap="round"
              onClick={click("bone-phalanges-hand")}
              className="cursor-pointer hover:brightness-110"
            />
            {/* Middle (not thumb) */}
            {i !== 4 && (
              <path
                d={`M${x + 4} 370 L${x + 5} 388`}
                fill="none"
                stroke={layerStates["bone-phalanges-hand"]?.highlightColor || BONE.stroke}
                strokeWidth="1.8"
                strokeLinecap="round"
                onClick={click("bone-phalanges-hand")}
                className="cursor-pointer hover:brightness-110"
              />
            )}
            {/* Distal */}
            <path
              d={`M${i === 4 ? x + 15 : x + 5} ${i === 4 ? 362 : 390} L${i === 4 ? x + 18 : x + 6} ${i === 4 ? 375 : 400}`}
              fill="none"
              stroke={layerStates["bone-phalanges-hand"]?.highlightColor || BONE.stroke}
              strokeWidth={i === 4 ? 2 : 1.5}
              strokeLinecap="round"
              onClick={click("bone-phalanges-hand")}
              className="cursor-pointer hover:brightness-110"
            />
          </g>
        ))}
      </g>
    </g>
  );
};

// Pelvic Girdle
const PelvicGirdle: React.FC<{
  layerStates: Record<string, LayerState>;
  onLayerClick?: (layerId: string) => void;
  offsetX?: number;
  offsetY?: number;
}> = ({ layerStates, onLayerClick, offsetX = 0, offsetY = 0 }) => {
  const click = (id: string) => (e: React.MouseEvent) => {
    e.stopPropagation();
    onLayerClick?.(id);
  };
  
  const getStyle = (id: string) => getLayerStyle(id, layerStates, { fill: BONE.cortical, stroke: BONE.stroke });
  
  return (
    <g id="pelvic-girdle" transform={`translate(${offsetX}, ${offsetY})`} filter="url(#bone-shadow)">
      {/* Ilium - Wing of pelvis */}
      <g id="pelvis-ilium" style={getStyle("pelvis-ilium")}>
        {/* Left ilium */}
        <path
          d="M95 0 Q60 5 50 35 Q45 55 55 75 L85 85 L110 75 L115 50 Q115 25 105 5 Z"
          fill={layerStates["pelvis-ilium"]?.highlightColor || "url(#bone-gradient)"}
          stroke={BONE.stroke}
          strokeWidth="0.7"
          onClick={click("pelvis-ilium")}
          className="cursor-pointer hover:brightness-110"
        />
        {/* Right ilium */}
        <path
          d="M205 0 Q240 5 250 35 Q255 55 245 75 L215 85 L190 75 L185 50 Q185 25 195 5 Z"
          fill={layerStates["pelvis-ilium"]?.highlightColor || "url(#bone-gradient)"}
          stroke={BONE.stroke}
          strokeWidth="0.7"
          onClick={click("pelvis-ilium")}
          className="cursor-pointer hover:brightness-110"
        />
        {/* Iliac crest detail */}
        <path d="M95 0 Q75 -2 60 5" fill="none" stroke={BONE.shadow} strokeWidth="0.4"/>
        <path d="M205 0 Q225 -2 240 5" fill="none" stroke={BONE.shadow} strokeWidth="0.4"/>
      </g>
      
      {/* Pubis */}
      <g id="pelvis-pubis" style={getStyle("pelvis-pubis")}>
        <path
          d="M105 90 L150 95 L195 90 L195 105 Q150 115 105 105 Z"
          fill={layerStates["pelvis-pubis"]?.highlightColor || BONE.cortical}
          stroke={BONE.stroke}
          strokeWidth="0.6"
          onClick={click("pelvis-pubis")}
          className="cursor-pointer hover:brightness-110"
        />
        {/* Pubic symphysis */}
        <path d="M148 95 L148 105" stroke={BONE.shadow} strokeWidth="1" strokeDasharray="2,1"/>
        <path d="M152 95 L152 105" stroke={BONE.shadow} strokeWidth="1" strokeDasharray="2,1"/>
      </g>
      
      {/* Ischium */}
      <g id="pelvis-ischium" style={getStyle("pelvis-ischium")}>
        {/* Left ischium */}
        <path
          d="M85 85 L70 105 L65 130 L80 145 L100 140 L110 115 L110 75 L85 85"
          fill={layerStates["pelvis-ischium"]?.highlightColor || BONE.cortical}
          stroke={BONE.stroke}
          strokeWidth="0.6"
          onClick={click("pelvis-ischium")}
          className="cursor-pointer hover:brightness-110"
        />
        {/* Right ischium */}
        <path
          d="M215 85 L230 105 L235 130 L220 145 L200 140 L190 115 L190 75 L215 85"
          fill={layerStates["pelvis-ischium"]?.highlightColor || BONE.cortical}
          stroke={BONE.stroke}
          strokeWidth="0.6"
          onClick={click("pelvis-ischium")}
          className="cursor-pointer hover:brightness-110"
        />
        {/* Ischial tuberosity */}
        <ellipse cx="82" cy="142" rx="8" ry="5" fill={BONE.shadow} opacity="0.3"/>
        <ellipse cx="218" cy="142" rx="8" ry="5" fill={BONE.shadow} opacity="0.3"/>
      </g>
      
      {/* Acetabulum - Hip socket */}
      <g id="pelvis-acetabulum" style={getStyle("pelvis-acetabulum")}>
        <circle
          cx="90" cy="78"
          r="18"
          fill={layerStates["pelvis-acetabulum"]?.highlightColor || "#3a3a3a"}
          stroke={BONE.stroke}
          strokeWidth="0.8"
          onClick={click("pelvis-acetabulum")}
          className="cursor-pointer hover:brightness-110"
        />
        <circle
          cx="210" cy="78"
          r="18"
          fill={layerStates["pelvis-acetabulum"]?.highlightColor || "#3a3a3a"}
          stroke={BONE.stroke}
          strokeWidth="0.8"
          onClick={click("pelvis-acetabulum")}
          className="cursor-pointer hover:brightness-110"
        />
        {/* Acetabular rim detail */}
        <circle cx="90" cy="78" r="16" fill="none" stroke={BONE.shadow} strokeWidth="1.5"/>
        <circle cx="210" cy="78" r="16" fill="none" stroke={BONE.shadow} strokeWidth="1.5"/>
      </g>
      
      {/* Obturator foramen */}
      <ellipse cx="95" cy="115" rx="15" ry="20" fill="#1a1a1a" stroke={BONE.stroke} strokeWidth="0.4"/>
      <ellipse cx="205" cy="115" rx="15" ry="20" fill="#1a1a1a" stroke={BONE.stroke} strokeWidth="0.4"/>
    </g>
  );
};

// Lower Limb Bones
const LowerLimbBones: React.FC<{
  layerStates: Record<string, LayerState>;
  onLayerClick?: (layerId: string) => void;
  offsetX?: number;
  offsetY?: number;
}> = ({ layerStates, onLayerClick, offsetX = 0, offsetY = 0 }) => {
  const click = (id: string) => (e: React.MouseEvent) => {
    e.stopPropagation();
    onLayerClick?.(id);
  };
  
  const getStyle = (id: string) => getLayerStyle(id, layerStates, { fill: BONE.cortical, stroke: BONE.stroke });
  
  return (
    <g id="lower-limb-bones" transform={`translate(${offsetX}, ${offsetY})`}>
      {/* Femur */}
      <g id="bone-femur" style={getStyle("bone-femur")} filter="url(#bone-shadow)">
        {/* Left femur */}
        <g>
          {/* Femoral head */}
          <circle
            cx="90" cy="8"
            r="16"
            fill={layerStates["bone-femur"]?.highlightColor || "url(#bone-gradient)"}
            stroke={BONE.stroke}
            strokeWidth="0.7"
            onClick={click("bone-femur")}
            className="cursor-pointer hover:brightness-110"
          />
          {/* Femoral neck */}
          <path
            d="M95 22 L105 50"
            fill="none"
            stroke={layerStates["bone-femur"]?.highlightColor || BONE.stroke}
            strokeWidth="10"
            strokeLinecap="round"
            onClick={click("bone-femur")}
            className="cursor-pointer hover:brightness-110"
          />
          {/* Greater trochanter */}
          <ellipse
            cx="115" cy="35"
            rx="12" ry="18"
            fill={layerStates["bone-femur"]?.highlightColor || BONE.cortical}
            stroke={BONE.stroke}
            strokeWidth="0.5"
            onClick={click("bone-femur")}
            className="cursor-pointer hover:brightness-110"
          />
          {/* Femoral shaft */}
          <path
            d="M108 55 L115 245"
            fill="none"
            stroke={layerStates["bone-femur"]?.highlightColor || BONE.stroke}
            strokeWidth="14"
            strokeLinecap="round"
            onClick={click("bone-femur")}
            className="cursor-pointer hover:brightness-110"
          />
          {/* Femoral condyles */}
          <ellipse
            cx="110" cy="255"
            rx="20" ry="12"
            fill={layerStates["bone-femur"]?.highlightColor || BONE.cortical}
            stroke={BONE.stroke}
            strokeWidth="0.6"
            onClick={click("bone-femur")}
            className="cursor-pointer hover:brightness-110"
          />
        </g>
        
        {/* Right femur */}
        <g>
          <circle
            cx="210" cy="8"
            r="16"
            fill={layerStates["bone-femur"]?.highlightColor || "url(#bone-gradient)"}
            stroke={BONE.stroke}
            strokeWidth="0.7"
            onClick={click("bone-femur")}
            className="cursor-pointer hover:brightness-110"
          />
          <path
            d="M205 22 L195 50"
            fill="none"
            stroke={layerStates["bone-femur"]?.highlightColor || BONE.stroke}
            strokeWidth="10"
            strokeLinecap="round"
            onClick={click("bone-femur")}
            className="cursor-pointer hover:brightness-110"
          />
          <ellipse
            cx="185" cy="35"
            rx="12" ry="18"
            fill={layerStates["bone-femur"]?.highlightColor || BONE.cortical}
            stroke={BONE.stroke}
            strokeWidth="0.5"
            onClick={click("bone-femur")}
            className="cursor-pointer hover:brightness-110"
          />
          <path
            d="M192 55 L185 245"
            fill="none"
            stroke={layerStates["bone-femur"]?.highlightColor || BONE.stroke}
            strokeWidth="14"
            strokeLinecap="round"
            onClick={click("bone-femur")}
            className="cursor-pointer hover:brightness-110"
          />
          <ellipse
            cx="190" cy="255"
            rx="20" ry="12"
            fill={layerStates["bone-femur"]?.highlightColor || BONE.cortical}
            stroke={BONE.stroke}
            strokeWidth="0.6"
            onClick={click("bone-femur")}
            className="cursor-pointer hover:brightness-110"
          />
        </g>
      </g>
      
      {/* Patella */}
      <g id="bone-patella" style={getStyle("bone-patella")} filter="url(#bone-shadow)">
        <ellipse
          cx="115" cy="268"
          rx="10" ry="12"
          fill={layerStates["bone-patella"]?.highlightColor || "url(#bone-gradient)"}
          stroke={BONE.stroke}
          strokeWidth="0.6"
          onClick={click("bone-patella")}
          className="cursor-pointer hover:brightness-110"
        />
        <ellipse
          cx="185" cy="268"
          rx="10" ry="12"
          fill={layerStates["bone-patella"]?.highlightColor || "url(#bone-gradient)"}
          stroke={BONE.stroke}
          strokeWidth="0.6"
          onClick={click("bone-patella")}
          className="cursor-pointer hover:brightness-110"
        />
      </g>
      
      {/* Tibia */}
      <g id="bone-tibia" style={getStyle("bone-tibia")} filter="url(#bone-shadow)">
        {/* Left tibia */}
        <path
          d="M115 280 L120 480"
          fill="none"
          stroke={layerStates["bone-tibia"]?.highlightColor || BONE.stroke}
          strokeWidth="10"
          strokeLinecap="round"
          onClick={click("bone-tibia")}
          className="cursor-pointer hover:brightness-110"
        />
        {/* Tibial plateau */}
        <ellipse cx="112" cy="278" rx="18" ry="8" fill={BONE.cortical} stroke={BONE.stroke} strokeWidth="0.5"/>
        {/* Medial malleolus */}
        <ellipse cx="118" cy="485" rx="8" ry="12" fill={BONE.cortical} stroke={BONE.stroke} strokeWidth="0.5"/>
        
        {/* Right tibia */}
        <path
          d="M185 280 L180 480"
          fill="none"
          stroke={layerStates["bone-tibia"]?.highlightColor || BONE.stroke}
          strokeWidth="10"
          strokeLinecap="round"
          onClick={click("bone-tibia")}
          className="cursor-pointer hover:brightness-110"
        />
        <ellipse cx="188" cy="278" rx="18" ry="8" fill={BONE.cortical} stroke={BONE.stroke} strokeWidth="0.5"/>
        <ellipse cx="182" cy="485" rx="8" ry="12" fill={BONE.cortical} stroke={BONE.stroke} strokeWidth="0.5"/>
      </g>
      
      {/* Fibula */}
      <g id="bone-fibula" style={getStyle("bone-fibula")} filter="url(#bone-shadow)">
        {/* Left fibula */}
        <path
          d="M100 285 L105 475"
          fill="none"
          stroke={layerStates["bone-fibula"]?.highlightColor || BONE.stroke}
          strokeWidth="4"
          strokeLinecap="round"
          onClick={click("bone-fibula")}
          className="cursor-pointer hover:brightness-110"
        />
        {/* Fibular head */}
        <circle cx="99" cy="283" r="5" fill={BONE.cortical} stroke={BONE.stroke} strokeWidth="0.4"/>
        {/* Lateral malleolus */}
        <ellipse cx="106" cy="480" rx="5" ry="10" fill={BONE.cortical} stroke={BONE.stroke} strokeWidth="0.4"/>
        
        {/* Right fibula */}
        <path
          d="M200 285 L195 475"
          fill="none"
          stroke={layerStates["bone-fibula"]?.highlightColor || BONE.stroke}
          strokeWidth="4"
          strokeLinecap="round"
          onClick={click("bone-fibula")}
          className="cursor-pointer hover:brightness-110"
        />
        <circle cx="201" cy="283" r="5" fill={BONE.cortical} stroke={BONE.stroke} strokeWidth="0.4"/>
        <ellipse cx="194" cy="480" rx="5" ry="10" fill={BONE.cortical} stroke={BONE.stroke} strokeWidth="0.4"/>
      </g>
      
      {/* Tarsal bones */}
      <g id="bone-tarsals" style={getStyle("bone-tarsals")} filter="url(#bone-shadow)">
        {/* Left tarsals */}
        <g onClick={click("bone-tarsals")} className="cursor-pointer hover:brightness-110">
          {/* Calcaneus */}
          <path
            d="M100 495 L90 515 L95 530 L120 530 L130 515 L125 495 Z"
            fill={layerStates["bone-tarsals"]?.highlightColor || BONE.cortical}
            stroke={BONE.stroke}
            strokeWidth="0.5"
          />
          {/* Talus */}
          <ellipse cx="118" cy="492" rx="12" ry="8" fill={BONE.cortical} stroke={BONE.stroke} strokeWidth="0.4"/>
          {/* Navicular, cuboid, cuneiforms */}
          <rect x="95" y="530" width="35" height="10" rx="2" fill={BONE.cortical} stroke={BONE.stroke} strokeWidth="0.3"/>
        </g>
        
        {/* Right tarsals */}
        <g onClick={click("bone-tarsals")} className="cursor-pointer hover:brightness-110">
          <path
            d="M200 495 L210 515 L205 530 L180 530 L170 515 L175 495 Z"
            fill={layerStates["bone-tarsals"]?.highlightColor || BONE.cortical}
            stroke={BONE.stroke}
            strokeWidth="0.5"
          />
          <ellipse cx="182" cy="492" rx="12" ry="8" fill={BONE.cortical} stroke={BONE.stroke} strokeWidth="0.4"/>
          <rect x="170" y="530" width="35" height="10" rx="2" fill={BONE.cortical} stroke={BONE.stroke} strokeWidth="0.3"/>
        </g>
      </g>
      
      {/* Metatarsals */}
      <g id="bone-metatarsals" style={getStyle("bone-metatarsals")} filter="url(#bone-shadow)">
        {/* Left metatarsals */}
        {[92, 100, 110, 120, 128].map((x, i) => (
          <path
            key={`metatarsal-l-${i}`}
            d={`M${x} 542 L${x + (i < 2 ? -5 : i > 2 ? 5 : 0)} 575`}
            fill="none"
            stroke={layerStates["bone-metatarsals"]?.highlightColor || BONE.stroke}
            strokeWidth={i === 0 ? 4 : 3}
            strokeLinecap="round"
            onClick={click("bone-metatarsals")}
            className="cursor-pointer hover:brightness-110"
          />
        ))}
        {/* Right metatarsals */}
        {[172, 180, 190, 200, 208].map((x, i) => (
          <path
            key={`metatarsal-r-${i}`}
            d={`M${x} 542 L${x + (i < 2 ? -5 : i > 2 ? 5 : 0)} 575`}
            fill="none"
            stroke={layerStates["bone-metatarsals"]?.highlightColor || BONE.stroke}
            strokeWidth={i === 4 ? 4 : 3}
            strokeLinecap="round"
            onClick={click("bone-metatarsals")}
            className="cursor-pointer hover:brightness-110"
          />
        ))}
      </g>
      
      {/* Phalanges foot */}
      <g id="bone-phalanges-foot" style={getStyle("bone-phalanges-foot")} filter="url(#bone-shadow)">
        {/* Left toe phalanges */}
        {[85, 98, 110, 122, 132].map((x, i) => (
          <g key={`toe-l-${i}`}>
            <path
              d={`M${x} 577 L${x} ${i === 0 ? 595 : 590}`}
              fill="none"
              stroke={layerStates["bone-phalanges-foot"]?.highlightColor || BONE.stroke}
              strokeWidth={i === 0 ? 3 : 2}
              strokeLinecap="round"
              onClick={click("bone-phalanges-foot")}
              className="cursor-pointer hover:brightness-110"
            />
            {i !== 0 && (
              <path
                d={`M${x} 592 L${x} 600`}
                fill="none"
                stroke={BONE.stroke}
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            )}
          </g>
        ))}
        {/* Right toe phalanges */}
        {[168, 178, 190, 202, 215].map((x, i) => (
          <g key={`toe-r-${i}`}>
            <path
              d={`M${x} 577 L${x} ${i === 4 ? 595 : 590}`}
              fill="none"
              stroke={layerStates["bone-phalanges-foot"]?.highlightColor || BONE.stroke}
              strokeWidth={i === 4 ? 3 : 2}
              strokeLinecap="round"
              onClick={click("bone-phalanges-foot")}
              className="cursor-pointer hover:brightness-110"
            />
            {i !== 4 && (
              <path
                d={`M${x} 592 L${x} 600`}
                fill="none"
                stroke={BONE.stroke}
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            )}
          </g>
        ))}
      </g>
    </g>
  );
};

// Main Skeletal System Component
export const SkeletalSystemSVG: React.FC<SkeletalSystemProps> = ({
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
        <g id="skeletal-anterior">
          <SkullAnterior 
            layerStates={layerStates} 
            onLayerClick={onLayerClick}
            offsetX={0}
            offsetY={0}
          />
          
          <VertebralColumn
            layerStates={layerStates}
            onLayerClick={onLayerClick}
            offsetX={0}
            offsetY={160}
          />
          
          <ThoracicCage
            layerStates={layerStates}
            onLayerClick={onLayerClick}
            offsetX={0}
            offsetY={195}
          />
          
          <UpperLimbBones
            layerStates={layerStates}
            onLayerClick={onLayerClick}
            offsetX={0}
            offsetY={195}
          />
          
          <PelvicGirdle
            layerStates={layerStates}
            onLayerClick={onLayerClick}
            offsetX={0}
            offsetY={405}
          />
          
          <LowerLimbBones
            layerStates={layerStates}
            onLayerClick={onLayerClick}
            offsetX={0}
            offsetY={475}
          />
          
          {/* Labels */}
          {showLabels && (
            <g id="skeletal-labels" style={{ pointerEvents: "none" }}>
              <AnatomyLabel x={220} y={50} text="Frontal bone" latinName="Os frontale" size="small"/>
              <AnatomyLabel x={220} y={130} text="Mandible" latinName="Mandibula" size="small"/>
              <AnatomyLabel x={10} y={210} text="Clavicle" latinName="Clavicula" size="small"/>
              <AnatomyLabel x={5} y={260} text="Humerus" latinName="Humerus" size="small"/>
              <AnatomyLabel x={220} y={280} text="Sternum" latinName="Sternum" size="small"/>
              <AnatomyLabel x={220} y={420} text="Vertebrae" latinName="Vertebrae" size="small"/>
              <AnatomyLabel x={5} y={500} text="Pelvis" latinName="Os coxae" size="small"/>
              <AnatomyLabel x={220} y={600} text="Femur" latinName="Femur" size="small"/>
              <AnatomyLabel x={5} y={700} text="Tibia" latinName="Tibia" size="small"/>
              <AnatomyLabel x={220} y={750} text="Fibula" latinName="Fibula" size="small"/>
            </g>
          )}
        </g>
      )}
    </svg>
  );
};

export default SkeletalSystemSVG;
