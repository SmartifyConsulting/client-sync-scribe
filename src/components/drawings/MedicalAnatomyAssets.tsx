import React from "react";

// Medical color palette - anatomically accurate
export const MEDICAL_COLORS = {
  skin: {
    light: "#F5DEB3",
    medium: "#DEB887",
    shadow: "#CD853F",
  },
  bone: {
    main: "#FFFEF0",
    shadow: "#F5F5DC",
    outline: "#D2B48C",
  },
  muscle: {
    main: "#CD5C5C",
    deep: "#8B0000",
    light: "#E9967A",
    tendon: "#F5F5DC",
  },
  vessel: {
    artery: "#DC143C",
    vein: "#4169E1",
    capillary: "#FF6B6B",
  },
  nerve: {
    main: "#FFD700",
    branch: "#F0E68C",
  },
  organ: {
    liver: "#8B4513",
    kidney: "#CD853F",
    lung: "#FFB6C1",
    heart: "#B22222",
    intestine: "#F4A460",
    stomach: "#DEB887",
    brain: "#FFE4E1",
  },
  cartilage: "#E0E0E0",
  fat: "#FFEC8B",
  fascia: "#F5F5F5",
};

// Layer types for anatomy visualization
export type AnatomyLayer = "skin" | "muscular" | "skeletal" | "vascular" | "nervous" | "organs" | "labels";

export interface LayeredAnatomyAsset {
  id: string;
  name: string;
  category: "body" | "head" | "torso" | "limbs" | "spine" | "joints" | "cosmetic" | "dental";
  component: React.FC<{ visibleLayers: AnatomyLayer[]; color?: string }>;
  defaultWidth: number;
  defaultHeight: number;
  availableLayers: AnatomyLayer[];
  description: string;
}

// ===== PROFESSIONAL FULL BODY ANTERIOR =====
export const FullBodyAnteriorSVG: React.FC<{ visibleLayers: AnatomyLayer[] }> = ({ visibleLayers }) => (
  <svg viewBox="0 0 300 600" className="w-full h-full">
    <defs>
      <linearGradient id="skinGradient" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor={MEDICAL_COLORS.skin.shadow} />
        <stop offset="50%" stopColor={MEDICAL_COLORS.skin.light} />
        <stop offset="100%" stopColor={MEDICAL_COLORS.skin.shadow} />
      </linearGradient>
      <linearGradient id="muscleGradient" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor={MEDICAL_COLORS.muscle.deep} />
        <stop offset="50%" stopColor={MEDICAL_COLORS.muscle.main} />
        <stop offset="100%" stopColor={MEDICAL_COLORS.muscle.deep} />
      </linearGradient>
      <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="1" dy="1" stdDeviation="2" floodOpacity="0.3"/>
      </filter>
    </defs>

    {/* Skeletal System Layer */}
    {visibleLayers.includes("skeletal") && (
      <g id="skeletal-layer">
        {/* Skull */}
        <ellipse cx="150" cy="45" rx="35" ry="40" fill={MEDICAL_COLORS.bone.main} stroke={MEDICAL_COLORS.bone.outline} strokeWidth="1"/>
        <path d="M125 55 Q150 75 175 55" fill="none" stroke={MEDICAL_COLORS.bone.outline} strokeWidth="0.5"/>
        
        {/* Cervical Spine */}
        {[0, 8, 16, 24, 32, 40, 48].map((y, i) => (
          <rect key={`c${i}`} x="143" y={90 + y} width="14" height="6" rx="2" fill={MEDICAL_COLORS.bone.main} stroke={MEDICAL_COLORS.bone.outline} strokeWidth="0.5"/>
        ))}
        
        {/* Clavicles */}
        <path d="M100 155 Q125 148 150 152" fill="none" stroke={MEDICAL_COLORS.bone.outline} strokeWidth="3" strokeLinecap="round"/>
        <path d="M200 155 Q175 148 150 152" fill="none" stroke={MEDICAL_COLORS.bone.outline} strokeWidth="3" strokeLinecap="round"/>
        
        {/* Scapulae (visible portion) */}
        <ellipse cx="95" cy="180" rx="25" ry="35" fill={MEDICAL_COLORS.bone.shadow} stroke={MEDICAL_COLORS.bone.outline} strokeWidth="0.5" opacity="0.6"/>
        <ellipse cx="205" cy="180" rx="25" ry="35" fill={MEDICAL_COLORS.bone.shadow} stroke={MEDICAL_COLORS.bone.outline} strokeWidth="0.5" opacity="0.6"/>
        
        {/* Sternum */}
        <path d="M145 160 L145 280 L155 280 L155 160 Q150 155 145 160" fill={MEDICAL_COLORS.bone.main} stroke={MEDICAL_COLORS.bone.outline} strokeWidth="0.5"/>
        
        {/* Ribs */}
        {[0, 18, 36, 54, 72, 90, 108, 126, 144, 162, 180, 198].map((y, i) => (
          <g key={`rib${i}`}>
            <path d={`M145 ${165 + y * 0.6} Q${110 - i * 2} ${175 + y * 0.6} ${95 - i} ${185 + y * 0.6}`} fill="none" stroke={MEDICAL_COLORS.bone.outline} strokeWidth="2" opacity="0.8"/>
            <path d={`M155 ${165 + y * 0.6} Q${190 + i * 2} ${175 + y * 0.6} ${205 + i} ${185 + y * 0.6}`} fill="none" stroke={MEDICAL_COLORS.bone.outline} strokeWidth="2" opacity="0.8"/>
          </g>
        ))}
        
        {/* Thoracic/Lumbar Spine */}
        {[0, 12, 24, 36, 48, 60, 72, 84, 96, 108, 120, 132].map((y, i) => (
          <rect key={`t${i}`} x="141" y={145 + y} width="18" height="10" rx="2" fill={MEDICAL_COLORS.bone.main} stroke={MEDICAL_COLORS.bone.outline} strokeWidth="0.5"/>
        ))}
        {[0, 15, 30, 45, 60].map((y, i) => (
          <rect key={`l${i}`} x="139" y={285 + y} width="22" height="13" rx="2" fill={MEDICAL_COLORS.bone.main} stroke={MEDICAL_COLORS.bone.outline} strokeWidth="0.5"/>
        ))}
        
        {/* Pelvis */}
        <path d="M95 360 Q80 340 90 310 Q110 290 150 295 Q190 290 210 310 Q220 340 205 360 Q180 390 150 395 Q120 390 95 360" fill={MEDICAL_COLORS.bone.main} stroke={MEDICAL_COLORS.bone.outline} strokeWidth="1"/>
        <ellipse cx="115" cy="355" rx="18" ry="22" fill={MEDICAL_COLORS.bone.shadow} stroke={MEDICAL_COLORS.bone.outline} strokeWidth="1"/>
        <ellipse cx="185" cy="355" rx="18" ry="22" fill={MEDICAL_COLORS.bone.shadow} stroke={MEDICAL_COLORS.bone.outline} strokeWidth="1"/>
        
        {/* Femurs */}
        <path d="M115 375 L110 480" stroke={MEDICAL_COLORS.bone.outline} strokeWidth="8" strokeLinecap="round"/>
        <path d="M185 375 L190 480" stroke={MEDICAL_COLORS.bone.outline} strokeWidth="8" strokeLinecap="round"/>
        <ellipse cx="110" cy="375" rx="12" ry="15" fill={MEDICAL_COLORS.bone.main} stroke={MEDICAL_COLORS.bone.outline} strokeWidth="1"/>
        <ellipse cx="190" cy="375" rx="12" ry="15" fill={MEDICAL_COLORS.bone.main} stroke={MEDICAL_COLORS.bone.outline} strokeWidth="1"/>
        
        {/* Patellae */}
        <ellipse cx="108" cy="490" rx="12" ry="14" fill={MEDICAL_COLORS.bone.main} stroke={MEDICAL_COLORS.bone.outline} strokeWidth="1"/>
        <ellipse cx="192" cy="490" rx="12" ry="14" fill={MEDICAL_COLORS.bone.main} stroke={MEDICAL_COLORS.bone.outline} strokeWidth="1"/>
        
        {/* Tibiae/Fibulae */}
        <path d="M108 505 L105 575" stroke={MEDICAL_COLORS.bone.outline} strokeWidth="6" strokeLinecap="round"/>
        <path d="M118 505 L122 575" stroke={MEDICAL_COLORS.bone.outline} strokeWidth="3" strokeLinecap="round"/>
        <path d="M192 505 L195 575" stroke={MEDICAL_COLORS.bone.outline} strokeWidth="6" strokeLinecap="round"/>
        <path d="M182 505 L178 575" stroke={MEDICAL_COLORS.bone.outline} strokeWidth="3" strokeLinecap="round"/>
        
        {/* Humeri */}
        <path d="M78 170 L55 280" stroke={MEDICAL_COLORS.bone.outline} strokeWidth="6" strokeLinecap="round"/>
        <path d="M222 170 L245 280" stroke={MEDICAL_COLORS.bone.outline} strokeWidth="6" strokeLinecap="round"/>
        
        {/* Radius/Ulna */}
        <path d="M55 285 L40 370" stroke={MEDICAL_COLORS.bone.outline} strokeWidth="4" strokeLinecap="round"/>
        <path d="M58 285 L50 370" stroke={MEDICAL_COLORS.bone.outline} strokeWidth="3" strokeLinecap="round"/>
        <path d="M245 285 L260 370" stroke={MEDICAL_COLORS.bone.outline} strokeWidth="4" strokeLinecap="round"/>
        <path d="M242 285 L250 370" stroke={MEDICAL_COLORS.bone.outline} strokeWidth="3" strokeLinecap="round"/>
      </g>
    )}

    {/* Muscular System Layer */}
    {visibleLayers.includes("muscular") && (
      <g id="muscular-layer" opacity="0.85">
        {/* Pectoralis Major */}
        <path d="M100 165 Q120 155 145 160 L145 210 Q120 220 100 200 Z" fill="url(#muscleGradient)" stroke={MEDICAL_COLORS.muscle.deep} strokeWidth="0.5"/>
        <path d="M200 165 Q180 155 155 160 L155 210 Q180 220 200 200 Z" fill="url(#muscleGradient)" stroke={MEDICAL_COLORS.muscle.deep} strokeWidth="0.5"/>
        
        {/* Deltoids */}
        <ellipse cx="82" cy="170" rx="22" ry="30" fill={MEDICAL_COLORS.muscle.main} stroke={MEDICAL_COLORS.muscle.deep} strokeWidth="0.5"/>
        <ellipse cx="218" cy="170" rx="22" ry="30" fill={MEDICAL_COLORS.muscle.main} stroke={MEDICAL_COLORS.muscle.deep} strokeWidth="0.5"/>
        
        {/* Biceps */}
        <ellipse cx="68" cy="230" rx="12" ry="35" fill={MEDICAL_COLORS.muscle.main} stroke={MEDICAL_COLORS.muscle.deep} strokeWidth="0.5" transform="rotate(-15 68 230)"/>
        <ellipse cx="232" cy="230" rx="12" ry="35" fill={MEDICAL_COLORS.muscle.main} stroke={MEDICAL_COLORS.muscle.deep} strokeWidth="0.5" transform="rotate(15 232 230)"/>
        
        {/* Forearm muscles */}
        <ellipse cx="52" cy="320" rx="10" ry="40" fill={MEDICAL_COLORS.muscle.light} stroke={MEDICAL_COLORS.muscle.deep} strokeWidth="0.5" transform="rotate(-10 52 320)"/>
        <ellipse cx="248" cy="320" rx="10" ry="40" fill={MEDICAL_COLORS.muscle.light} stroke={MEDICAL_COLORS.muscle.deep} strokeWidth="0.5" transform="rotate(10 248 320)"/>
        
        {/* Rectus Abdominis */}
        <path d="M135 215 L135 340 Q150 345 165 340 L165 215 Q150 210 135 215" fill={MEDICAL_COLORS.muscle.main} stroke={MEDICAL_COLORS.muscle.deep} strokeWidth="0.5"/>
        {/* Tendinous inscriptions */}
        <line x1="135" y1="245" x2="165" y2="245" stroke={MEDICAL_COLORS.muscle.tendon} strokeWidth="2"/>
        <line x1="135" y1="275" x2="165" y2="275" stroke={MEDICAL_COLORS.muscle.tendon} strokeWidth="2"/>
        <line x1="135" y1="305" x2="165" y2="305" stroke={MEDICAL_COLORS.muscle.tendon} strokeWidth="2"/>
        
        {/* External Obliques */}
        <path d="M100 200 L115 260 L115 340 Q100 350 90 340 L90 240 Z" fill={MEDICAL_COLORS.muscle.light} stroke={MEDICAL_COLORS.muscle.deep} strokeWidth="0.5"/>
        <path d="M200 200 L185 260 L185 340 Q200 350 210 340 L210 240 Z" fill={MEDICAL_COLORS.muscle.light} stroke={MEDICAL_COLORS.muscle.deep} strokeWidth="0.5"/>
        
        {/* Quadriceps */}
        <ellipse cx="115" cy="430" rx="20" ry="55" fill={MEDICAL_COLORS.muscle.main} stroke={MEDICAL_COLORS.muscle.deep} strokeWidth="0.5"/>
        <ellipse cx="185" cy="430" rx="20" ry="55" fill={MEDICAL_COLORS.muscle.main} stroke={MEDICAL_COLORS.muscle.deep} strokeWidth="0.5"/>
        
        {/* Tibialis Anterior */}
        <ellipse cx="112" cy="535" rx="8" ry="35" fill={MEDICAL_COLORS.muscle.light} stroke={MEDICAL_COLORS.muscle.deep} strokeWidth="0.5"/>
        <ellipse cx="188" cy="535" rx="8" ry="35" fill={MEDICAL_COLORS.muscle.light} stroke={MEDICAL_COLORS.muscle.deep} strokeWidth="0.5"/>
        
        {/* Gastrocnemius */}
        <ellipse cx="105" cy="540" rx="12" ry="30" fill={MEDICAL_COLORS.muscle.main} stroke={MEDICAL_COLORS.muscle.deep} strokeWidth="0.5"/>
        <ellipse cx="195" cy="540" rx="12" ry="30" fill={MEDICAL_COLORS.muscle.main} stroke={MEDICAL_COLORS.muscle.deep} strokeWidth="0.5"/>
      </g>
    )}

    {/* Vascular System Layer */}
    {visibleLayers.includes("vascular") && (
      <g id="vascular-layer" opacity="0.7">
        {/* Heart */}
        <path d="M140 180 Q130 170 135 160 Q145 150 150 165 Q155 150 165 160 Q170 170 160 180 L150 200 Z" fill={MEDICAL_COLORS.organ.heart} stroke={MEDICAL_COLORS.vessel.artery} strokeWidth="1"/>
        
        {/* Aorta */}
        <path d="M150 200 L150 350" stroke={MEDICAL_COLORS.vessel.artery} strokeWidth="4" fill="none"/>
        
        {/* Carotid arteries */}
        <path d="M145 165 L140 90" stroke={MEDICAL_COLORS.vessel.artery} strokeWidth="2.5" fill="none"/>
        <path d="M155 165 L160 90" stroke={MEDICAL_COLORS.vessel.artery} strokeWidth="2.5" fill="none"/>
        
        {/* Subclavian arteries */}
        <path d="M145 170 Q120 165 80 175" stroke={MEDICAL_COLORS.vessel.artery} strokeWidth="2" fill="none"/>
        <path d="M155 170 Q180 165 220 175" stroke={MEDICAL_COLORS.vessel.artery} strokeWidth="2" fill="none"/>
        
        {/* Brachial arteries */}
        <path d="M80 175 L55 285" stroke={MEDICAL_COLORS.vessel.artery} strokeWidth="1.5" fill="none"/>
        <path d="M220 175 L245 285" stroke={MEDICAL_COLORS.vessel.artery} strokeWidth="1.5" fill="none"/>
        
        {/* Radial/Ulnar */}
        <path d="M55 285 L45 370" stroke={MEDICAL_COLORS.vessel.artery} strokeWidth="1" fill="none"/>
        <path d="M245 285 L255 370" stroke={MEDICAL_COLORS.vessel.artery} strokeWidth="1" fill="none"/>
        
        {/* Common Iliac arteries */}
        <path d="M150 350 L125 365" stroke={MEDICAL_COLORS.vessel.artery} strokeWidth="2.5" fill="none"/>
        <path d="M150 350 L175 365" stroke={MEDICAL_COLORS.vessel.artery} strokeWidth="2.5" fill="none"/>
        
        {/* Femoral arteries */}
        <path d="M125 365 L110 490" stroke={MEDICAL_COLORS.vessel.artery} strokeWidth="2" fill="none"/>
        <path d="M175 365 L190 490" stroke={MEDICAL_COLORS.vessel.artery} strokeWidth="2" fill="none"/>
        
        {/* Popliteal and below */}
        <path d="M110 490 L108 575" stroke={MEDICAL_COLORS.vessel.artery} strokeWidth="1.5" fill="none"/>
        <path d="M190 490 L192 575" stroke={MEDICAL_COLORS.vessel.artery} strokeWidth="1.5" fill="none"/>
        
        {/* Major veins - slightly offset and blue */}
        <path d="M155 350 L155 200" stroke={MEDICAL_COLORS.vessel.vein} strokeWidth="3" fill="none" strokeDasharray="8,3"/>
        <path d="M138 90 L143 165" stroke={MEDICAL_COLORS.vessel.vein} strokeWidth="2" fill="none"/>
        <path d="M162 90 L157 165" stroke={MEDICAL_COLORS.vessel.vein} strokeWidth="2" fill="none"/>
      </g>
    )}

    {/* Nervous System Layer */}
    {visibleLayers.includes("nervous") && (
      <g id="nervous-layer" opacity="0.6">
        {/* Brain indication */}
        <ellipse cx="150" cy="40" rx="28" ry="25" fill={MEDICAL_COLORS.organ.brain} stroke={MEDICAL_COLORS.nerve.main} strokeWidth="1"/>
        
        {/* Spinal cord */}
        <path d="M150 65 L150 360" stroke={MEDICAL_COLORS.nerve.main} strokeWidth="3" fill="none"/>
        
        {/* Brachial plexus */}
        <path d="M150 120 Q125 130 85 170" stroke={MEDICAL_COLORS.nerve.main} strokeWidth="1.5" fill="none"/>
        <path d="M150 120 Q175 130 215 170" stroke={MEDICAL_COLORS.nerve.main} strokeWidth="1.5" fill="none"/>
        
        {/* Arm nerves */}
        <path d="M85 170 L50 370" stroke={MEDICAL_COLORS.nerve.branch} strokeWidth="1" fill="none"/>
        <path d="M215 170 L250 370" stroke={MEDICAL_COLORS.nerve.branch} strokeWidth="1" fill="none"/>
        
        {/* Lumbar plexus */}
        <path d="M150 310 Q130 330 120 365" stroke={MEDICAL_COLORS.nerve.main} strokeWidth="1.5" fill="none"/>
        <path d="M150 310 Q170 330 180 365" stroke={MEDICAL_COLORS.nerve.main} strokeWidth="1.5" fill="none"/>
        
        {/* Sciatic nerves */}
        <path d="M120 365 L108 575" stroke={MEDICAL_COLORS.nerve.branch} strokeWidth="1.5" fill="none"/>
        <path d="M180 365 L192 575" stroke={MEDICAL_COLORS.nerve.branch} strokeWidth="1.5" fill="none"/>
      </g>
    )}

    {/* Skin outline Layer */}
    {visibleLayers.includes("skin") && (
      <g id="skin-layer">
        {/* Body outline */}
        <path d="
          M150 10 
          Q185 10 175 45 Q185 85 160 95 
          L175 95 Q220 100 230 155 
          Q245 165 250 200 L270 290 Q275 320 265 350 L255 380 
          Q245 390 235 380 L225 360 
          Q220 380 210 395 L205 490 Q210 495 205 510 
          L210 575 Q210 590 195 595 L175 595 
          Q170 590 175 575 L180 510 Q175 495 180 485 
          L180 400 Q165 395 150 400 
          Q135 395 120 400 L120 485 Q125 495 120 510 
          L125 575 Q130 590 105 595 L85 595 
          Q90 590 90 575 L95 510 Q90 495 95 490 
          L90 395 Q80 380 75 360 
          L65 380 Q55 390 45 380 L35 350 Q25 320 30 290 
          L50 200 Q55 165 70 155 
          Q80 100 125 95 L140 95 
          Q115 85 125 45 Q115 10 150 10
        " 
        fill="url(#skinGradient)" 
        stroke={MEDICAL_COLORS.skin.shadow} 
        strokeWidth="1.5"
        filter="url(#shadow)"
        />
        
        {/* Facial features */}
        <ellipse cx="140" cy="40" rx="6" ry="3" fill="none" stroke={MEDICAL_COLORS.skin.shadow} strokeWidth="0.5"/>
        <ellipse cx="160" cy="40" rx="6" ry="3" fill="none" stroke={MEDICAL_COLORS.skin.shadow} strokeWidth="0.5"/>
        <path d="M147 50 L150 58 L153 50" fill="none" stroke={MEDICAL_COLORS.skin.shadow} strokeWidth="0.5"/>
        <path d="M143 65 Q150 70 157 65" fill="none" stroke={MEDICAL_COLORS.skin.shadow} strokeWidth="0.5"/>
        
        {/* Navel */}
        <ellipse cx="150" cy="315" rx="3" ry="4" fill={MEDICAL_COLORS.skin.shadow}/>
        
        {/* Nipples */}
        <circle cx="125" cy="195" r="3" fill={MEDICAL_COLORS.muscle.light}/>
        <circle cx="175" cy="195" r="3" fill={MEDICAL_COLORS.muscle.light}/>
      </g>
    )}

    {/* Labels Layer */}
    {visibleLayers.includes("labels") && (
      <g id="labels-layer" fontSize="7" fill="#333" fontFamily="Arial, sans-serif">
        <text x="150" y="8" textAnchor="middle" fontWeight="bold">Cranium</text>
        <text x="265" y="170" textAnchor="start">Deltoid m.</text>
        <text x="265" y="230" textAnchor="start">Biceps brachii</text>
        <text x="210" y="200" textAnchor="start">Pectoralis major</text>
        <text x="205" y="270" textAnchor="start">Rectus abdominis</text>
        <text x="220" y="430" textAnchor="start">Quadriceps femoris</text>
        <text x="220" y="540" textAnchor="start">Tibialis anterior</text>
        <line x1="260" y1="168" x2="235" y2="170" stroke="#333" strokeWidth="0.5"/>
        <line x1="260" y1="228" x2="240" y2="230" stroke="#333" strokeWidth="0.5"/>
      </g>
    )}
  </svg>
);

// ===== FULL BODY POSTERIOR =====
export const FullBodyPosteriorSVG: React.FC<{ visibleLayers: AnatomyLayer[] }> = ({ visibleLayers }) => (
  <svg viewBox="0 0 300 600" className="w-full h-full">
    <defs>
      <linearGradient id="skinGradientBack" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor={MEDICAL_COLORS.skin.shadow} />
        <stop offset="50%" stopColor={MEDICAL_COLORS.skin.medium} />
        <stop offset="100%" stopColor={MEDICAL_COLORS.skin.shadow} />
      </linearGradient>
    </defs>

    {/* Skeletal Layer */}
    {visibleLayers.includes("skeletal") && (
      <g id="skeletal-posterior">
        {/* Skull posterior */}
        <ellipse cx="150" cy="45" rx="35" ry="40" fill={MEDICAL_COLORS.bone.main} stroke={MEDICAL_COLORS.bone.outline} strokeWidth="1"/>
        
        {/* Full Spine */}
        {/* Cervical */}
        {[0, 8, 16, 24, 32, 40, 48].map((y, i) => (
          <g key={`c${i}`}>
            <rect x="143" y={90 + y} width="14" height="6" rx="2" fill={MEDICAL_COLORS.bone.main} stroke={MEDICAL_COLORS.bone.outline} strokeWidth="0.5"/>
            <path d={`M143 ${93 + y} L138 ${90 + y} L138 ${96 + y} Z`} fill={MEDICAL_COLORS.bone.shadow} stroke={MEDICAL_COLORS.bone.outline} strokeWidth="0.3"/>
            <path d={`M157 ${93 + y} L162 ${90 + y} L162 ${96 + y} Z`} fill={MEDICAL_COLORS.bone.shadow} stroke={MEDICAL_COLORS.bone.outline} strokeWidth="0.3"/>
          </g>
        ))}
        
        {/* Thoracic */}
        {[0, 12, 24, 36, 48, 60, 72, 84, 96, 108, 120, 132].map((y, i) => (
          <g key={`t${i}`}>
            <rect x="141" y={145 + y} width="18" height="10" rx="2" fill={MEDICAL_COLORS.bone.main} stroke={MEDICAL_COLORS.bone.outline} strokeWidth="0.5"/>
            <path d={`M141 ${150 + y} L130 ${145 + y} L130 ${155 + y} Z`} fill={MEDICAL_COLORS.bone.shadow} stroke={MEDICAL_COLORS.bone.outline} strokeWidth="0.3"/>
            <path d={`M159 ${150 + y} L170 ${145 + y} L170 ${155 + y} Z`} fill={MEDICAL_COLORS.bone.shadow} stroke={MEDICAL_COLORS.bone.outline} strokeWidth="0.3"/>
          </g>
        ))}
        
        {/* Lumbar */}
        {[0, 15, 30, 45, 60].map((y, i) => (
          <g key={`l${i}`}>
            <rect x="139" y={285 + y} width="22" height="13" rx="2" fill={MEDICAL_COLORS.bone.main} stroke={MEDICAL_COLORS.bone.outline} strokeWidth="0.5"/>
            <path d={`M139 ${291 + y} L128 ${285 + y} L128 ${298 + y} Z`} fill={MEDICAL_COLORS.bone.shadow} stroke={MEDICAL_COLORS.bone.outline} strokeWidth="0.3"/>
            <path d={`M161 ${291 + y} L172 ${285 + y} L172 ${298 + y} Z`} fill={MEDICAL_COLORS.bone.shadow} stroke={MEDICAL_COLORS.bone.outline} strokeWidth="0.3"/>
          </g>
        ))}
        
        {/* Scapulae - prominent from back */}
        <path d="M75 145 L65 180 L70 230 L95 240 L110 210 L105 160 Z" fill={MEDICAL_COLORS.bone.main} stroke={MEDICAL_COLORS.bone.outline} strokeWidth="1"/>
        <path d="M225 145 L235 180 L230 230 L205 240 L190 210 L195 160 Z" fill={MEDICAL_COLORS.bone.main} stroke={MEDICAL_COLORS.bone.outline} strokeWidth="1"/>
        {/* Scapular spines */}
        <path d="M75 165 L105 155" stroke={MEDICAL_COLORS.bone.outline} strokeWidth="2"/>
        <path d="M225 165 L195 155" stroke={MEDICAL_COLORS.bone.outline} strokeWidth="2"/>
        
        {/* Sacrum */}
        <path d="M135 360 L150 395 L165 360 Q160 355 150 350 Q140 355 135 360" fill={MEDICAL_COLORS.bone.main} stroke={MEDICAL_COLORS.bone.outline} strokeWidth="1"/>
        
        {/* Pelvis posterior */}
        <path d="M95 350 Q85 330 95 310 Q115 295 150 298 Q185 295 205 310 Q215 330 205 350" fill="none" stroke={MEDICAL_COLORS.bone.outline} strokeWidth="2"/>
        
        {/* Ischial tuberosities */}
        <ellipse cx="120" cy="390" rx="12" ry="10" fill={MEDICAL_COLORS.bone.main} stroke={MEDICAL_COLORS.bone.outline} strokeWidth="1"/>
        <ellipse cx="180" cy="390" rx="12" ry="10" fill={MEDICAL_COLORS.bone.main} stroke={MEDICAL_COLORS.bone.outline} strokeWidth="1"/>
      </g>
    )}

    {/* Muscular Layer */}
    {visibleLayers.includes("muscular") && (
      <g id="muscular-posterior" opacity="0.85">
        {/* Trapezius */}
        <path d="M150 90 Q100 130 85 155 L95 200 Q130 180 150 175 Q170 180 205 200 L215 155 Q200 130 150 90" fill={MEDICAL_COLORS.muscle.main} stroke={MEDICAL_COLORS.muscle.deep} strokeWidth="0.5"/>
        
        {/* Latissimus Dorsi */}
        <path d="M85 200 Q75 260 90 330 L130 340 L130 240 Z" fill={MEDICAL_COLORS.muscle.light} stroke={MEDICAL_COLORS.muscle.deep} strokeWidth="0.5"/>
        <path d="M215 200 Q225 260 210 330 L170 340 L170 240 Z" fill={MEDICAL_COLORS.muscle.light} stroke={MEDICAL_COLORS.muscle.deep} strokeWidth="0.5"/>
        
        {/* Erector Spinae */}
        <ellipse cx="140" cy="250" rx="8" ry="60" fill={MEDICAL_COLORS.muscle.main} stroke={MEDICAL_COLORS.muscle.deep} strokeWidth="0.5"/>
        <ellipse cx="160" cy="250" rx="8" ry="60" fill={MEDICAL_COLORS.muscle.main} stroke={MEDICAL_COLORS.muscle.deep} strokeWidth="0.5"/>
        
        {/* Deltoids posterior */}
        <ellipse cx="78" cy="170" rx="18" ry="25" fill={MEDICAL_COLORS.muscle.main} stroke={MEDICAL_COLORS.muscle.deep} strokeWidth="0.5"/>
        <ellipse cx="222" cy="170" rx="18" ry="25" fill={MEDICAL_COLORS.muscle.main} stroke={MEDICAL_COLORS.muscle.deep} strokeWidth="0.5"/>
        
        {/* Triceps */}
        <ellipse cx="62" cy="225" rx="12" ry="40" fill={MEDICAL_COLORS.muscle.main} stroke={MEDICAL_COLORS.muscle.deep} strokeWidth="0.5" transform="rotate(-10 62 225)"/>
        <ellipse cx="238" cy="225" rx="12" ry="40" fill={MEDICAL_COLORS.muscle.main} stroke={MEDICAL_COLORS.muscle.deep} strokeWidth="0.5" transform="rotate(10 238 225)"/>
        
        {/* Gluteus Maximus */}
        <ellipse cx="120" cy="385" rx="30" ry="35" fill={MEDICAL_COLORS.muscle.main} stroke={MEDICAL_COLORS.muscle.deep} strokeWidth="0.5"/>
        <ellipse cx="180" cy="385" rx="30" ry="35" fill={MEDICAL_COLORS.muscle.main} stroke={MEDICAL_COLORS.muscle.deep} strokeWidth="0.5"/>
        
        {/* Hamstrings */}
        <ellipse cx="115" cy="455" rx="18" ry="50" fill={MEDICAL_COLORS.muscle.light} stroke={MEDICAL_COLORS.muscle.deep} strokeWidth="0.5"/>
        <ellipse cx="185" cy="455" rx="18" ry="50" fill={MEDICAL_COLORS.muscle.light} stroke={MEDICAL_COLORS.muscle.deep} strokeWidth="0.5"/>
        
        {/* Gastrocnemius */}
        <ellipse cx="110" cy="545" rx="15" ry="35" fill={MEDICAL_COLORS.muscle.main} stroke={MEDICAL_COLORS.muscle.deep} strokeWidth="0.5"/>
        <ellipse cx="190" cy="545" rx="15" ry="35" fill={MEDICAL_COLORS.muscle.main} stroke={MEDICAL_COLORS.muscle.deep} strokeWidth="0.5"/>
        
        {/* Achilles tendons */}
        <path d="M110 575 L108 595" stroke={MEDICAL_COLORS.muscle.tendon} strokeWidth="4"/>
        <path d="M190 575 L192 595" stroke={MEDICAL_COLORS.muscle.tendon} strokeWidth="4"/>
      </g>
    )}

    {/* Skin Layer */}
    {visibleLayers.includes("skin") && (
      <g id="skin-posterior">
        <path d="
          M150 10 
          Q115 10 125 45 Q115 85 140 95 
          L125 95 Q80 100 70 155 
          Q55 165 50 200 L30 290 Q25 320 35 350 L45 380 
          Q55 390 65 380 L75 360 
          Q80 380 90 395 L95 490 Q90 495 95 510 
          L90 575 Q90 590 105 595 L125 595 
          Q130 590 125 575 L120 510 Q125 495 120 485 
          L120 400 Q135 395 150 400 
          Q165 395 180 400 L180 485 Q175 495 180 510 
          L175 575 Q170 590 195 595 L215 595 
          Q210 590 210 575 L205 510 Q210 495 205 490 
          L210 395 Q220 380 225 360 
          L235 380 Q245 390 255 380 L265 350 Q275 320 270 290 
          L250 200 Q245 165 230 155 
          Q220 100 175 95 L160 95 
          Q185 85 175 45 Q185 10 150 10
        " 
        fill="url(#skinGradientBack)" 
        stroke={MEDICAL_COLORS.skin.shadow} 
        strokeWidth="1.5"
        />
        
        {/* Spine midline indication */}
        <path d="M150 95 L150 360" stroke={MEDICAL_COLORS.skin.shadow} strokeWidth="0.5" strokeDasharray="3,2" opacity="0.5"/>
        
        {/* Gluteal cleft */}
        <path d="M150 370 L150 410" stroke={MEDICAL_COLORS.skin.shadow} strokeWidth="0.5"/>
      </g>
    )}

    {/* Labels */}
    {visibleLayers.includes("labels") && (
      <g id="labels-posterior" fontSize="7" fill="#333" fontFamily="Arial, sans-serif">
        <text x="10" y="175" textAnchor="start">Trapezius</text>
        <text x="10" y="270" textAnchor="start">Latissimus dorsi</text>
        <text x="260" y="225" textAnchor="start">Triceps</text>
        <text x="220" y="390" textAnchor="start">Gluteus maximus</text>
        <text x="220" y="460" textAnchor="start">Hamstrings</text>
        <text x="220" y="545" textAnchor="start">Gastrocnemius</text>
      </g>
    )}
  </svg>
);

// ===== DETAILED SPINE =====
export const DetailedSpineSVG: React.FC<{ visibleLayers: AnatomyLayer[] }> = ({ visibleLayers }) => (
  <svg viewBox="0 0 150 400" className="w-full h-full">
    <defs>
      <linearGradient id="vertebraGradient" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor={MEDICAL_COLORS.bone.shadow} />
        <stop offset="50%" stopColor={MEDICAL_COLORS.bone.main} />
        <stop offset="100%" stopColor={MEDICAL_COLORS.bone.shadow} />
      </linearGradient>
    </defs>

    {/* Skeletal - Vertebrae */}
    {visibleLayers.includes("skeletal") && (
      <g id="spine-skeletal">
        {/* Cervical C1-C7 */}
        <text x="10" y="18" fontSize="8" fill="#666" fontWeight="bold">Cervical</text>
        {[0, 14, 28, 42, 56, 70, 84].map((y, i) => (
          <g key={`cv${i}`}>
            {/* Vertebral body */}
            <ellipse cx="75" cy={25 + y} rx="18" ry="5" fill="url(#vertebraGradient)" stroke={MEDICAL_COLORS.bone.outline} strokeWidth="0.8"/>
            {/* Spinous process */}
            <path d={`M75 ${20 + y} L75 ${12 + y}`} stroke={MEDICAL_COLORS.bone.outline} strokeWidth="2" strokeLinecap="round"/>
            {/* Transverse processes */}
            <path d={`M57 ${25 + y} L48 ${22 + y}`} stroke={MEDICAL_COLORS.bone.outline} strokeWidth="2" strokeLinecap="round"/>
            <path d={`M93 ${25 + y} L102 ${22 + y}`} stroke={MEDICAL_COLORS.bone.outline} strokeWidth="2" strokeLinecap="round"/>
            {/* Intervertebral disc */}
            {i < 6 && <ellipse cx="75" cy={32 + y} rx="16" ry="2" fill={MEDICAL_COLORS.cartilage} stroke={MEDICAL_COLORS.bone.outline} strokeWidth="0.3"/>}
            {/* Label */}
            <text x="120" y={28 + y} fontSize="7" fill="#333">C{i + 1}</text>
          </g>
        ))}

        {/* Thoracic T1-T12 */}
        <text x="10" y="118" fontSize="8" fill="#666" fontWeight="bold">Thoracic</text>
        {[0, 13, 26, 39, 52, 65, 78, 91, 104, 117, 130, 143].map((y, i) => (
          <g key={`tv${i}`}>
            <ellipse cx="75" cy={125 + y} rx="20" ry="5" fill="url(#vertebraGradient)" stroke={MEDICAL_COLORS.bone.outline} strokeWidth="0.8"/>
            <path d={`M75 ${120 + y} L75 ${108 + y}`} stroke={MEDICAL_COLORS.bone.outline} strokeWidth="2.5" strokeLinecap="round"/>
            <path d={`M55 ${125 + y} L42 ${120 + y}`} stroke={MEDICAL_COLORS.bone.outline} strokeWidth="2" strokeLinecap="round"/>
            <path d={`M95 ${125 + y} L108 ${120 + y}`} stroke={MEDICAL_COLORS.bone.outline} strokeWidth="2" strokeLinecap="round"/>
            {i < 11 && <ellipse cx="75" cy={133 + y} rx="18" ry="2" fill={MEDICAL_COLORS.cartilage} stroke={MEDICAL_COLORS.bone.outline} strokeWidth="0.3"/>}
            <text x="120" y={128 + y} fontSize="7" fill="#333">T{i + 1}</text>
          </g>
        ))}

        {/* Lumbar L1-L5 */}
        <text x="10" y="288" fontSize="8" fill="#666" fontWeight="bold">Lumbar</text>
        {[0, 18, 36, 54, 72].map((y, i) => (
          <g key={`lv${i}`}>
            <ellipse cx="75" cy={295 + y} rx="24" ry="7" fill="url(#vertebraGradient)" stroke={MEDICAL_COLORS.bone.outline} strokeWidth="0.8"/>
            <path d={`M75 ${288 + y} L75 ${275 + y}`} stroke={MEDICAL_COLORS.bone.outline} strokeWidth="3" strokeLinecap="round"/>
            <path d={`M51 ${295 + y} L35 ${288 + y}`} stroke={MEDICAL_COLORS.bone.outline} strokeWidth="2.5" strokeLinecap="round"/>
            <path d={`M99 ${295 + y} L115 ${288 + y}`} stroke={MEDICAL_COLORS.bone.outline} strokeWidth="2.5" strokeLinecap="round"/>
            {i < 4 && <ellipse cx="75" cy={305 + y} rx="22" ry="3" fill={MEDICAL_COLORS.cartilage} stroke={MEDICAL_COLORS.bone.outline} strokeWidth="0.3"/>}
            <text x="120" y={298 + y} fontSize="7" fill="#333">L{i + 1}</text>
          </g>
        ))}

        {/* Sacrum */}
        <text x="10" y="378" fontSize="8" fill="#666" fontWeight="bold">Sacrum</text>
        <path d="M50 375 L75 395 L100 375 Q95 365 75 360 Q55 365 50 375" fill="url(#vertebraGradient)" stroke={MEDICAL_COLORS.bone.outline} strokeWidth="1"/>
        <text x="120" y="380" fontSize="7" fill="#333">S1-S5</text>
      </g>
    )}

    {/* Nervous Layer - Spinal cord */}
    {visibleLayers.includes("nervous") && (
      <g id="spine-nervous" opacity="0.6">
        <path d="M75 10 L75 375" stroke={MEDICAL_COLORS.nerve.main} strokeWidth="3"/>
        {/* Nerve roots */}
        {[25, 39, 53, 67, 81, 95, 109].map((y, i) => (
          <g key={`cn${i}`}>
            <path d={`M75 ${y} L50 ${y + 5}`} stroke={MEDICAL_COLORS.nerve.branch} strokeWidth="1"/>
            <path d={`M75 ${y} L100 ${y + 5}`} stroke={MEDICAL_COLORS.nerve.branch} strokeWidth="1"/>
          </g>
        ))}
      </g>
    )}
  </svg>
);

// ===== DETAILED SKULL =====
export const DetailedSkullSVG: React.FC<{ visibleLayers: AnatomyLayer[] }> = ({ visibleLayers }) => (
  <svg viewBox="0 0 200 220" className="w-full h-full">
    {visibleLayers.includes("skeletal") && (
      <g id="skull-skeletal">
        {/* Cranium */}
        <path d="M40 90 Q40 30 100 25 Q160 30 160 90 Q165 130 150 150 L50 150 Q35 130 40 90" fill={MEDICAL_COLORS.bone.main} stroke={MEDICAL_COLORS.bone.outline} strokeWidth="1.5"/>
        
        {/* Frontal bone */}
        <path d="M50 90 Q50 50 100 45 Q150 50 150 90" fill="none" stroke={MEDICAL_COLORS.bone.outline} strokeWidth="0.8" strokeDasharray="3,2"/>
        
        {/* Temporal bones */}
        <path d="M45 100 Q35 110 40 130" stroke={MEDICAL_COLORS.bone.outline} strokeWidth="1"/>
        <path d="M155 100 Q165 110 160 130" stroke={MEDICAL_COLORS.bone.outline} strokeWidth="1"/>
        
        {/* Zygomatic bones */}
        <path d="M50 115 L35 125 L40 140 L55 135 Z" fill={MEDICAL_COLORS.bone.main} stroke={MEDICAL_COLORS.bone.outline} strokeWidth="1"/>
        <path d="M150 115 L165 125 L160 140 L145 135 Z" fill={MEDICAL_COLORS.bone.main} stroke={MEDICAL_COLORS.bone.outline} strokeWidth="1"/>
        
        {/* Orbits */}
        <ellipse cx="75" cy="110" rx="18" ry="15" fill={MEDICAL_COLORS.bone.shadow} stroke={MEDICAL_COLORS.bone.outline} strokeWidth="1.5"/>
        <ellipse cx="125" cy="110" rx="18" ry="15" fill={MEDICAL_COLORS.bone.shadow} stroke={MEDICAL_COLORS.bone.outline} strokeWidth="1.5"/>
        
        {/* Nasal bones */}
        <path d="M95 105 L100 95 L105 105" fill="none" stroke={MEDICAL_COLORS.bone.outline} strokeWidth="1.5"/>
        <path d="M92 130 L100 105 L108 130" fill="none" stroke={MEDICAL_COLORS.bone.outline} strokeWidth="1"/>
        
        {/* Nasal aperture */}
        <path d="M92 130 Q100 140 108 130" fill={MEDICAL_COLORS.bone.shadow} stroke={MEDICAL_COLORS.bone.outline} strokeWidth="1"/>
        
        {/* Maxilla */}
        <path d="M55 135 L70 150 L100 155 L130 150 L145 135" fill="none" stroke={MEDICAL_COLORS.bone.outline} strokeWidth="1"/>
        <path d="M70 150 L70 165 Q100 175 130 165 L130 150" fill={MEDICAL_COLORS.bone.main} stroke={MEDICAL_COLORS.bone.outline} strokeWidth="1"/>
        
        {/* Mandible */}
        <path d="M55 165 Q50 180 55 195 Q70 210 100 215 Q130 210 145 195 Q150 180 145 165" fill={MEDICAL_COLORS.bone.main} stroke={MEDICAL_COLORS.bone.outline} strokeWidth="1.5"/>
        <path d="M55 165 L70 165 M130 165 L145 165" stroke={MEDICAL_COLORS.bone.outline} strokeWidth="1"/>
        
        {/* Teeth indication */}
        <path d="M72 165 L72 175 M82 165 L82 175 M92 165 L92 175 M100 165 L100 175 M108 165 L108 175 M118 165 L118 175 M128 165 L128 175" stroke={MEDICAL_COLORS.bone.outline} strokeWidth="1"/>
        
        {/* Mandibular teeth */}
        <path d="M72 178 L72 188 M82 178 L82 188 M92 178 L92 188 M100 178 L100 188 M108 178 L108 188 M118 178 L118 188 M128 178 L128 188" stroke={MEDICAL_COLORS.bone.outline} strokeWidth="1"/>
        
        {/* Suture lines */}
        <path d="M100 45 L100 95" stroke={MEDICAL_COLORS.bone.outline} strokeWidth="0.5" strokeDasharray="2,2"/>
        <path d="M50 90 L150 90" stroke={MEDICAL_COLORS.bone.outline} strokeWidth="0.5" strokeDasharray="2,2"/>
      </g>
    )}

    {visibleLayers.includes("labels") && (
      <g fontSize="6" fill="#333">
        <text x="85" y="35">Frontal</text>
        <text x="10" y="100">Temporal</text>
        <text x="160" y="100">Temporal</text>
        <text x="15" y="135">Zygomatic</text>
        <text x="140" y="135">Zygomatic</text>
        <text x="88" y="145">Maxilla</text>
        <text x="85" y="205">Mandible</text>
      </g>
    )}
  </svg>
);

// ===== HEART ANATOMY =====
export const HeartAnatomySVG: React.FC<{ visibleLayers: AnatomyLayer[] }> = ({ visibleLayers }) => (
  <svg viewBox="0 0 200 200" className="w-full h-full">
    <defs>
      <linearGradient id="heartGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor={MEDICAL_COLORS.organ.heart} />
        <stop offset="100%" stopColor="#8B0000" />
      </linearGradient>
    </defs>

    {visibleLayers.includes("organs") && (
      <g id="heart-structure">
        {/* Heart outline */}
        <path d="M100 180 
          Q60 150 50 120 
          Q35 80 50 50 
          Q70 25 100 40 
          Q130 25 150 50 
          Q165 80 150 120 
          Q140 150 100 180" 
          fill="url(#heartGradient)" 
          stroke={MEDICAL_COLORS.muscle.deep} 
          strokeWidth="2"/>
        
        {/* Right atrium */}
        <path d="M55 70 Q45 80 50 95 Q60 105 75 100 Q85 90 80 75 Q75 65 55 70" fill={MEDICAL_COLORS.vessel.vein} stroke="#333" strokeWidth="0.5" opacity="0.7"/>
        
        {/* Left atrium */}
        <path d="M120 75 Q130 65 145 70 Q155 80 150 95 Q140 105 125 100 Q115 90 120 75" fill={MEDICAL_COLORS.vessel.artery} stroke="#333" strokeWidth="0.5" opacity="0.7"/>
        
        {/* Septum */}
        <path d="M100 55 L100 160" stroke="#333" strokeWidth="1.5" strokeDasharray="4,2"/>
        
        {/* Ventricle division */}
        <path d="M100 100 Q85 130 95 160" stroke="#333" strokeWidth="0.8"/>
        <path d="M100 100 Q115 130 105 160" stroke="#333" strokeWidth="0.8"/>
      </g>
    )}

    {visibleLayers.includes("vascular") && (
      <g id="heart-vessels">
        {/* Superior vena cava */}
        <path d="M60 50 L60 20" stroke={MEDICAL_COLORS.vessel.vein} strokeWidth="8" strokeLinecap="round"/>
        
        {/* Inferior vena cava */}
        <path d="M65 120 L55 180" stroke={MEDICAL_COLORS.vessel.vein} strokeWidth="8" strokeLinecap="round"/>
        
        {/* Pulmonary veins */}
        <path d="M145 70 Q160 60 175 55" stroke={MEDICAL_COLORS.vessel.artery} strokeWidth="4"/>
        <path d="M145 85 Q165 85 180 75" stroke={MEDICAL_COLORS.vessel.artery} strokeWidth="4"/>
        
        {/* Aorta */}
        <path d="M110 45 Q130 30 150 35 Q175 45 180 70 L180 100" stroke={MEDICAL_COLORS.vessel.artery} strokeWidth="6" fill="none"/>
        
        {/* Pulmonary artery */}
        <path d="M90 50 Q80 35 70 30 L50 25" stroke={MEDICAL_COLORS.vessel.vein} strokeWidth="5" fill="none"/>
      </g>
    )}

    {visibleLayers.includes("labels") && (
      <g fontSize="6" fill="#333">
        <text x="35" y="15">SVC</text>
        <text x="35" y="85">RA</text>
        <text x="130" y="85">LA</text>
        <text x="65" y="140">RV</text>
        <text x="115" y="140">LV</text>
        <text x="160" y="50">Aorta</text>
        <text x="20" y="30">PA</text>
      </g>
    )}
  </svg>
);

// ===== KNEE JOINT DETAILED =====
export const KneeJointSVG: React.FC<{ visibleLayers: AnatomyLayer[] }> = ({ visibleLayers }) => (
  <svg viewBox="0 0 160 220" className="w-full h-full">
    {visibleLayers.includes("skeletal") && (
      <g id="knee-bones">
        {/* Femur distal */}
        <path d="M60 10 L55 60 Q50 80 45 95 L50 100 Q80 110 115 100 L120 95 Q115 80 110 60 L105 10" fill={MEDICAL_COLORS.bone.main} stroke={MEDICAL_COLORS.bone.outline} strokeWidth="1.5"/>
        
        {/* Femoral condyles */}
        <ellipse cx="60" cy="100" rx="20" ry="18" fill={MEDICAL_COLORS.bone.main} stroke={MEDICAL_COLORS.bone.outline} strokeWidth="1"/>
        <ellipse cx="105" cy="100" rx="20" ry="18" fill={MEDICAL_COLORS.bone.main} stroke={MEDICAL_COLORS.bone.outline} strokeWidth="1"/>
        
        {/* Patella */}
        <ellipse cx="82" cy="105" rx="18" ry="22" fill={MEDICAL_COLORS.bone.main} stroke={MEDICAL_COLORS.bone.outline} strokeWidth="1.5"/>
        
        {/* Tibial plateau */}
        <path d="M35 125 Q80 115 130 125 L130 140 Q80 150 35 140 Z" fill={MEDICAL_COLORS.bone.main} stroke={MEDICAL_COLORS.bone.outline} strokeWidth="1"/>
        
        {/* Tibia shaft */}
        <path d="M45 140 L40 210 L80 210 L75 140" fill={MEDICAL_COLORS.bone.main} stroke={MEDICAL_COLORS.bone.outline} strokeWidth="1"/>
        
        {/* Fibula */}
        <path d="M115 140 L120 210 L130 210 L125 135" fill={MEDICAL_COLORS.bone.main} stroke={MEDICAL_COLORS.bone.outline} strokeWidth="1"/>
      </g>
    )}

    {/* Cartilage/Menisci */}
    {(visibleLayers.includes("skeletal") || visibleLayers.includes("organs")) && (
      <g id="knee-cartilage">
        {/* Menisci */}
        <path d="M45 125 Q60 135 75 125" fill="none" stroke={MEDICAL_COLORS.cartilage} strokeWidth="4" strokeLinecap="round"/>
        <path d="M90 125 Q105 135 120 125" fill="none" stroke={MEDICAL_COLORS.cartilage} strokeWidth="4" strokeLinecap="round"/>
        
        {/* Articular cartilage */}
        <path d="M45 100 Q60 108 75 100" fill="none" stroke={MEDICAL_COLORS.cartilage} strokeWidth="2"/>
        <path d="M90 100 Q105 108 120 100" fill="none" stroke={MEDICAL_COLORS.cartilage} strokeWidth="2"/>
      </g>
    )}

    {visibleLayers.includes("muscular") && (
      <g id="knee-ligaments" opacity="0.8">
        {/* ACL */}
        <path d="M70 100 L95 130" stroke={MEDICAL_COLORS.muscle.tendon} strokeWidth="3"/>
        {/* PCL */}
        <path d="M95 100 L70 130" stroke={MEDICAL_COLORS.muscle.tendon} strokeWidth="3"/>
        {/* MCL */}
        <path d="M50 85 L45 145" stroke={MEDICAL_COLORS.muscle.tendon} strokeWidth="2"/>
        {/* LCL */}
        <path d="M115 85 L120 145" stroke={MEDICAL_COLORS.muscle.tendon} strokeWidth="2"/>
        {/* Patellar tendon */}
        <path d="M82 125 L75 145" stroke={MEDICAL_COLORS.muscle.tendon} strokeWidth="4"/>
      </g>
    )}

    {visibleLayers.includes("labels") && (
      <g fontSize="6" fill="#333">
        <text x="70" y="25">Femur</text>
        <text x="135" y="105">Patella</text>
        <text x="5" y="180">Tibia</text>
        <text x="125" y="180">Fibula</text>
        <text x="70" y="145">ACL/PCL</text>
        <text x="5" y="135">Meniscus</text>
      </g>
    )}
  </svg>
);

// ===== DENTAL ARCH PROFESSIONAL =====
export const DentalArchProfessionalSVG: React.FC<{ visibleLayers: AnatomyLayer[] }> = ({ visibleLayers }) => (
  <svg viewBox="0 0 220 280" className="w-full h-full">
    {visibleLayers.includes("skeletal") && (
      <g id="dental-structure">
        {/* Upper arch - maxilla */}
        <path d="M30 80 Q110 25 190 80" fill="none" stroke={MEDICAL_COLORS.bone.outline} strokeWidth="2"/>
        
        {/* Upper teeth */}
        {/* Right side - 8 7 6 5 4 3 2 1 */}
        <rect x="33" y="60" width="12" height="20" rx="2" fill={MEDICAL_COLORS.bone.main} stroke={MEDICAL_COLORS.bone.outline} strokeWidth="0.8"/>
        <rect x="47" y="55" width="14" height="22" rx="2" fill={MEDICAL_COLORS.bone.main} stroke={MEDICAL_COLORS.bone.outline} strokeWidth="0.8"/>
        <rect x="63" y="48" width="15" height="24" rx="2" fill={MEDICAL_COLORS.bone.main} stroke={MEDICAL_COLORS.bone.outline} strokeWidth="0.8"/>
        <rect x="80" y="43" width="11" height="22" rx="2" fill={MEDICAL_COLORS.bone.main} stroke={MEDICAL_COLORS.bone.outline} strokeWidth="0.8"/>
        <rect x="93" y="40" width="10" height="20" rx="2" fill={MEDICAL_COLORS.bone.main} stroke={MEDICAL_COLORS.bone.outline} strokeWidth="0.8"/>
        <path d="M105 38 L110 60 L115 38 Z" fill={MEDICAL_COLORS.bone.main} stroke={MEDICAL_COLORS.bone.outline} strokeWidth="0.8"/>
        <rect x="117" y="35" width="9" height="22" rx="2" fill={MEDICAL_COLORS.bone.main} stroke={MEDICAL_COLORS.bone.outline} strokeWidth="0.8"/>
        <rect x="128" y="32" width="10" height="25" rx="2" fill={MEDICAL_COLORS.bone.main} stroke={MEDICAL_COLORS.bone.outline} strokeWidth="0.8"/>
        
        {/* Left side - 1 2 3 4 5 6 7 8 */}
        <rect x="140" y="32" width="10" height="25" rx="2" fill={MEDICAL_COLORS.bone.main} stroke={MEDICAL_COLORS.bone.outline} strokeWidth="0.8"/>
        <rect x="152" y="35" width="9" height="22" rx="2" fill={MEDICAL_COLORS.bone.main} stroke={MEDICAL_COLORS.bone.outline} strokeWidth="0.8"/>
        <path d="M163 38 L168 60 L173 38 Z" fill={MEDICAL_COLORS.bone.main} stroke={MEDICAL_COLORS.bone.outline} strokeWidth="0.8"/>
        <rect x="175" y="40" width="10" height="20" rx="2" fill={MEDICAL_COLORS.bone.main} stroke={MEDICAL_COLORS.bone.outline} strokeWidth="0.8"/>
        <rect x="187" y="43" width="11" height="22" rx="2" fill={MEDICAL_COLORS.bone.main} stroke={MEDICAL_COLORS.bone.outline} strokeWidth="0.8"/>
        <rect x="200" y="48" width="15" height="24" rx="2" fill={MEDICAL_COLORS.bone.main} stroke={MEDICAL_COLORS.bone.outline} strokeWidth="0.8"/>
        <rect x="217" y="55" width="14" height="22" rx="3" fill={MEDICAL_COLORS.bone.main} stroke={MEDICAL_COLORS.bone.outline} strokeWidth="0.8" transform="translate(-62 0)"/>
        <rect x="248" y="60" width="12" height="20" rx="3" fill={MEDICAL_COLORS.bone.main} stroke={MEDICAL_COLORS.bone.outline} strokeWidth="0.8" transform="translate(-73 0)"/>

        {/* Divider line */}
        <line x1="20" y1="140" x2="200" y2="140" stroke="#ccc" strokeWidth="1" strokeDasharray="5,3"/>
        <text x="8" y="75" fontSize="8" fill="#666">Upper</text>
        <text x="8" y="200" fontSize="8" fill="#666">Lower</text>

        {/* Lower arch - mandible */}
        <path d="M35 200 Q110 250 185 200" fill="none" stroke={MEDICAL_COLORS.bone.outline} strokeWidth="2"/>
        
        {/* Lower teeth - similar structure */}
        <rect x="35" y="195" width="11" height="18" rx="2" fill={MEDICAL_COLORS.bone.main} stroke={MEDICAL_COLORS.bone.outline} strokeWidth="0.8"/>
        <rect x="48" y="200" width="13" height="20" rx="2" fill={MEDICAL_COLORS.bone.main} stroke={MEDICAL_COLORS.bone.outline} strokeWidth="0.8"/>
        <rect x="63" y="205" width="14" height="22" rx="2" fill={MEDICAL_COLORS.bone.main} stroke={MEDICAL_COLORS.bone.outline} strokeWidth="0.8"/>
        <rect x="79" y="210" width="10" height="18" rx="2" fill={MEDICAL_COLORS.bone.main} stroke={MEDICAL_COLORS.bone.outline} strokeWidth="0.8"/>
        <rect x="91" y="213" width="9" height="16" rx="2" fill={MEDICAL_COLORS.bone.main} stroke={MEDICAL_COLORS.bone.outline} strokeWidth="0.8"/>
        <path d="M102 215 L106 232 L110 215 Z" fill={MEDICAL_COLORS.bone.main} stroke={MEDICAL_COLORS.bone.outline} strokeWidth="0.8"/>
        <rect x="112" y="217" width="8" height="18" rx="2" fill={MEDICAL_COLORS.bone.main} stroke={MEDICAL_COLORS.bone.outline} strokeWidth="0.8"/>
        <rect x="122" y="220" width="9" height="20" rx="2" fill={MEDICAL_COLORS.bone.main} stroke={MEDICAL_COLORS.bone.outline} strokeWidth="0.8"/>
        <rect x="133" y="220" width="9" height="20" rx="2" fill={MEDICAL_COLORS.bone.main} stroke={MEDICAL_COLORS.bone.outline} strokeWidth="0.8"/>
        <rect x="144" y="217" width="8" height="18" rx="2" fill={MEDICAL_COLORS.bone.main} stroke={MEDICAL_COLORS.bone.outline} strokeWidth="0.8"/>
        <path d="M154 215 L158 232 L162 215 Z" fill={MEDICAL_COLORS.bone.main} stroke={MEDICAL_COLORS.bone.outline} strokeWidth="0.8"/>
        <rect x="164" y="213" width="9" height="16" rx="2" fill={MEDICAL_COLORS.bone.main} stroke={MEDICAL_COLORS.bone.outline} strokeWidth="0.8"/>
        <rect x="175" y="210" width="10" height="18" rx="2" fill={MEDICAL_COLORS.bone.main} stroke={MEDICAL_COLORS.bone.outline} strokeWidth="0.8"/>

        {/* Tooth numbering */}
        <text x="36" y="92" fontSize="5" fill="#666">18</text>
        <text x="51" y="87" fontSize="5" fill="#666">17</text>
        <text x="67" y="82" fontSize="5" fill="#666">16</text>
        <text x="83" y="75" fontSize="5" fill="#666">15</text>
        <text x="95" y="70" fontSize="5" fill="#666">14</text>
        <text x="107" y="67" fontSize="5" fill="#666">13</text>
        <text x="119" y="65" fontSize="5" fill="#666">12</text>
        <text x="131" y="63" fontSize="5" fill="#666">11</text>
        <text x="143" y="63" fontSize="5" fill="#666">21</text>
        <text x="155" y="65" fontSize="5" fill="#666">22</text>
        <text x="167" y="67" fontSize="5" fill="#666">23</text>
        <text x="177" y="70" fontSize="5" fill="#666">24</text>
      </g>
    )}

    {visibleLayers.includes("labels") && (
      <g fontSize="7" fill="#333">
        <text x="60" y="125" textAnchor="middle">Molars</text>
        <text x="100" y="115" textAnchor="middle">Premolars</text>
        <text x="130" y="110" textAnchor="middle">Canine</text>
        <text x="145" y="105" textAnchor="middle">Incisors</text>
      </g>
    )}
  </svg>
);

// Export all professional anatomy assets
export const professionalAnatomyAssets: LayeredAnatomyAsset[] = [
  {
    id: "body-anterior",
    name: "Body Anterior",
    category: "body",
    component: FullBodyAnteriorSVG,
    defaultWidth: 200,
    defaultHeight: 400,
    availableLayers: ["skin", "muscular", "skeletal", "vascular", "nervous", "labels"],
    description: "Full body anterior view with all anatomical systems",
  },
  {
    id: "body-posterior",
    name: "Body Posterior",
    category: "body",
    component: FullBodyPosteriorSVG,
    defaultWidth: 200,
    defaultHeight: 400,
    availableLayers: ["skin", "muscular", "skeletal", "labels"],
    description: "Full body posterior view showing back musculature and spine",
  },
  {
    id: "spine-detailed",
    name: "Vertebral Column",
    category: "spine",
    component: DetailedSpineSVG,
    defaultWidth: 120,
    defaultHeight: 320,
    availableLayers: ["skeletal", "nervous", "labels"],
    description: "Detailed vertebral column with all regions labeled",
  },
  {
    id: "skull-detailed",
    name: "Skull (Anterior)",
    category: "head",
    component: DetailedSkullSVG,
    defaultWidth: 160,
    defaultHeight: 180,
    availableLayers: ["skeletal", "labels"],
    description: "Detailed skull anatomy with all bones identified",
  },
  {
    id: "heart-anatomy",
    name: "Heart",
    category: "torso",
    component: HeartAnatomySVG,
    defaultWidth: 160,
    defaultHeight: 160,
    availableLayers: ["organs", "vascular", "labels"],
    description: "Cardiac anatomy with chambers and great vessels",
  },
  {
    id: "knee-joint",
    name: "Knee Joint",
    category: "joints",
    component: KneeJointSVG,
    defaultWidth: 130,
    defaultHeight: 180,
    availableLayers: ["skeletal", "muscular", "labels"],
    description: "Knee joint with ligaments, menisci, and bones",
  },
  {
    id: "dental-arch",
    name: "Dental Arches",
    category: "dental",
    component: DentalArchProfessionalSVG,
    defaultWidth: 180,
    defaultHeight: 230,
    availableLayers: ["skeletal", "labels"],
    description: "Complete dental arches with FDI numbering system",
  },
];
