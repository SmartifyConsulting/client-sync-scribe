/**
 * Cardiovascular System - Medical Atlas Quality SVG
 * Heart, arteries, and veins with proper vessel hierarchies
 */

import React from "react";
import { AnatomySVGDefs, AnatomyLabel, getLayerStyle, LayerState } from "./SVGHelpers";
import { ANATOMY_COLORS } from "./AnatomyColors";

interface CardiovascularSystemProps {
  viewType: "anterior" | "heart-detail" | "systemic";
  layerStates: Record<string, LayerState>;
  onLayerClick?: (layerId: string) => void;
  showLabels?: boolean;
}

const ARTERY = ANATOMY_COLORS.artery;
const VEIN = ANATOMY_COLORS.vein;

// Heart Component
const Heart: React.FC<{
  layerStates: Record<string, LayerState>;
  onLayerClick?: (layerId: string) => void;
  offsetX?: number;
  offsetY?: number;
  scale?: number;
}> = ({ layerStates, onLayerClick, offsetX = 0, offsetY = 0, scale = 1 }) => {
  const click = (id: string) => (e: React.MouseEvent) => {
    e.stopPropagation();
    onLayerClick?.(id);
  };
  
  return (
    <g id="heart" transform={`translate(${offsetX}, ${offsetY}) scale(${scale})`} filter="url(#organ-depth)">
      {/* Right Atrium */}
      <path
        id="heart-right-atrium"
        d="M70 30 Q50 35 45 55 Q42 75 50 90 L75 95 L90 80 L85 50 Z"
        style={getLayerStyle("heart-right-atrium", layerStates)}
        fill={layerStates["heart-right-atrium"]?.highlightColor || "#8B4513"}
        stroke="#5D3A1A"
        strokeWidth="1"
        onClick={click("heart-right-atrium")}
        className="cursor-pointer hover:brightness-110 transition-all"
      />
      
      {/* Left Atrium */}
      <path
        id="heart-left-atrium"
        d="M130 30 Q150 35 155 55 Q158 75 150 90 L125 95 L110 80 L115 50 Z"
        style={getLayerStyle("heart-left-atrium", layerStates)}
        fill={layerStates["heart-left-atrium"]?.highlightColor || "#A0522D"}
        stroke="#5D3A1A"
        strokeWidth="1"
        onClick={click("heart-left-atrium")}
        className="cursor-pointer hover:brightness-110"
      />
      
      {/* Right Ventricle */}
      <path
        id="heart-right-ventricle"
        d="M50 92 L45 140 Q55 175 80 180 L100 175 L95 130 L90 95 Z"
        style={getLayerStyle("heart-right-ventricle", layerStates)}
        fill={layerStates["heart-right-ventricle"]?.highlightColor || "#8B4513"}
        stroke="#5D3A1A"
        strokeWidth="1"
        onClick={click("heart-right-ventricle")}
        className="cursor-pointer hover:brightness-110"
      />
      
      {/* Left Ventricle */}
      <path
        id="heart-left-ventricle"
        d="M150 92 L155 140 Q145 175 120 180 L100 175 L105 130 L110 95 Z"
        style={getLayerStyle("heart-left-ventricle", layerStates)}
        fill={layerStates["heart-left-ventricle"]?.highlightColor || "#A0522D"}
        stroke="#5D3A1A"
        strokeWidth="1"
        onClick={click("heart-left-ventricle")}
        className="cursor-pointer hover:brightness-110"
      />
      
      {/* Interventricular septum line */}
      <line x1="100" y1="95" x2="100" y2="175" stroke="#5D3A1A" strokeWidth="2" opacity="0.5"/>
      
      {/* Aorta */}
      <path
        id="artery-aorta"
        d="M115 40 Q120 20 140 15 Q160 12 170 25 Q180 40 175 60 L170 80"
        style={getLayerStyle("artery-aorta", layerStates)}
        fill="none"
        stroke={layerStates["artery-aorta"]?.highlightColor || ARTERY.main}
        strokeWidth="12"
        strokeLinecap="round"
        onClick={click("artery-aorta")}
        className="cursor-pointer hover:brightness-110"
      />
      
      {/* Pulmonary Artery */}
      <path
        id="artery-pulmonary"
        d="M85 45 Q80 25 65 20 Q45 18 35 35"
        style={getLayerStyle("artery-pulmonary", layerStates)}
        fill="none"
        stroke={layerStates["artery-pulmonary"]?.highlightColor || VEIN.main}
        strokeWidth="10"
        strokeLinecap="round"
        onClick={click("artery-pulmonary")}
        className="cursor-pointer hover:brightness-110"
      />
      
      {/* Superior Vena Cava */}
      <path
        id="vein-superior-vena-cava"
        d="M65 0 L60 30"
        style={getLayerStyle("vein-superior-vena-cava", layerStates)}
        fill="none"
        stroke={layerStates["vein-superior-vena-cava"]?.highlightColor || VEIN.main}
        strokeWidth="10"
        strokeLinecap="round"
        onClick={click("vein-superior-vena-cava")}
        className="cursor-pointer hover:brightness-110"
      />
      
      {/* Inferior Vena Cava */}
      <path
        id="vein-inferior-vena-cava"
        d="M55 95 L50 120 L55 150"
        style={getLayerStyle("vein-inferior-vena-cava", layerStates)}
        fill="none"
        stroke={layerStates["vein-inferior-vena-cava"]?.highlightColor || VEIN.main}
        strokeWidth="10"
        strokeLinecap="round"
        onClick={click("vein-inferior-vena-cava")}
        className="cursor-pointer hover:brightness-110"
      />
      
      {/* Pulmonary Veins */}
      <g id="vein-pulmonary" style={getLayerStyle("vein-pulmonary", layerStates)}>
        <path
          d="M140 50 Q160 45 175 50"
          fill="none"
          stroke={layerStates["vein-pulmonary"]?.highlightColor || ARTERY.main}
          strokeWidth="5"
          strokeLinecap="round"
          onClick={click("vein-pulmonary")}
          className="cursor-pointer hover:brightness-110"
        />
        <path
          d="M145 65 Q165 62 180 68"
          fill="none"
          stroke={layerStates["vein-pulmonary"]?.highlightColor || ARTERY.main}
          strokeWidth="5"
          strokeLinecap="round"
          onClick={click("vein-pulmonary")}
          className="cursor-pointer hover:brightness-110"
        />
      </g>
      
      {/* Coronary arteries */}
      <g id="artery-coronary" style={getLayerStyle("artery-coronary", layerStates)}>
        {/* Left coronary */}
        <path
          d="M115 55 Q110 70 100 85 Q95 100 92 120 Q88 140 95 155"
          fill="none"
          stroke={layerStates["artery-coronary"]?.highlightColor || ARTERY.branch}
          strokeWidth="2"
          onClick={click("artery-coronary")}
          className="cursor-pointer hover:brightness-110"
        />
        {/* Right coronary */}
        <path
          d="M85 55 Q80 70 70 82 Q62 95 58 115"
          fill="none"
          stroke={layerStates["artery-coronary"]?.highlightColor || ARTERY.branch}
          strokeWidth="2"
          onClick={click("artery-coronary")}
          className="cursor-pointer hover:brightness-110"
        />
      </g>
    </g>
  );
};

// Major Arteries
const MajorArteries: React.FC<{
  layerStates: Record<string, LayerState>;
  onLayerClick?: (layerId: string) => void;
  offsetX?: number;
  offsetY?: number;
}> = ({ layerStates, onLayerClick, offsetX = 0, offsetY = 0 }) => {
  const click = (id: string) => (e: React.MouseEvent) => {
    e.stopPropagation();
    onLayerClick?.(id);
  };
  
  return (
    <g id="major-arteries" transform={`translate(${offsetX}, ${offsetY})`}>
      {/* Aortic Arch and Descending Aorta */}
      <path
        id="artery-aorta-main"
        d="M150 80 Q155 60 170 50 Q190 42 200 55 Q215 70 210 100 L205 180 L200 280 L195 380"
        style={getLayerStyle("artery-aorta", layerStates)}
        fill="none"
        stroke={layerStates["artery-aorta"]?.highlightColor || "url(#artery-gradient)"}
        strokeWidth="10"
        strokeLinecap="round"
        onClick={click("artery-aorta")}
        className="cursor-pointer hover:brightness-110"
      />
      
      {/* Brachiocephalic trunk */}
      <path
        id="artery-brachiocephalic"
        d="M175 52 L185 30 L200 15"
        style={getLayerStyle("artery-brachiocephalic", layerStates)}
        fill="none"
        stroke={layerStates["artery-brachiocephalic"]?.highlightColor || ARTERY.main}
        strokeWidth="6"
        strokeLinecap="round"
        onClick={click("artery-brachiocephalic")}
        className="cursor-pointer hover:brightness-110"
      />
      
      {/* Common Carotid Arteries */}
      <g id="artery-carotid" style={getLayerStyle("artery-carotid", layerStates)}>
        {/* Right common carotid */}
        <path
          d="M200 15 L195 0"
          fill="none"
          stroke={layerStates["artery-carotid"]?.highlightColor || ARTERY.main}
          strokeWidth="5"
          strokeLinecap="round"
          onClick={click("artery-carotid")}
          className="cursor-pointer hover:brightness-110"
        />
        {/* Left common carotid */}
        <path
          d="M182 48 L175 25 L168 0"
          fill="none"
          stroke={layerStates["artery-carotid"]?.highlightColor || ARTERY.main}
          strokeWidth="5"
          strokeLinecap="round"
          onClick={click("artery-carotid")}
          className="cursor-pointer hover:brightness-110"
        />
      </g>
      
      {/* Subclavian Arteries */}
      <g id="artery-subclavian" style={getLayerStyle("artery-subclavian", layerStates)}>
        {/* Right subclavian */}
        <path
          d="M200 15 L230 20 L260 25"
          fill="none"
          stroke={layerStates["artery-subclavian"]?.highlightColor || ARTERY.main}
          strokeWidth="5"
          strokeLinecap="round"
          onClick={click("artery-subclavian")}
          className="cursor-pointer hover:brightness-110"
        />
        {/* Left subclavian */}
        <path
          d="M188 55 L160 50 L130 48 L100 50"
          fill="none"
          stroke={layerStates["artery-subclavian"]?.highlightColor || ARTERY.main}
          strokeWidth="5"
          strokeLinecap="round"
          onClick={click("artery-subclavian")}
          className="cursor-pointer hover:brightness-110"
        />
      </g>
      
      {/* Brachial Arteries */}
      <g id="artery-brachial" style={getLayerStyle("artery-brachial", layerStates)}>
        {/* Left brachial */}
        <path
          d="M100 50 L80 100 L65 160 L50 220"
          fill="none"
          stroke={layerStates["artery-brachial"]?.highlightColor || ARTERY.branch}
          strokeWidth="4"
          strokeLinecap="round"
          onClick={click("artery-brachial")}
          className="cursor-pointer hover:brightness-110"
        />
        {/* Right brachial */}
        <path
          d="M260 25 L275 80 L285 140 L292 200"
          fill="none"
          stroke={layerStates["artery-brachial"]?.highlightColor || ARTERY.branch}
          strokeWidth="4"
          strokeLinecap="round"
          onClick={click("artery-brachial")}
          className="cursor-pointer hover:brightness-110"
        />
      </g>
      
      {/* Radial and Ulnar Arteries */}
      <g id="artery-radial" style={getLayerStyle("artery-radial", layerStates)}>
        {/* Left radial */}
        <path
          d="M50 220 L35 280 L25 340"
          fill="none"
          stroke={layerStates["artery-radial"]?.highlightColor || ARTERY.branch}
          strokeWidth="2.5"
          strokeLinecap="round"
          onClick={click("artery-radial")}
          className="cursor-pointer hover:brightness-110"
        />
        {/* Right radial */}
        <path
          d="M292 200 L302 260 L310 320"
          fill="none"
          stroke={layerStates["artery-radial"]?.highlightColor || ARTERY.branch}
          strokeWidth="2.5"
          strokeLinecap="round"
          onClick={click("artery-radial")}
          className="cursor-pointer hover:brightness-110"
        />
      </g>
      
      {/* Common Iliac Arteries */}
      <g id="artery-iliac" style={getLayerStyle("artery-iliac", layerStates)}>
        {/* Left common iliac */}
        <path
          d="M195 380 L170 420 L150 470"
          fill="none"
          stroke={layerStates["artery-iliac"]?.highlightColor || ARTERY.main}
          strokeWidth="6"
          strokeLinecap="round"
          onClick={click("artery-iliac")}
          className="cursor-pointer hover:brightness-110"
        />
        {/* Right common iliac */}
        <path
          d="M195 380 L220 420 L240 470"
          fill="none"
          stroke={layerStates["artery-iliac"]?.highlightColor || ARTERY.main}
          strokeWidth="6"
          strokeLinecap="round"
          onClick={click("artery-iliac")}
          className="cursor-pointer hover:brightness-110"
        />
      </g>
      
      {/* Femoral Arteries */}
      <g id="artery-femoral" style={getLayerStyle("artery-femoral", layerStates)}>
        {/* Left femoral */}
        <path
          d="M150 470 L140 550 L135 650"
          fill="none"
          stroke={layerStates["artery-femoral"]?.highlightColor || ARTERY.main}
          strokeWidth="5"
          strokeLinecap="round"
          onClick={click("artery-femoral")}
          className="cursor-pointer hover:brightness-110"
        />
        {/* Right femoral */}
        <path
          d="M240 470 L250 550 L255 650"
          fill="none"
          stroke={layerStates["artery-femoral"]?.highlightColor || ARTERY.main}
          strokeWidth="5"
          strokeLinecap="round"
          onClick={click("artery-femoral")}
          className="cursor-pointer hover:brightness-110"
        />
      </g>
      
      {/* Popliteal and Tibial Arteries */}
      <g id="artery-tibial" style={getLayerStyle("artery-tibial", layerStates)}>
        {/* Left tibial */}
        <path
          d="M135 650 L130 720 L125 800"
          fill="none"
          stroke={layerStates["artery-tibial"]?.highlightColor || ARTERY.branch}
          strokeWidth="3"
          strokeLinecap="round"
          onClick={click("artery-tibial")}
          className="cursor-pointer hover:brightness-110"
        />
        {/* Right tibial */}
        <path
          d="M255 650 L260 720 L265 800"
          fill="none"
          stroke={layerStates["artery-tibial"]?.highlightColor || ARTERY.branch}
          strokeWidth="3"
          strokeLinecap="round"
          onClick={click("artery-tibial")}
          className="cursor-pointer hover:brightness-110"
        />
      </g>
    </g>
  );
};

// Major Veins
const MajorVeins: React.FC<{
  layerStates: Record<string, LayerState>;
  onLayerClick?: (layerId: string) => void;
  offsetX?: number;
  offsetY?: number;
}> = ({ layerStates, onLayerClick, offsetX = 0, offsetY = 0 }) => {
  const click = (id: string) => (e: React.MouseEvent) => {
    e.stopPropagation();
    onLayerClick?.(id);
  };
  
  return (
    <g id="major-veins" transform={`translate(${offsetX}, ${offsetY})`}>
      {/* Superior Vena Cava */}
      <path
        id="vein-svc"
        d="M140 0 L145 40 L150 80"
        style={getLayerStyle("vein-svc", layerStates)}
        fill="none"
        stroke={layerStates["vein-svc"]?.highlightColor || "url(#vein-gradient)"}
        strokeWidth="10"
        strokeLinecap="round"
        onClick={click("vein-svc")}
        className="cursor-pointer hover:brightness-110"
      />
      
      {/* Inferior Vena Cava */}
      <path
        id="vein-ivc"
        d="M180 100 L185 180 L190 280 L195 380"
        style={getLayerStyle("vein-ivc", layerStates)}
        fill="none"
        stroke={layerStates["vein-ivc"]?.highlightColor || "url(#vein-gradient)"}
        strokeWidth="10"
        strokeLinecap="round"
        onClick={click("vein-ivc")}
        className="cursor-pointer hover:brightness-110"
      />
      
      {/* Jugular Veins */}
      <g id="vein-jugular" style={getLayerStyle("vein-jugular", layerStates)}>
        {/* Left internal jugular */}
        <path
          d="M125 0 L130 30 L138 60"
          fill="none"
          stroke={layerStates["vein-jugular"]?.highlightColor || VEIN.main}
          strokeWidth="5"
          strokeLinecap="round"
          onClick={click("vein-jugular")}
          className="cursor-pointer hover:brightness-110"
        />
        {/* Right internal jugular */}
        <path
          d="M160 0 L158 30 L155 60"
          fill="none"
          stroke={layerStates["vein-jugular"]?.highlightColor || VEIN.main}
          strokeWidth="5"
          strokeLinecap="round"
          onClick={click("vein-jugular")}
          className="cursor-pointer hover:brightness-110"
        />
      </g>
      
      {/* Subclavian Veins */}
      <g id="vein-subclavian" style={getLayerStyle("vein-subclavian", layerStates)}>
        {/* Left subclavian */}
        <path
          d="M80 60 L110 55 L138 50"
          fill="none"
          stroke={layerStates["vein-subclavian"]?.highlightColor || VEIN.main}
          strokeWidth="5"
          strokeLinecap="round"
          onClick={click("vein-subclavian")}
          className="cursor-pointer hover:brightness-110"
        />
        {/* Right subclavian */}
        <path
          d="M280 40 L230 38 L170 45"
          fill="none"
          stroke={layerStates["vein-subclavian"]?.highlightColor || VEIN.main}
          strokeWidth="5"
          strokeLinecap="round"
          onClick={click("vein-subclavian")}
          className="cursor-pointer hover:brightness-110"
        />
      </g>
      
      {/* Cephalic and Basilic Veins */}
      <g id="vein-arm" style={getLayerStyle("vein-arm", layerStates)}>
        {/* Left cephalic */}
        <path
          d="M25 340 L40 280 L55 220 L80 130 L80 60"
          fill="none"
          stroke={layerStates["vein-arm"]?.highlightColor || VEIN.branch}
          strokeWidth="3"
          strokeLinecap="round"
          onClick={click("vein-arm")}
          className="cursor-pointer hover:brightness-110"
        />
        {/* Right cephalic */}
        <path
          d="M310 320 L298 260 L288 200 L280 130 L280 40"
          fill="none"
          stroke={layerStates["vein-arm"]?.highlightColor || VEIN.branch}
          strokeWidth="3"
          strokeLinecap="round"
          onClick={click("vein-arm")}
          className="cursor-pointer hover:brightness-110"
        />
      </g>
      
      {/* Common Iliac Veins */}
      <g id="vein-iliac" style={getLayerStyle("vein-iliac", layerStates)}>
        {/* Left common iliac */}
        <path
          d="M140 470 L165 420 L190 385"
          fill="none"
          stroke={layerStates["vein-iliac"]?.highlightColor || VEIN.main}
          strokeWidth="6"
          strokeLinecap="round"
          onClick={click("vein-iliac")}
          className="cursor-pointer hover:brightness-110"
        />
        {/* Right common iliac */}
        <path
          d="M250 470 L225 420 L200 385"
          fill="none"
          stroke={layerStates["vein-iliac"]?.highlightColor || VEIN.main}
          strokeWidth="6"
          strokeLinecap="round"
          onClick={click("vein-iliac")}
          className="cursor-pointer hover:brightness-110"
        />
      </g>
      
      {/* Femoral Veins */}
      <g id="vein-femoral" style={getLayerStyle("vein-femoral", layerStates)}>
        {/* Left femoral */}
        <path
          d="M125 650 L130 550 L140 470"
          fill="none"
          stroke={layerStates["vein-femoral"]?.highlightColor || VEIN.main}
          strokeWidth="5"
          strokeLinecap="round"
          onClick={click("vein-femoral")}
          className="cursor-pointer hover:brightness-110"
        />
        {/* Right femoral */}
        <path
          d="M265 650 L260 550 L250 470"
          fill="none"
          stroke={layerStates["vein-femoral"]?.highlightColor || VEIN.main}
          strokeWidth="5"
          strokeLinecap="round"
          onClick={click("vein-femoral")}
          className="cursor-pointer hover:brightness-110"
        />
      </g>
      
      {/* Great Saphenous Veins */}
      <g id="vein-saphenous" style={getLayerStyle("vein-saphenous", layerStates)}>
        {/* Left great saphenous */}
        <path
          d="M120 800 L118 720 L115 650 L120 580 L130 500 L140 470"
          fill="none"
          stroke={layerStates["vein-saphenous"]?.highlightColor || VEIN.branch}
          strokeWidth="3"
          strokeLinecap="round"
          onClick={click("vein-saphenous")}
          className="cursor-pointer hover:brightness-110"
        />
        {/* Right great saphenous */}
        <path
          d="M270 800 L272 720 L275 650 L270 580 L260 500 L250 470"
          fill="none"
          stroke={layerStates["vein-saphenous"]?.highlightColor || VEIN.branch}
          strokeWidth="3"
          strokeLinecap="round"
          onClick={click("vein-saphenous")}
          className="cursor-pointer hover:brightness-110"
        />
      </g>
    </g>
  );
};

// Main Cardiovascular System Component
export const CardiovascularSystemSVG: React.FC<CardiovascularSystemProps> = ({
  viewType,
  layerStates,
  onLayerClick,
  showLabels = true,
}) => {
  return (
    <svg 
      viewBox="0 0 340 850" 
      className="w-full h-full"
      style={{ background: "transparent" }}
    >
      <AnatomySVGDefs />
      
      {viewType === "anterior" && (
        <g id="cardiovascular-anterior">
          <Heart 
            layerStates={layerStates} 
            onLayerClick={onLayerClick}
            offsetX={75}
            offsetY={180}
            scale={1}
          />
          
          <MajorArteries
            layerStates={layerStates}
            onLayerClick={onLayerClick}
            offsetX={-5}
            offsetY={50}
          />
          
          <MajorVeins
            layerStates={layerStates}
            onLayerClick={onLayerClick}
            offsetX={5}
            offsetY={50}
          />
          
          {/* Labels */}
          {showLabels && (
            <g id="cardiovascular-labels" style={{ pointerEvents: "none" }}>
              <AnatomyLabel x={230} y={80} text="Aortic arch" size="small"/>
              <AnatomyLabel x={10} y={90} text="Subclavian a." size="small"/>
              <AnatomyLabel x={220} y={250} text="Heart" size="small"/>
              <AnatomyLabel x={250} y={400} text="Abdominal aorta" size="small"/>
              <AnatomyLabel x={10} y={450} text="Common iliac" size="small"/>
              <AnatomyLabel x={260} y={550} text="Femoral a." size="small"/>
              <AnatomyLabel x={10} y={700} text="Great saphenous v." size="small"/>
            </g>
          )}
        </g>
      )}
      
      {viewType === "heart-detail" && (
        <g id="heart-detail">
          <Heart 
            layerStates={layerStates} 
            onLayerClick={onLayerClick}
            offsetX={50}
            offsetY={100}
            scale={2.5}
          />
          
          {showLabels && (
            <g id="heart-detail-labels" style={{ pointerEvents: "none" }}>
              <AnatomyLabel x={30} y={200} text="Right atrium" size="medium"/>
              <AnatomyLabel x={250} y={200} text="Left atrium" size="medium"/>
              <AnatomyLabel x={50} y={350} text="Right ventricle" size="medium"/>
              <AnatomyLabel x={230} y={350} text="Left ventricle" size="medium"/>
              <AnatomyLabel x={180} y={100} text="Aorta" size="medium"/>
              <AnatomyLabel x={30} y={130} text="Pulmonary trunk" size="medium"/>
            </g>
          )}
        </g>
      )}
    </svg>
  );
};

export default CardiovascularSystemSVG;
