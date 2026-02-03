/**
 * Reproductive System - Medical Atlas Quality SVG
 * Male and Female reproductive organs
 */

import React from "react";
import { getLayerStyle, LayerState } from "../SVGHelpers";

interface ReproductiveSystemProps {
  viewType: "anterior" | "posterior" | "lateral";
  layerStates: Record<string, LayerState>;
  onLayerClick?: (layerId: string) => void;
  showLabels?: boolean;
  sex: "male" | "female";
}

export const ReproductiveSystemSVG: React.FC<ReproductiveSystemProps> = ({
  viewType,
  layerStates,
  onLayerClick,
  showLabels = false,
  sex = "female",
}) => {
  const click = (id: string) => (e: React.MouseEvent) => {
    e.stopPropagation();
    onLayerClick?.(id);
  };

  const getStyle = (id: string) => getLayerStyle(id, layerStates, { 
    fill: "#FFB6C1", 
    stroke: "#8B6969" 
  });

  if (sex === "male") {
    return (
      <g id="reproductive-system-male">
        {/* Testes */}
        <g id="testes" filter="url(#organ-internal-depth)">
          {/* Left testis */}
          <ellipse
            id="testis-left"
            cx="130" cy="850"
            rx="15" ry="20"
            style={getStyle("testes")}
            fill={layerStates["testes"]?.highlightColor || "#F5DEB3"}
            stroke="#A08060"
            strokeWidth="0.6"
            onClick={click("testes")}
            className="cursor-pointer hover:brightness-110"
          />
          {/* Right testis */}
          <ellipse
            id="testis-right"
            cx="170" cy="855"
            rx="15" ry="20"
            style={getStyle("testes")}
            fill={layerStates["testes"]?.highlightColor || "#F5DEB3"}
            stroke="#A08060"
            strokeWidth="0.6"
            onClick={click("testes")}
            className="cursor-pointer hover:brightness-110"
          />
        </g>
        
        {/* Epididymis */}
        <g id="epididymis">
          {/* Left */}
          <path
            d="M118 835 Q112 845 115 860 Q118 872 125 875"
            fill="none"
            stroke={layerStates["epididymis"]?.highlightColor || "#DEB887"}
            strokeWidth="3"
            strokeLinecap="round"
            onClick={click("epididymis")}
            className="cursor-pointer hover:brightness-110"
          />
          {/* Right */}
          <path
            d="M182 840 Q188 850 185 865 Q182 877 175 880"
            fill="none"
            stroke={layerStates["epididymis"]?.highlightColor || "#DEB887"}
            strokeWidth="3"
            strokeLinecap="round"
            onClick={click("epididymis")}
            className="cursor-pointer hover:brightness-110"
          />
        </g>
        
        {/* Vas Deferens */}
        <g id="vas-deferens" style={getStyle("vas-deferens")}>
          {/* Left */}
          <path
            d="M125 830 Q120 800 125 770 Q130 740 140 720"
            fill="none"
            stroke={layerStates["vas-deferens"]?.highlightColor || "#F5DEB3"}
            strokeWidth="2"
            onClick={click("vas-deferens")}
            className="cursor-pointer hover:brightness-110"
          />
          {/* Right */}
          <path
            d="M175 830 Q180 800 175 770 Q170 740 160 720"
            fill="none"
            stroke={layerStates["vas-deferens"]?.highlightColor || "#F5DEB3"}
            strokeWidth="2"
            onClick={click("vas-deferens")}
            className="cursor-pointer hover:brightness-110"
          />
        </g>
        
        {/* Seminal Vesicles */}
        <g id="seminal-vesicles">
          <path
            id="seminal-vesicle-left"
            d="M125 715 Q115 720 112 730 Q115 742 128 738 Q135 732 130 720 Z"
            style={getStyle("seminal-vesicles")}
            fill={layerStates["seminal-vesicles"]?.highlightColor || "#F0E6DC"}
            stroke="#A08060"
            strokeWidth="0.5"
            onClick={click("seminal-vesicles")}
            className="cursor-pointer hover:brightness-110"
          />
          <path
            id="seminal-vesicle-right"
            d="M175 715 Q185 720 188 730 Q185 742 172 738 Q165 732 170 720 Z"
            style={getStyle("seminal-vesicles")}
            fill={layerStates["seminal-vesicles"]?.highlightColor || "#F0E6DC"}
            stroke="#A08060"
            strokeWidth="0.5"
            onClick={click("seminal-vesicles")}
            className="cursor-pointer hover:brightness-110"
          />
        </g>
        
        {/* Prostate */}
        <path
          id="prostate"
          d="M135 750 Q125 755 122 770 Q125 788 140 792 L150 795 L160 792 Q175 788 178 770 Q175 755 165 750 Q155 745 145 746 Q138 746 135 750 Z"
          style={getStyle("prostate")}
          fill={layerStates["prostate"]?.highlightColor || "#DEB887"}
          stroke="#8B7355"
          strokeWidth="0.7"
          filter="url(#organ-internal-depth)"
          onClick={click("prostate")}
          className="cursor-pointer hover:brightness-110"
        />
        
        {/* Penis (simplified anatomical) */}
        <g id="penis" style={getStyle("penis")}>
          <path
            d="M140 795 L140 870 Q145 885 150 888 Q155 885 160 870 L160 795"
            fill={layerStates["penis"]?.highlightColor || "#FFDAB9"}
            stroke="#A08060"
            strokeWidth="0.6"
            onClick={click("penis")}
            className="cursor-pointer hover:brightness-110"
          />
          {/* Corpus cavernosum indication */}
          <path d="M142 800 L142 860" stroke="#BC9080" strokeWidth="0.4" opacity="0.4"/>
          <path d="M158 800 L158 860" stroke="#BC9080" strokeWidth="0.4" opacity="0.4"/>
        </g>
      </g>
    );
  }

  // Female reproductive system
  return (
    <g id="reproductive-system-female">
      {/* Ovaries */}
      <g id="ovaries" filter="url(#organ-internal-depth)">
        {/* Left ovary */}
        <ellipse
          id="ovary-left"
          cx="95" cy="690"
          rx="12" ry="18"
          style={getStyle("ovaries")}
          fill={layerStates["ovaries"]?.highlightColor || "#FFE4E1"}
          stroke="#A08080"
          strokeWidth="0.6"
          onClick={click("ovaries")}
          className="cursor-pointer hover:brightness-110"
        />
        {/* Right ovary */}
        <ellipse
          id="ovary-right"
          cx="205" cy="690"
          rx="12" ry="18"
          style={getStyle("ovaries")}
          fill={layerStates["ovaries"]?.highlightColor || "#FFE4E1"}
          stroke="#A08080"
          strokeWidth="0.6"
          onClick={click("ovaries")}
          className="cursor-pointer hover:brightness-110"
        />
        {/* Follicles indication */}
        <circle cx="92" cy="685" r="2" fill="#BC8F8F" opacity="0.5"/>
        <circle cx="98" cy="695" r="1.5" fill="#BC8F8F" opacity="0.4"/>
        <circle cx="202" cy="688" r="2" fill="#BC8F8F" opacity="0.5"/>
        <circle cx="208" cy="693" r="1.5" fill="#BC8F8F" opacity="0.4"/>
      </g>
      
      {/* Fallopian Tubes */}
      <g id="fallopian-tubes" style={getStyle("fallopian-tubes")}>
        {/* Left tube */}
        <path
          id="fallopian-left"
          d="M120 680 Q100 670 85 678 Q78 685 82 695 Q88 702 95 700"
          fill="none"
          stroke={layerStates["fallopian-tubes"]?.highlightColor || "#FFB6C1"}
          strokeWidth="3"
          strokeLinecap="round"
          onClick={click("fallopian-tubes")}
          className="cursor-pointer hover:brightness-110"
        />
        {/* Left fimbriae */}
        <g opacity="0.7">
          <path d="M82 692 Q75 688 72 695" stroke="#FFB6C1" strokeWidth="1" fill="none"/>
          <path d="M82 695 Q74 693 70 698" stroke="#FFB6C1" strokeWidth="1" fill="none"/>
          <path d="M82 698 Q76 700 73 705" stroke="#FFB6C1" strokeWidth="1" fill="none"/>
        </g>
        
        {/* Right tube */}
        <path
          id="fallopian-right"
          d="M180 680 Q200 670 215 678 Q222 685 218 695 Q212 702 205 700"
          fill="none"
          stroke={layerStates["fallopian-tubes"]?.highlightColor || "#FFB6C1"}
          strokeWidth="3"
          strokeLinecap="round"
          onClick={click("fallopian-tubes")}
          className="cursor-pointer hover:brightness-110"
        />
        {/* Right fimbriae */}
        <g opacity="0.7">
          <path d="M218 692 Q225 688 228 695" stroke="#FFB6C1" strokeWidth="1" fill="none"/>
          <path d="M218 695 Q226 693 230 698" stroke="#FFB6C1" strokeWidth="1" fill="none"/>
          <path d="M218 698 Q224 700 227 705" stroke="#FFB6C1" strokeWidth="1" fill="none"/>
        </g>
      </g>
      
      {/* Uterus */}
      <g id="uterus" filter="url(#organ-hollow-depth)">
        <path
          d="M120 680 
             Q115 695 118 720 
             Q122 745 135 770 
             Q145 785 150 790 
             Q155 785 165 770 
             Q178 745 182 720 
             Q185 695 180 680 
             Q165 665 150 660 
             Q135 665 120 680
             Z"
          style={getStyle("uterus")}
          fill={layerStates["uterus"]?.highlightColor || "#FFB6C1"}
          stroke="#A07070"
          strokeWidth="0.8"
          onClick={click("uterus")}
          className="cursor-pointer hover:brightness-110"
        />
        {/* Endometrium indication */}
        <path
          d="M130 690 Q128 720 138 755 Q148 775 150 780 Q152 775 162 755 Q172 720 170 690"
          fill="#FFD0D0"
          stroke="none"
          opacity="0.5"
        />
        {/* Fundus */}
        <path d="M130 670 Q150 658 170 670" fill="none" stroke="#A07070" strokeWidth="0.4"/>
      </g>
      
      {/* Cervix */}
      <path
        id="cervix"
        d="M140 790 Q145 795 150 798 Q155 795 160 790 L162 810 Q155 818 150 820 Q145 818 138 810 Z"
        style={getStyle("cervix")}
        fill={layerStates["cervix"]?.highlightColor || "#F5A0A0"}
        stroke="#A07070"
        strokeWidth="0.5"
        onClick={click("cervix")}
        className="cursor-pointer hover:brightness-110"
      />
      
      {/* Vagina */}
      <path
        id="vagina"
        d="M142 820 L142 870 Q145 878 150 880 Q155 878 158 870 L158 820"
        style={getStyle("vagina")}
        fill={layerStates["vagina"]?.highlightColor || "#FFB6C1"}
        stroke="#A07070"
        strokeWidth="0.5"
        onClick={click("vagina")}
        className="cursor-pointer hover:brightness-110"
      />
      
      {/* Broad ligament indication */}
      <g opacity="0.3">
        <path d="M95 690 Q110 700 120 695" fill="none" stroke="#BC8F8F" strokeWidth="0.5"/>
        <path d="M205 690 Q190 700 180 695" fill="none" stroke="#BC8F8F" strokeWidth="0.5"/>
      </g>
    </g>
  );
};

export default ReproductiveSystemSVG;
