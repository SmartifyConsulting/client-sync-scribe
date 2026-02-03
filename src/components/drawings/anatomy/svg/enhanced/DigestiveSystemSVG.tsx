/**
 * Digestive System - Medical Atlas Quality SVG
 * GI tract from esophagus to large intestine with accessory organs
 */

import React from "react";
import { getLayerStyle, LayerState } from "../SVGHelpers";

interface DigestiveSystemProps {
  viewType: "anterior" | "posterior" | "lateral";
  layerStates: Record<string, LayerState>;
  onLayerClick?: (layerId: string) => void;
  showLabels?: boolean;
}

export const DigestiveSystemSVG: React.FC<DigestiveSystemProps> = ({
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
    fill: "#DEB887", 
    stroke: "#8B7355" 
  });

  return (
    <g id="digestive-system">
      {/* Oral Cavity (simplified) */}
      <ellipse
        id="oral-cavity"
        cx="150" cy="55"
        rx="12" ry="8"
        style={getStyle("oral-cavity")}
        fill={layerStates["oral-cavity"]?.highlightColor || "#FFB6C1"}
        stroke="#A08080"
        strokeWidth="0.5"
        onClick={click("oral-cavity")}
        className="cursor-pointer hover:brightness-110"
      />
      
      {/* Esophagus */}
      <path
        id="esophagus"
        d="M147 63 L147 350 Q148 355 150 358 Q152 355 153 350 L153 63 Q152 60 150 58 Q148 60 147 63 Z"
        style={getStyle("esophagus")}
        fill={layerStates["esophagus"]?.highlightColor || "#F5DEB3"}
        stroke="#A08080"
        strokeWidth="0.6"
        onClick={click("esophagus")}
        className="cursor-pointer hover:brightness-110"
      />
      
      {/* Stomach */}
      <g id="stomach-group" filter="url(#organ-internal-depth)">
        <path
          id="stomach"
          d="M130 355 
             Q110 360 100 380 
             Q90 410 95 440 
             Q100 470 120 485 
             Q145 500 170 495 
             Q185 490 195 475 
             Q200 460 195 445 
             Q188 430 175 420 
             Q162 412 155 395 
             Q152 375 155 360 
             Z"
          style={getStyle("stomach")}
          fill={layerStates["stomach"]?.highlightColor || "url(#stomach-gradient)"}
          stroke="#A08080"
          strokeWidth="0.8"
          onClick={click("stomach")}
          className="cursor-pointer hover:brightness-110"
        />
        {/* Rugae folds */}
        <g opacity="0.3" stroke="#8B7355" strokeWidth="0.4" fill="none">
          <path d="M110 380 Q130 375 145 380"/>
          <path d="M100 400 Q125 395 150 400"/>
          <path d="M98 420 Q125 415 155 420"/>
          <path d="M100 440 Q130 435 165 445"/>
          <path d="M110 460 Q140 455 175 465"/>
        </g>
        {/* Pyloric sphincter */}
        <ellipse cx="195" cy="460" rx="5" ry="8" fill="#BC8F8F" stroke="#8B7355" strokeWidth="0.4"/>
      </g>
      
      {/* Liver */}
      <path
        id="liver"
        d="M80 310 
           Q60 315 55 340 
           Q52 370 65 395 
           Q85 420 120 425 
           L145 420 
           L148 400 
           Q135 395 125 380 
           Q115 360 120 340 
           Q130 315 145 310 
           Z"
        style={getStyle("liver")}
        fill={layerStates["liver"]?.highlightColor || "url(#liver-gradient)"}
        stroke="#6B3510"
        strokeWidth="0.8"
        filter="url(#organ-parenchymal-depth)"
        onClick={click("liver")}
        className="cursor-pointer hover:brightness-110"
      />
      
      {/* Gallbladder */}
      <path
        id="gallbladder"
        d="M125 420 Q120 430 122 445 Q125 455 135 458 Q142 455 145 445 Q147 430 142 420 Z"
        style={getStyle("gallbladder")}
        fill={layerStates["gallbladder"]?.highlightColor || "#90EE90"}
        stroke="#228B22"
        strokeWidth="0.5"
        onClick={click("gallbladder")}
        className="cursor-pointer hover:brightness-110"
      />
      
      {/* Pancreas */}
      <path
        id="pancreas"
        d="M80 475 
           Q95 468 120 470 
           Q145 472 170 475 
           Q195 478 210 485 
           L212 495 
           Q195 500 170 498 
           Q145 495 120 493 
           Q95 490 80 488 
           Z"
        style={getStyle("pancreas")}
        fill={layerStates["pancreas"]?.highlightColor || "#F5DEB3"}
        stroke="#A08060"
        strokeWidth="0.6"
        onClick={click("pancreas")}
        className="cursor-pointer hover:brightness-110"
      />
      
      {/* Small Intestine */}
      <g id="small-intestine" style={getStyle("small-intestine")} filter="url(#organ-internal-depth)">
        {/* Duodenum */}
        <path
          id="duodenum"
          d="M195 460 Q210 465 215 480 Q218 510 210 540 Q200 560 185 565"
          fill="none"
          stroke={layerStates["small-intestine"]?.highlightColor || "#DEB887"}
          strokeWidth="8"
          strokeLinecap="round"
          onClick={click("small-intestine")}
          className="cursor-pointer hover:brightness-110"
        />
        
        {/* Jejunum & Ileum (coiled) */}
        <path
          id="jejunum-ileum"
          d="M185 565 
             Q160 570 140 580 
             Q120 590 115 610 
             Q112 630 130 640 
             Q150 648 170 645 
             Q188 640 195 625 
             Q200 608 185 595 
             Q168 585 150 590 
             Q130 598 125 615 
             Q122 635 140 650 
             Q160 662 180 658 
             Q198 652 205 635 
             Q210 615 195 600 
             Q178 588 160 595 
             Q140 605 138 625 
             Q138 645 155 660 
             Q175 672 195 665 
             L210 655"
          fill="none"
          stroke={layerStates["small-intestine"]?.highlightColor || "url(#intestine-gradient)"}
          strokeWidth="6"
          strokeLinecap="round"
          onClick={click("small-intestine")}
          className="cursor-pointer hover:brightness-110"
        />
      </g>
      
      {/* Large Intestine */}
      <g id="large-intestine" style={getStyle("large-intestine")}>
        {/* Cecum & Appendix */}
        <g id="cecum">
          <ellipse 
            cx="225" cy="670" rx="15" ry="20"
            fill={layerStates["large-intestine"]?.highlightColor || "#BC8F8F"}
            stroke="#8B6060"
            strokeWidth="0.6"
            onClick={click("large-intestine")}
            className="cursor-pointer hover:brightness-110"
          />
          {/* Appendix */}
          <path
            d="M230 688 Q235 700 232 715 Q228 725 222 730"
            fill="none"
            stroke={layerStates["large-intestine"]?.highlightColor || "#BC8F8F"}
            strokeWidth="4"
            strokeLinecap="round"
            onClick={click("large-intestine")}
            className="cursor-pointer hover:brightness-110"
          />
        </g>
        
        {/* Ascending colon */}
        <path
          id="ascending-colon"
          d="M225 650 L225 580 L225 520 Q228 505 235 500"
          fill="none"
          stroke={layerStates["large-intestine"]?.highlightColor || "#BC8F8F"}
          strokeWidth="14"
          strokeLinecap="round"
          onClick={click("large-intestine")}
          className="cursor-pointer hover:brightness-110"
        />
        
        {/* Transverse colon */}
        <path
          id="transverse-colon"
          d="M235 500 Q200 495 150 500 Q100 505 65 510"
          fill="none"
          stroke={layerStates["large-intestine"]?.highlightColor || "#BC8F8F"}
          strokeWidth="14"
          strokeLinecap="round"
          onClick={click("large-intestine")}
          className="cursor-pointer hover:brightness-110"
        />
        
        {/* Descending colon */}
        <path
          id="descending-colon"
          d="M65 510 L68 570 L70 640 Q72 660 78 680"
          fill="none"
          stroke={layerStates["large-intestine"]?.highlightColor || "#BC8F8F"}
          strokeWidth="14"
          strokeLinecap="round"
          onClick={click("large-intestine")}
          className="cursor-pointer hover:brightness-110"
        />
        
        {/* Sigmoid colon */}
        <path
          id="sigmoid-colon"
          d="M78 680 Q85 710 110 720 Q140 725 150 710"
          fill="none"
          stroke={layerStates["large-intestine"]?.highlightColor || "#BC8F8F"}
          strokeWidth="12"
          strokeLinecap="round"
          onClick={click("large-intestine")}
          className="cursor-pointer hover:brightness-110"
        />
        
        {/* Rectum */}
        <path
          id="rectum"
          d="M150 710 Q152 730 150 750"
          fill="none"
          stroke={layerStates["large-intestine"]?.highlightColor || "#A07070"}
          strokeWidth="10"
          strokeLinecap="round"
          onClick={click("large-intestine")}
          className="cursor-pointer hover:brightness-110"
        />
        
        {/* Haustra (colonic pouches) indication */}
        <g opacity="0.3" stroke="#6B4040" strokeWidth="0.5" fill="none">
          {/* Ascending */}
          {[530, 560, 590, 620].map((y) => (
            <path key={`haustra-asc-${y}`} d={`M218 ${y} Q225 ${y + 10} 232 ${y}`}/>
          ))}
          {/* Transverse */}
          {[90, 120, 150, 180].map((x) => (
            <path key={`haustra-trans-${x}`} d={`M${x} 493 Q${x + 15} 500 ${x} 507`}/>
          ))}
          {/* Descending */}
          {[540, 580, 620, 660].map((y) => (
            <path key={`haustra-desc-${y}`} d={`M61 ${y} Q68 ${y + 10} 75 ${y}`}/>
          ))}
        </g>
      </g>
    </g>
  );
};

export default DigestiveSystemSVG;
