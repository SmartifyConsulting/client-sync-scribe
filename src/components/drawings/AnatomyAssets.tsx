import React from "react";

// Full body front SVG - Medical professional style
export const FullBodyFrontSVG = () => (
  <svg viewBox="0 0 200 400" className="w-full h-full" fill="none" stroke="currentColor" strokeWidth="1">
    {/* Head */}
    <ellipse cx="100" cy="28" rx="22" ry="25" />
    {/* Neck */}
    <path d="M88 52 L88 68 M112 52 L112 68" />
    {/* Shoulders */}
    <path d="M55 78 C70 72 88 68 100 68 C112 68 130 72 145 78" />
    {/* Torso outline */}
    <path d="M55 78 L50 175 Q60 188 75 192 L100 195 L125 192 Q140 188 150 175 L145 78" />
    {/* Clavicles */}
    <path d="M65 82 L100 88 L135 82" strokeDasharray="2,2" opacity="0.6" />
    {/* Sternum */}
    <line x1="100" y1="88" x2="100" y2="150" strokeDasharray="2,2" opacity="0.5" />
    {/* Ribs indication */}
    <path d="M70 100 Q100 108 130 100" opacity="0.4" />
    <path d="M68 115 Q100 123 132 115" opacity="0.4" />
    <path d="M65 130 Q100 138 135 130" opacity="0.4" />
    {/* Umbilicus */}
    <circle cx="100" cy="165" r="3" opacity="0.5" />
    {/* Arms */}
    <path d="M55 78 L42 120 L30 165 L22 210" />
    <path d="M145 78 L158 120 L170 165 L178 210" />
    {/* Hands */}
    <ellipse cx="20" cy="220" rx="7" ry="12" />
    <ellipse cx="180" cy="220" rx="7" ry="12" />
    {/* Pelvis */}
    <path d="M75 192 Q85 200 100 202 Q115 200 125 192" />
    {/* Legs */}
    <path d="M75 195 L72 270 L68 340 L65 385" />
    <path d="M125 195 L128 270 L132 340 L135 385" />
    {/* Knees */}
    <ellipse cx="70" cy="290" rx="8" ry="10" opacity="0.5" />
    <ellipse cx="130" cy="290" rx="8" ry="10" opacity="0.5" />
    {/* Feet */}
    <path d="M60 385 L55 395 L70 395 L68 385" />
    <path d="M140 385 L145 395 L130 395 L132 385" />
  </svg>
);

// Full body back SVG - Medical professional style
export const FullBodyBackSVG = () => (
  <svg viewBox="0 0 200 400" className="w-full h-full" fill="none" stroke="currentColor" strokeWidth="1">
    {/* Head */}
    <ellipse cx="100" cy="28" rx="22" ry="25" />
    {/* Neck */}
    <path d="M88 52 L88 68 M112 52 L112 68" />
    {/* Spine */}
    <path d="M100 68 L100 195" strokeDasharray="3,2" />
    {/* Vertebrae indicators */}
    {[75, 90, 105, 120, 135, 150, 165, 180].map((y) => (
      <line key={y} x1="96" y1={y} x2="104" y2={y} strokeWidth="1.5" opacity="0.6" />
    ))}
    {/* Shoulders */}
    <path d="M55 78 C70 72 88 68 100 68 C112 68 130 72 145 78" />
    {/* Scapulae */}
    <path d="M65 88 L60 120 L80 130 L90 100 Z" opacity="0.5" />
    <path d="M135 88 L140 120 L120 130 L110 100 Z" opacity="0.5" />
    {/* Torso */}
    <path d="M55 78 L50 175 Q60 188 75 192 L100 195 L125 192 Q140 188 150 175 L145 78" />
    {/* Arms */}
    <path d="M55 78 L42 120 L30 165 L22 210" />
    <path d="M145 78 L158 120 L170 165 L178 210" />
    {/* Hands */}
    <ellipse cx="20" cy="220" rx="7" ry="12" />
    <ellipse cx="180" cy="220" rx="7" ry="12" />
    {/* Gluteal region */}
    <path d="M75 195 Q100 210 125 195" opacity="0.5" />
    {/* Legs */}
    <path d="M75 195 L72 270 L68 340 L65 385" />
    <path d="M125 195 L128 270 L132 340 L135 385" />
    {/* Popliteal region */}
    <path d="M68 285 Q70 295 68 305" opacity="0.5" />
    <path d="M132 285 Q130 295 132 305" opacity="0.5" />
    {/* Feet */}
    <path d="M60 385 L55 395 L70 395 L68 385" />
    <path d="M140 385 L145 395 L130 395 L132 385" />
  </svg>
);

// Spine SVG - Medical style with vertebrae labels
export const SpineSVG = () => (
  <svg viewBox="0 0 100 300" className="w-full h-full" fill="none" stroke="currentColor" strokeWidth="1">
    {/* Cervical C1-C7 */}
    {[0, 11, 22, 33, 44, 55, 66].map((y, i) => (
      <g key={`c${i + 1}`}>
        <rect x="38" y={y + 5} width="24" height="9" rx="2" fill="none" />
        <line x1="38" y1={y + 9.5} x2="28" y2={y + 9.5} opacity="0.4" />
        <text x="22" y={y + 12} fontSize="7" fill="currentColor" stroke="none">C{i + 1}</text>
      </g>
    ))}
    {/* Thoracic T1-T12 */}
    {[0, 11, 22, 33, 44, 55, 66, 77, 88, 99, 110, 121].map((y, i) => (
      <g key={`t${i + 1}`}>
        <rect x="35" y={y + 82} width="30" height="9" rx="2" fill="none" />
        <line x1="65" y1={y + 86.5} x2="78" y2={y + 86.5} opacity="0.4" />
        <text x="80" y={y + 89} fontSize="7" fill="currentColor" stroke="none">T{i + 1}</text>
      </g>
    ))}
    {/* Lumbar L1-L5 */}
    {[0, 13, 26, 39, 52].map((y, i) => (
      <g key={`l${i + 1}`}>
        <rect x="32" y={y + 218} width="36" height="11" rx="2" fill="none" />
        <line x1="32" y1={y + 223.5} x2="22" y2={y + 223.5} opacity="0.4" />
        <text x="10" y={y + 226} fontSize="7" fill="currentColor" stroke="none">L{i + 1}</text>
      </g>
    ))}
    {/* Sacrum */}
    <path d="M40 285 L50 298 L60 285 Z" opacity="0.6" />
    <text x="70" y="293" fontSize="7" fill="currentColor" stroke="none">S</text>
  </svg>
);

// Pelvis SVG - Medical illustration
export const PelvisSVG = () => (
  <svg viewBox="0 0 200 150" className="w-full h-full" fill="none" stroke="currentColor" strokeWidth="1">
    {/* Iliac crests */}
    <path d="M25 35 Q45 15 100 25 Q155 15 175 35" />
    {/* Iliac wings */}
    <path d="M25 35 Q15 65 35 95 Q55 115 75 105" />
    <path d="M175 35 Q185 65 165 95 Q145 115 125 105" />
    {/* Sacrum */}
    <path d="M75 25 L100 50 L125 25" />
    <path d="M80 45 L100 65 L120 45" />
    {/* Coccyx */}
    <circle cx="100" cy="72" r="4" opacity="0.5" />
    {/* Acetabulum (hip sockets) */}
    <circle cx="55" cy="80" r="14" strokeWidth="1.5" />
    <circle cx="55" cy="80" r="6" opacity="0.5" />
    <circle cx="145" cy="80" r="14" strokeWidth="1.5" />
    <circle cx="145" cy="80" r="6" opacity="0.5" />
    {/* Pubic symphysis */}
    <path d="M75 105 Q100 125 125 105" />
    {/* Obturator foramina */}
    <ellipse cx="70" cy="100" rx="10" ry="12" opacity="0.5" />
    <ellipse cx="130" cy="100" rx="10" ry="12" opacity="0.5" />
    {/* Labels */}
    <text x="5" y="30" fontSize="7" fill="currentColor" stroke="none">Ilium</text>
    <text x="88" y="145" fontSize="7" fill="currentColor" stroke="none">Pubis</text>
  </svg>
);

// Face front SVG - Medical style
export const FaceFrontSVG = () => (
  <svg viewBox="0 0 200 250" className="w-full h-full" fill="none" stroke="currentColor" strokeWidth="1">
    {/* Face outline */}
    <ellipse cx="100" cy="115" rx="65" ry="85" />
    {/* Skull vault indication */}
    <path d="M45 65 Q60 25 100 20 Q140 25 155 65" strokeDasharray="3,2" opacity="0.5" />
    {/* Supraorbital margins */}
    <path d="M50 85 L80 82 M120 82 L150 85" opacity="0.6" />
    {/* Orbits */}
    <ellipse cx="70" cy="100" rx="18" ry="12" />
    <ellipse cx="130" cy="100" rx="18" ry="12" />
    {/* Pupils */}
    <circle cx="70" cy="100" r="5" />
    <circle cx="130" cy="100" r="5" />
    {/* Nasal bridge */}
    <path d="M100" y1="90" x2="100" y2="135" />
    <path d="M93 90 L100 85 L107 90" opacity="0.5" />
    {/* Nasal ala */}
    <path d="M88 135 Q95 142 100 138 Q105 142 112 135" />
    {/* Philtrum */}
    <path d="M97 142 L100 155 L103 142" opacity="0.4" />
    {/* Oral region */}
    <path d="M78 160 Q100 155 122 160" />
    <path d="M78 160 Q100 172 122 160" />
    {/* Mental region */}
    <ellipse cx="100" cy="185" rx="20" ry="12" opacity="0.3" />
    {/* Ears */}
    <path d="M35 95 Q28 95 28 115 Q28 135 38 140" />
    <path d="M165 95 Q172 95 172 115 Q172 135 162 140" />
    {/* Temporal regions */}
    <path d="M42 75 Q35 90 38 105" opacity="0.4" />
    <path d="M158 75 Q165 90 162 105" opacity="0.4" />
  </svg>
);

// Face side profile SVG - Medical style
export const FaceSideSVG = () => (
  <svg viewBox="0 0 180 250" className="w-full h-full" fill="none" stroke="currentColor" strokeWidth="1">
    {/* Skull profile */}
    <path d="M120 20 Q150 30 158 65 Q165 100 155 130 Q140 170 105 195 Q85 200 75 185 Q60 165 65 140 Q50 135 48 110 Q48 70 75 40 Q95 22 120 20" />
    {/* Orbit */}
    <ellipse cx="130" cy="95" rx="14" ry="10" />
    <circle cx="135" cy="95" r="4" />
    {/* Eyebrow */}
    <path d="M118 82 Q135 78 148 85" strokeWidth="1.5" />
    {/* Zygomatic arch */}
    <path d="M145 100 L155 105 L145 125" opacity="0.5" />
    {/* Nasal bone */}
    <path d="M145 90 Q152 100 155 115" strokeWidth="1.5" />
    {/* Nasal cartilage */}
    <path d="M155 115 Q162 125 155 135 L140 140" />
    {/* Lips */}
    <path d="M140 155 Q145 152 148 155" />
    <path d="M140 155 Q145 162 150 158" />
    {/* Mandible */}
    <path d="M130 160 Q120 175 105 195" />
    <path d="M75 185 Q90 188 105 195" />
    {/* External ear */}
    <path d="M70 90 Q55 95 55 115 Q55 135 68 140" />
    <path d="M65 100 Q60 110 62 125" opacity="0.5" />
    {/* Mastoid */}
    <circle cx="70" cy="145" r="5" opacity="0.4" />
    {/* Neck structures */}
    <path d="M98 195 L90 245" />
    <path d="M75 185 L60 245" />
    {/* Cervical spine indication */}
    <path d="M75 200 L80 245" strokeDasharray="2,2" opacity="0.5" />
  </svg>
);

// Knee SVG - Medical style
export const KneeSVG = () => (
  <svg viewBox="0 0 120 180" className="w-full h-full" fill="none" stroke="currentColor" strokeWidth="1">
    {/* Femur shaft */}
    <path d="M48 5 L52 55" />
    <path d="M72 5 L68 55" />
    {/* Femoral condyles */}
    <ellipse cx="50" cy="70" rx="15" ry="18" />
    <ellipse cx="70" cy="70" rx="15" ry="18" />
    {/* Patella */}
    <ellipse cx="60" cy="85" rx="18" ry="16" strokeWidth="1.5" />
    {/* Tibial plateau */}
    <path d="M35 100 L85 100" strokeWidth="1.5" />
    <line x1="60" y1="100" x2="60" y2="95" strokeDasharray="2,2" opacity="0.5" />
    {/* Tibia */}
    <path d="M42 105 L38 170" />
    <path d="M78 105 L82 170" />
    {/* Fibula */}
    <path d="M88 108 L92 165" />
    {/* Menisci */}
    <path d="M40 98 Q60 105 80 98" strokeDasharray="2,2" opacity="0.6" />
    {/* Joint space */}
    <path d="M38 92 L82 92" opacity="0.4" strokeDasharray="1,2" />
    {/* Labels */}
    <text x="85" y="15" fontSize="7" fill="currentColor" stroke="none">Femur</text>
    <text x="85" y="85" fontSize="7" fill="currentColor" stroke="none">Patella</text>
    <text x="85" y="140" fontSize="7" fill="currentColor" stroke="none">Tibia</text>
  </svg>
);

// Shoulder SVG - Medical style
export const ShoulderSVG = () => (
  <svg viewBox="0 0 180 150" className="w-full h-full" fill="none" stroke="currentColor" strokeWidth="1">
    {/* Clavicle */}
    <path d="M15 35 Q55 25 85 45" strokeWidth="1.5" />
    {/* Acromion */}
    <path d="M85 45 Q100 38 110 42" strokeWidth="1.5" />
    {/* Scapula body */}
    <path d="M55 48 L45 100 L85 120 L95 70 Z" />
    {/* Scapular spine */}
    <path d="M55 55 L92 48" opacity="0.6" />
    {/* Glenoid fossa */}
    <ellipse cx="98" cy="68" rx="8" ry="12" strokeWidth="1.5" />
    {/* Humeral head */}
    <circle cx="115" cy="65" r="22" />
    {/* Anatomical neck */}
    <path d="M98 75 Q115 92 132 75" strokeDasharray="2,2" opacity="0.5" />
    {/* Greater tuberosity */}
    <circle cx="130" cy="52" r="6" opacity="0.5" />
    {/* Humeral shaft */}
    <path d="M100 85 L92 145" />
    <path d="M130 85 L138 145" />
    {/* Labels */}
    <text x="5" y="30" fontSize="7" fill="currentColor" stroke="none">Clavicle</text>
    <text x="40" y="135" fontSize="7" fill="currentColor" stroke="none">Scapula</text>
    <text x="140" y="70" fontSize="7" fill="currentColor" stroke="none">Humerus</text>
  </svg>
);

// Hand SVG - Medical style with bones
export const HandSVG = () => (
  <svg viewBox="0 0 120 160" className="w-full h-full" fill="none" stroke="currentColor" strokeWidth="1">
    {/* Carpals */}
    <rect x="35" y="55" width="50" height="25" rx="5" opacity="0.5" />
    {/* Metacarpals */}
    <line x1="38" y1="80" x2="30" y2="115" />
    <line x1="48" y1="80" x2="45" y2="120" />
    <line x1="60" y1="80" x2="60" y2="122" />
    <line x1="72" y1="80" x2="75" y2="120" />
    <line x1="82" y1="80" x2="90" y2="110" />
    {/* Thumb */}
    <path d="M30 75 Q18 72 12 60 Q10 48 18 40" />
    <circle cx="18" cy="38" r="6" opacity="0.5" />
    {/* Index phalanges */}
    <path d="M30 115 L28 135 L26 150" />
    <circle cx="29" cy="125" r="2" opacity="0.5" />
    <circle cx="27" cy="142" r="2" opacity="0.5" />
    {/* Middle phalanges */}
    <path d="M45 120 L43 142 L41 158" />
    <circle cx="44" cy="131" r="2" opacity="0.5" />
    <circle cx="42" cy="150" r="2" opacity="0.5" />
    {/* Ring phalanges */}
    <path d="M60 122 L60 143 L60 158" />
    <circle cx="60" cy="132" r="2" opacity="0.5" />
    <circle cx="60" cy="150" r="2" opacity="0.5" />
    {/* Little phalanges */}
    <path d="M75 120 L78 138 L80 152" />
    <circle cx="76" cy="129" r="2" opacity="0.5" />
    <circle cx="79" cy="145" r="2" opacity="0.5" />
    {/* Pinky phalanges */}
    <path d="M90 110 L94 125 L96 138" />
    <circle cx="92" cy="118" r="2" opacity="0.5" />
    <circle cx="95" cy="132" r="2" opacity="0.5" />
    {/* Radius/Ulna indication */}
    <path d="M35 55 L32 20" opacity="0.5" />
    <path d="M85 55 L88 20" opacity="0.5" />
  </svg>
);

// Foot SVG - Medical style with bones
export const FootSVG = () => (
  <svg viewBox="0 0 100 180" className="w-full h-full" fill="none" stroke="currentColor" strokeWidth="1">
    {/* Talus */}
    <ellipse cx="50" cy="25" rx="22" ry="18" />
    {/* Calcaneus */}
    <path d="M28 35 Q18 55 22 80 Q28 100 38 108" />
    <ellipse cx="30" cy="70" rx="12" ry="25" opacity="0.3" />
    {/* Navicular */}
    <ellipse cx="65" cy="50" rx="12" ry="10" opacity="0.5" />
    {/* Cuboid */}
    <rect x="45" y="75" width="18" height="15" rx="3" opacity="0.4" />
    {/* Metatarsals */}
    <line x1="55" y1="90" x2="50" y2="130" />
    <line x1="62" y1="88" x2="62" y2="132" />
    <line x1="70" y1="85" x2="75" y2="130" />
    <line x1="78" y1="80" x2="85" y2="125" />
    <line x1="85" y1="75" x2="92" y2="118" />
    {/* Phalanges */}
    <path d="M50 130 L48 145 L46 155" />
    <path d="M62 132 L62 150 L62 162" />
    <path d="M75 130 L78 148 L80 160" />
    <path d="M85 125 L90 140 L93 150" />
    <path d="M92 118 L96 130 L98 138" />
    {/* Tibia/Fibula indication */}
    <path d="M40 25 L35 5" opacity="0.5" />
    <path d="M60 25 L65 5" opacity="0.5" />
    {/* Medial arch */}
    <path d="M38 108 Q50 125 50 130" strokeDasharray="2,2" opacity="0.4" />
  </svg>
);

// ===== COSMETIC SURGERY ANATOMY =====

// Breast anatomy - Medical style
export const BreastSVG = () => (
  <svg viewBox="0 0 160 140" className="w-full h-full" fill="none" stroke="currentColor" strokeWidth="1">
    {/* Chest wall */}
    <path d="M10 30 L150 30" strokeDasharray="3,2" opacity="0.4" />
    {/* Right breast */}
    <path d="M25 30 Q15 55 25 85 Q40 110 60 105 Q80 100 85 75 Q90 50 80 30" />
    {/* Right areola */}
    <circle cx="55" cy="70" r="12" opacity="0.6" />
    <circle cx="55" cy="70" r="4" />
    {/* Right breast contour lines */}
    <path d="M35 45 Q55 55 75 45" strokeDasharray="2,2" opacity="0.3" />
    {/* Left breast */}
    <path d="M75 30 Q70 50 75 75 Q80 100 100 105 Q120 110 135 85 Q145 55 135 30" />
    {/* Left areola */}
    <circle cx="105" cy="70" r="12" opacity="0.6" />
    <circle cx="105" cy="70" r="4" />
    {/* Left breast contour lines */}
    <path d="M85 45 Q105 55 125 45" strokeDasharray="2,2" opacity="0.3" />
    {/* Inframammary fold */}
    <path d="M25 95 Q60 115 80 108 Q100 115 135 95" opacity="0.5" />
    {/* Sternum */}
    <line x1="80" y1="30" x2="80" y2="110" strokeDasharray="3,2" opacity="0.4" />
    {/* Labels */}
    <text x="45" y="130" fontSize="7" fill="currentColor" stroke="none">Areola</text>
    <text x="5" y="95" fontSize="6" fill="currentColor" stroke="none">IMF</text>
  </svg>
);

// Nose anatomy - Medical style
export const NoseSVG = () => (
  <svg viewBox="0 0 100 140" className="w-full h-full" fill="none" stroke="currentColor" strokeWidth="1">
    {/* Nasal bones */}
    <path d="M40 15 L50 10 L60 15" strokeWidth="1.5" />
    <path d="M40 15 L50 50" />
    <path d="M60 15 L50 50" />
    {/* Upper lateral cartilage */}
    <path d="M35 45 Q50 40 65 45" opacity="0.6" />
    <path d="M35 45 L40 65" opacity="0.5" />
    <path d="M65 45 L60 65" opacity="0.5" />
    {/* Lower lateral cartilage */}
    <path d="M30 75 Q40 60 50 65 Q60 60 70 75" />
    <path d="M30 75 Q35 85 50 90 Q65 85 70 75" />
    {/* Tip defining points */}
    <circle cx="45" cy="78" r="2" opacity="0.5" />
    <circle cx="55" cy="78" r="2" opacity="0.5" />
    {/* Columella */}
    <path d="M45 90 L50 105 L55 90" />
    {/* Nostrils */}
    <ellipse cx="38" cy="95" rx="8" ry="10" opacity="0.5" />
    <ellipse cx="62" cy="95" rx="8" ry="10" opacity="0.5" />
    {/* Alar base */}
    <path d="M28 100 Q38 108 50 105 Q62 108 72 100" />
    {/* Nasal septum */}
    <line x1="50" y1="65" x2="50" y2="105" strokeDasharray="2,2" opacity="0.4" />
    {/* Labels */}
    <text x="5" y="20" fontSize="6" fill="currentColor" stroke="none">Nasal bone</text>
    <text x="5" y="80" fontSize="6" fill="currentColor" stroke="none">Alar</text>
    <text x="60" y="130" fontSize="6" fill="currentColor" stroke="none">Columella</text>
  </svg>
);

// Calf anatomy - Medical style
export const CalfSVG = () => (
  <svg viewBox="0 0 100 180" className="w-full h-full" fill="none" stroke="currentColor" strokeWidth="1">
    {/* Knee joint */}
    <ellipse cx="50" cy="15" rx="25" ry="12" opacity="0.5" />
    {/* Gastrocnemius medial head */}
    <path d="M25 25 Q20 60 25 100 Q30 130 40 145" />
    {/* Gastrocnemius lateral head */}
    <path d="M75 25 Q80 60 75 100 Q70 130 60 145" />
    {/* Muscle belly */}
    <path d="M25 50 Q50 75 75 50" strokeDasharray="2,2" opacity="0.4" />
    <path d="M28 80 Q50 100 72 80" strokeDasharray="2,2" opacity="0.4" />
    {/* Achilles tendon */}
    <path d="M40 145 Q50 155 60 145" />
    <path d="M43 150 L47 175" />
    <path d="M57 150 L53 175" />
    {/* Tibia outline */}
    <path d="M35 25 L32 165" opacity="0.4" />
    {/* Fibula outline */}
    <path d="M68 25 L72 165" opacity="0.4" />
    {/* Soleus indication */}
    <path d="M30 100 Q50 115 70 100" opacity="0.5" />
    {/* Labels */}
    <text x="5" y="60" fontSize="6" fill="currentColor" stroke="none">Gastroc.</text>
    <text x="5" y="115" fontSize="6" fill="currentColor" stroke="none">Soleus</text>
    <text x="38" y="172" fontSize="6" fill="currentColor" stroke="none">Achilles</text>
  </svg>
);

// Neck anatomy - Medical style
export const NeckSVG = () => (
  <svg viewBox="0 0 140 160" className="w-full h-full" fill="none" stroke="currentColor" strokeWidth="1">
    {/* Mandible */}
    <path d="M25 20 Q70 30 115 20" strokeWidth="1.5" />
    {/* Sternocleidomastoid */}
    <path d="M30 25 Q25 70 20 120 L35 140" opacity="0.7" />
    <path d="M110 25 Q115 70 120 120 L105 140" opacity="0.7" />
    {/* Platysma region */}
    <path d="M40 30 L35 140" strokeDasharray="2,2" opacity="0.3" />
    <path d="M100 30 L105 140" strokeDasharray="2,2" opacity="0.3" />
    {/* Thyroid cartilage (Adam's apple) */}
    <path d="M60 55 L70 45 L80 55 L80 70 L70 75 L60 70 Z" />
    {/* Cricoid cartilage */}
    <ellipse cx="70" cy="85" rx="12" ry="6" />
    {/* Trachea */}
    <path d="M65 90 L65 140" strokeDasharray="3,2" />
    <path d="M75 90 L75 140" strokeDasharray="3,2" />
    {/* Hyoid */}
    <path d="M55 42 Q70 38 85 42" strokeWidth="1.5" opacity="0.6" />
    {/* Cervical vertebrae indication */}
    <path d="M70 30 L70 140" strokeDasharray="4,3" opacity="0.3" />
    {/* Suprasternal notch */}
    <path d="M50 138 Q70 145 90 138" />
    {/* Clavicles */}
    <path d="M20 145 L65 140" opacity="0.5" />
    <path d="M120 145 L75 140" opacity="0.5" />
    {/* Labels */}
    <text x="5" y="80" fontSize="6" fill="currentColor" stroke="none">SCM</text>
    <text x="85" y="60" fontSize="6" fill="currentColor" stroke="none">Thyroid</text>
  </svg>
);

// ===== DENTAL ANATOMY =====

// Dental arch - Upper and lower with tooth types
export const DentalArchSVG = () => (
  <svg viewBox="0 0 200 220" className="w-full h-full" fill="none" stroke="currentColor" strokeWidth="1">
    {/* Upper arch */}
    <path d="M30 70 Q100 20 170 70" strokeWidth="1.5" />
    
    {/* Upper teeth - right side (patient's left) */}
    {/* Central incisor */}
    <rect x="92" y="35" width="8" height="18" rx="2" />
    <text x="94" y="58" fontSize="5" fill="currentColor" stroke="none">1</text>
    {/* Lateral incisor */}
    <rect x="82" y="33" width="7" height="16" rx="2" />
    <text x="83" y="54" fontSize="5" fill="currentColor" stroke="none">2</text>
    {/* Canine */}
    <path d="M72 32 L72 50 L78 50 L78 30 Z" />
    <text x="72" y="56" fontSize="5" fill="currentColor" stroke="none">3</text>
    {/* 1st premolar */}
    <rect x="60" y="35" width="9" height="14" rx="2" />
    <text x="62" y="54" fontSize="5" fill="currentColor" stroke="none">4</text>
    {/* 2nd premolar */}
    <rect x="48" y="40" width="9" height="14" rx="2" />
    <text x="50" y="59" fontSize="5" fill="currentColor" stroke="none">5</text>
    {/* 1st molar */}
    <rect x="35" y="48" width="11" height="16" rx="2" />
    <circle cx="40.5" cy="52" r="2" opacity="0.4" />
    <text x="37" y="70" fontSize="5" fill="currentColor" stroke="none">6</text>
    {/* 2nd molar */}
    <rect x="25" y="58" width="10" height="15" rx="2" />
    <text x="27" y="78" fontSize="5" fill="currentColor" stroke="none">7</text>

    {/* Upper teeth - left side (patient's right) */}
    {/* Central incisor */}
    <rect x="100" y="35" width="8" height="18" rx="2" />
    <text x="102" y="58" fontSize="5" fill="currentColor" stroke="none">1</text>
    {/* Lateral incisor */}
    <rect x="111" y="33" width="7" height="16" rx="2" />
    <text x="112" y="54" fontSize="5" fill="currentColor" stroke="none">2</text>
    {/* Canine */}
    <path d="M122 30 L122 50 L128 50 L128 32 Z" />
    <text x="122" y="56" fontSize="5" fill="currentColor" stroke="none">3</text>
    {/* 1st premolar */}
    <rect x="131" y="35" width="9" height="14" rx="2" />
    <text x="133" y="54" fontSize="5" fill="currentColor" stroke="none">4</text>
    {/* 2nd premolar */}
    <rect x="143" y="40" width="9" height="14" rx="2" />
    <text x="145" y="59" fontSize="5" fill="currentColor" stroke="none">5</text>
    {/* 1st molar */}
    <rect x="154" y="48" width="11" height="16" rx="2" />
    <circle cx="159.5" cy="52" r="2" opacity="0.4" />
    <text x="157" y="70" fontSize="5" fill="currentColor" stroke="none">6</text>
    {/* 2nd molar */}
    <rect x="165" y="58" width="10" height="15" rx="2" />
    <text x="167" y="78" fontSize="5" fill="currentColor" stroke="none">7</text>

    {/* Divider */}
    <line x1="20" y1="110" x2="180" y2="110" strokeDasharray="4,2" opacity="0.3" />
    <text x="5" y="55" fontSize="7" fill="currentColor" stroke="none">Upper</text>

    {/* Lower arch */}
    <path d="M35 150 Q100 200 165 150" strokeWidth="1.5" />
    <text x="5" y="170" fontSize="7" fill="currentColor" stroke="none">Lower</text>

    {/* Lower teeth - right side */}
    <rect x="92" y="165" width="8" height="16" rx="2" />
    <rect x="82" y="167" width="7" height="14" rx="2" />
    <path d="M72 170 L72 185 L78 185 L78 168 Z" />
    <rect x="60" y="168" width="9" height="13" rx="2" />
    <rect x="48" y="165" width="9" height="13" rx="2" />
    <rect x="36" y="158" width="11" height="14" rx="2" />
    <rect x="28" y="150" width="10" height="13" rx="2" />

    {/* Lower teeth - left side */}
    <rect x="100" y="165" width="8" height="16" rx="2" />
    <rect x="111" y="167" width="7" height="14" rx="2" />
    <path d="M122 168 L122 185 L128 185 L128 170 Z" />
    <rect x="131" y="168" width="9" height="13" rx="2" />
    <rect x="143" y="165" width="9" height="13" rx="2" />
    <rect x="153" y="158" width="11" height="14" rx="2" />
    <rect x="162" y="150" width="10" height="13" rx="2" />

    {/* Legend */}
    <text x="5" y="210" fontSize="6" fill="currentColor" stroke="none">1-Incisor 2-Lateral 3-Canine 4,5-Premolar 6,7-Molar</text>
  </svg>
);

// Single tooth anatomy
export const ToothSVG = () => (
  <svg viewBox="0 0 80 140" className="w-full h-full" fill="none" stroke="currentColor" strokeWidth="1">
    {/* Crown */}
    <path d="M25 10 Q40 5 55 10 Q60 20 58 40 L50 55 L40 58 L30 55 L22 40 Q20 20 25 10" strokeWidth="1.5" />
    {/* Enamel layer */}
    <path d="M27 12 Q40 8 53 12 Q57 20 55 38 L48 50 L40 52 L32 50 L25 38 Q23 20 27 12" strokeDasharray="2,2" opacity="0.5" />
    {/* Cusps */}
    <path d="M30 15 L35 25 L40 12 L45 25 L50 15" opacity="0.5" />
    {/* Dentin */}
    <path d="M32 45 Q40 60 48 45" opacity="0.4" />
    {/* Neck */}
    <path d="M28 55 L28 65 M52 55 L52 65" />
    {/* Pulp chamber */}
    <path d="M35 35 L37 70 L40 85 L43 70 L45 35" opacity="0.6" fill="none" />
    {/* Root(s) */}
    <path d="M30 60 Q28 90 32 120" />
    <path d="M50 60 Q52 90 48 120" />
    {/* Root canals */}
    <path d="M33 70 L34 115" strokeDasharray="2,2" opacity="0.5" />
    <path d="M47 70 L46 115" strokeDasharray="2,2" opacity="0.5" />
    {/* Apex */}
    <circle cx="33" cy="122" r="2" opacity="0.5" />
    <circle cx="47" cy="122" r="2" opacity="0.5" />
    {/* Cementum indication */}
    <path d="M30 65 L28 110" strokeDasharray="1,2" opacity="0.3" />
    <path d="M50 65 L52 110" strokeDasharray="1,2" opacity="0.3" />
    {/* Labels */}
    <text x="5" y="25" fontSize="6" fill="currentColor" stroke="none">Crown</text>
    <text x="55" y="60" fontSize="6" fill="currentColor" stroke="none">Neck</text>
    <text x="5" y="95" fontSize="6" fill="currentColor" stroke="none">Root</text>
    <text x="5" y="130" fontSize="6" fill="currentColor" stroke="none">Apex</text>
  </svg>
);

export interface AnatomyAsset {
  id: string;
  name: string;
  category: "body" | "spine" | "face" | "joints" | "cosmetic" | "dental";
  component: React.FC;
  width: number;
  height: number;
}

export const anatomyAssets: AnatomyAsset[] = [
  // Body
  { id: "body-front", name: "Body (Front)", category: "body", component: FullBodyFrontSVG, width: 120, height: 240 },
  { id: "body-back", name: "Body (Back)", category: "body", component: FullBodyBackSVG, width: 120, height: 240 },
  // Spine
  { id: "spine", name: "Spine", category: "spine", component: SpineSVG, width: 80, height: 200 },
  { id: "pelvis", name: "Pelvis", category: "spine", component: PelvisSVG, width: 140, height: 100 },
  // Face
  { id: "face-front", name: "Face (Front)", category: "face", component: FaceFrontSVG, width: 120, height: 150 },
  { id: "face-side", name: "Face (Side)", category: "face", component: FaceSideSVG, width: 110, height: 150 },
  // Joints
  { id: "shoulder", name: "Shoulder", category: "joints", component: ShoulderSVG, width: 120, height: 100 },
  { id: "knee", name: "Knee", category: "joints", component: KneeSVG, width: 80, height: 120 },
  { id: "hand", name: "Hand", category: "joints", component: HandSVG, width: 80, height: 110 },
  { id: "foot", name: "Foot", category: "joints", component: FootSVG, width: 70, height: 120 },
  // Cosmetic
  { id: "breast", name: "Breast", category: "cosmetic", component: BreastSVG, width: 130, height: 110 },
  { id: "nose", name: "Nose", category: "cosmetic", component: NoseSVG, width: 80, height: 110 },
  { id: "calf", name: "Calf", category: "cosmetic", component: CalfSVG, width: 80, height: 140 },
  { id: "neck", name: "Neck", category: "cosmetic", component: NeckSVG, width: 110, height: 130 },
  // Dental
  { id: "dental-arch", name: "Dental Arch", category: "dental", component: DentalArchSVG, width: 160, height: 175 },
  { id: "tooth", name: "Tooth Anatomy", category: "dental", component: ToothSVG, width: 70, height: 120 },
];
