import React from "react";

// Full body front SVG
export const FullBodyFrontSVG = () => (
  <svg viewBox="0 0 200 400" className="w-full h-full" fill="none" stroke="currentColor" strokeWidth="1.5">
    {/* Head */}
    <ellipse cx="100" cy="30" rx="25" ry="28" />
    {/* Neck */}
    <line x1="90" y1="58" x2="90" y2="75" />
    <line x1="110" y1="58" x2="110" y2="75" />
    {/* Shoulders */}
    <line x1="60" y1="85" x2="140" y2="85" />
    {/* Torso */}
    <path d="M60 85 L55 180 L75 195 L100 200 L125 195 L145 180 L140 85" />
    {/* Arms */}
    <path d="M60 85 L45 130 L35 180 L25 220" />
    <path d="M140 85 L155 130 L165 180 L175 220" />
    {/* Hands */}
    <ellipse cx="22" cy="228" rx="8" ry="12" />
    <ellipse cx="178" cy="228" rx="8" ry="12" />
    {/* Legs */}
    <path d="M75 195 L70 280 L65 360 L60 390" />
    <path d="M125 195 L130 280 L135 360 L140 390" />
    {/* Feet */}
    <ellipse cx="55" cy="395" rx="12" ry="6" />
    <ellipse cx="145" cy="395" rx="12" ry="6" />
    {/* Center line reference */}
    <line x1="100" y1="200" x2="100" y2="195" strokeDasharray="3,3" opacity="0.5" />
  </svg>
);

// Full body back SVG
export const FullBodyBackSVG = () => (
  <svg viewBox="0 0 200 400" className="w-full h-full" fill="none" stroke="currentColor" strokeWidth="1.5">
    {/* Head */}
    <ellipse cx="100" cy="30" rx="25" ry="28" />
    {/* Neck */}
    <line x1="90" y1="58" x2="90" y2="75" />
    <line x1="110" y1="58" x2="110" y2="75" />
    {/* Spine indication */}
    <line x1="100" y1="75" x2="100" y2="195" strokeDasharray="5,3" />
    {/* Shoulders */}
    <line x1="60" y1="85" x2="140" y2="85" />
    {/* Torso */}
    <path d="M60 85 L55 180 L75 195 L100 200 L125 195 L145 180 L140 85" />
    {/* Shoulder blades */}
    <ellipse cx="80" cy="110" rx="15" ry="20" opacity="0.5" />
    <ellipse cx="120" cy="110" rx="15" ry="20" opacity="0.5" />
    {/* Arms */}
    <path d="M60 85 L45 130 L35 180 L25 220" />
    <path d="M140 85 L155 130 L165 180 L175 220" />
    {/* Hands */}
    <ellipse cx="22" cy="228" rx="8" ry="12" />
    <ellipse cx="178" cy="228" rx="8" ry="12" />
    {/* Legs */}
    <path d="M75 195 L70 280 L65 360 L60 390" />
    <path d="M125 195 L130 280 L135 360 L140 390" />
    {/* Feet */}
    <ellipse cx="55" cy="395" rx="12" ry="6" />
    <ellipse cx="145" cy="395" rx="12" ry="6" />
  </svg>
);

// Spine SVG
export const SpineSVG = () => (
  <svg viewBox="0 0 100 300" className="w-full h-full" fill="none" stroke="currentColor" strokeWidth="1.5">
    {/* Cervical vertebrae C1-C7 */}
    {[0, 12, 24, 36, 48, 60, 72].map((y, i) => (
      <g key={`c${i + 1}`}>
        <rect x="35" y={y + 5} width="30" height="10" rx="2" />
        <text x="70" y={y + 13} fontSize="8" fill="currentColor" stroke="none">C{i + 1}</text>
      </g>
    ))}
    {/* Thoracic vertebrae T1-T12 */}
    {[0, 12, 24, 36, 48, 60, 72, 84, 96, 108, 120, 132].map((y, i) => (
      <g key={`t${i + 1}`}>
        <rect x="32" y={y + 90} width="36" height="10" rx="2" />
        <text x="73" y={y + 98} fontSize="8" fill="currentColor" stroke="none">T{i + 1}</text>
      </g>
    ))}
    {/* Lumbar vertebrae L1-L5 */}
    {[0, 14, 28, 42, 56].map((y, i) => (
      <g key={`l${i + 1}`}>
        <rect x="28" y={y + 228} width="44" height="12" rx="2" />
        <text x="77" y={y + 238} fontSize="8" fill="currentColor" stroke="none">L{i + 1}</text>
      </g>
    ))}
  </svg>
);

// Pelvis SVG
export const PelvisSVG = () => (
  <svg viewBox="0 0 200 150" className="w-full h-full" fill="none" stroke="currentColor" strokeWidth="1.5">
    {/* Iliac crests */}
    <path d="M30 40 Q50 20 100 30 Q150 20 170 40" />
    {/* Hip bones */}
    <path d="M30 40 Q20 70 40 100 Q60 120 80 110" />
    <path d="M170 40 Q180 70 160 100 Q140 120 120 110" />
    {/* Sacrum */}
    <path d="M80 30 L100 50 L120 30" />
    <path d="M85 50 L100 70 L115 50" />
    {/* Pubic symphysis */}
    <path d="M80 110 Q100 130 120 110" />
    {/* Hip sockets */}
    <circle cx="55" cy="85" r="15" />
    <circle cx="145" cy="85" r="15" />
    {/* Labels */}
    <text x="10" y="40" fontSize="8" fill="currentColor" stroke="none">Ilium</text>
    <text x="85" y="145" fontSize="8" fill="currentColor" stroke="none">Pubis</text>
  </svg>
);

// Face front SVG
export const FaceFrontSVG = () => (
  <svg viewBox="0 0 200 250" className="w-full h-full" fill="none" stroke="currentColor" strokeWidth="1.5">
    {/* Face outline */}
    <ellipse cx="100" cy="110" rx="70" ry="90" />
    {/* Hairline */}
    <path d="M40 60 Q60 30 100 25 Q140 30 160 60" />
    {/* Eyes */}
    <ellipse cx="70" cy="100" rx="18" ry="10" />
    <ellipse cx="130" cy="100" rx="18" ry="10" />
    <circle cx="70" cy="100" r="5" />
    <circle cx="130" cy="100" r="5" />
    {/* Eyebrows */}
    <path d="M50 85 Q70 80 90 85" />
    <path d="M110 85 Q130 80 150 85" />
    {/* Nose */}
    <path d="M100 95 L100 130" />
    <path d="M90 135 Q100 140 110 135" />
    {/* Mouth */}
    <path d="M75 160 Q100 175 125 160" />
    <line x1="75" y1="160" x2="125" y2="160" />
    {/* Ears */}
    <ellipse cx="30" cy="110" rx="8" ry="20" />
    <ellipse cx="170" cy="110" rx="8" ry="20" />
    {/* Jaw line reference */}
    <path d="M40 140 Q100 200 160 140" strokeDasharray="3,3" opacity="0.5" />
  </svg>
);

// Face side profile SVG
export const FaceSideSVG = () => (
  <svg viewBox="0 0 200 250" className="w-full h-full" fill="none" stroke="currentColor" strokeWidth="1.5">
    {/* Head outline */}
    <path d="M120 25 Q160 30 170 70 Q175 110 160 140 Q140 180 100 200 Q80 200 70 180 Q60 160 65 140 Q50 140 50 110 Q50 60 80 35 Q100 25 120 25" />
    {/* Eye */}
    <ellipse cx="140" cy="95" rx="12" ry="8" />
    <circle cx="145" cy="95" r="4" />
    {/* Eyebrow */}
    <path d="M130 82 Q145 78 155 85" />
    {/* Nose */}
    <path d="M155 95 Q170 115 160 130 L145 135" />
    {/* Mouth */}
    <path d="M145 155 Q135 165 125 160" />
    <line x1="125" y1="160" x2="145" y2="155" />
    {/* Ear */}
    <ellipse cx="85" cy="105" rx="8" ry="18" />
    {/* Neck */}
    <line x1="95" y1="200" x2="90" y2="245" />
    <line x1="70" y1="180" x2="60" y2="245" />
    {/* Jaw */}
    <path d="M70 180 Q90 195 100 200" />
  </svg>
);

// Knee SVG
export const KneeSVG = () => (
  <svg viewBox="0 0 120 180" className="w-full h-full" fill="none" stroke="currentColor" strokeWidth="1.5">
    {/* Femur */}
    <path d="M50 10 L55 70 Q60 80 60 90" />
    <path d="M70 10 L65 70 Q60 80 60 90" />
    {/* Patella */}
    <ellipse cx="60" cy="90" rx="20" ry="18" />
    {/* Tibia */}
    <path d="M45 108 L40 170" />
    <path d="M75 108 L80 170" />
    {/* Fibula */}
    <path d="M85 115 L90 165" />
    {/* Meniscus indication */}
    <path d="M40 100 Q60 110 80 100" strokeDasharray="3,3" opacity="0.7" />
    {/* Labels */}
    <text x="85" y="20" fontSize="8" fill="currentColor" stroke="none">Femur</text>
    <text x="85" y="90" fontSize="8" fill="currentColor" stroke="none">Patella</text>
    <text x="85" y="150" fontSize="8" fill="currentColor" stroke="none">Tibia</text>
  </svg>
);

// Shoulder SVG
export const ShoulderSVG = () => (
  <svg viewBox="0 0 180 150" className="w-full h-full" fill="none" stroke="currentColor" strokeWidth="1.5">
    {/* Clavicle */}
    <path d="M20 40 Q60 30 90 50" />
    {/* Scapula */}
    <path d="M60 50 L50 100 L90 120 L100 70 Z" />
    {/* Humerus head */}
    <circle cx="115" cy="65" r="25" />
    {/* Humerus shaft */}
    <path d="M105 90 L95 145" />
    <path d="M125 90 L135 145" />
    {/* Acromion */}
    <path d="M90 50 Q110 40 120 45" />
    {/* Labels */}
    <text x="5" y="35" fontSize="8" fill="currentColor" stroke="none">Clavicle</text>
    <text x="45" y="135" fontSize="8" fill="currentColor" stroke="none">Scapula</text>
    <text x="140" y="70" fontSize="8" fill="currentColor" stroke="none">Humerus</text>
  </svg>
);

// Hand SVG
export const HandSVG = () => (
  <svg viewBox="0 0 120 160" className="w-full h-full" fill="none" stroke="currentColor" strokeWidth="1.5">
    {/* Palm */}
    <path d="M30 80 Q25 100 30 130 Q50 150 60 145 Q70 150 90 130 Q95 100 90 80" />
    {/* Wrist */}
    <path d="M30 80 L35 60 L85 60 L90 80" />
    {/* Thumb */}
    <path d="M30 90 Q15 85 10 70 Q8 55 15 45 Q25 50 30 65" />
    {/* Index finger */}
    <path d="M35 60 L32 35 Q32 20 38 10 Q45 20 45 35 L45 60" />
    {/* Middle finger */}
    <path d="M50 60 L48 28 Q48 10 55 0 Q62 10 62 28 L62 60" />
    {/* Ring finger */}
    <path d="M67 60 L65 35 Q65 18 72 8 Q79 18 79 35 L80 60" />
    {/* Pinky */}
    <path d="M85 65 L88 45 Q88 32 92 25 Q98 32 98 45 L95 70" />
    {/* Finger joints */}
    <circle cx="38" cy="25" r="2" />
    <circle cx="55" cy="15" r="2" />
    <circle cx="72" cy="22" r="2" />
    <circle cx="93" cy="35" r="2" />
  </svg>
);

// Foot SVG
export const FootSVG = () => (
  <svg viewBox="0 0 100 180" className="w-full h-full" fill="none" stroke="currentColor" strokeWidth="1.5">
    {/* Ankle */}
    <ellipse cx="50" cy="25" rx="25" ry="20" />
    {/* Heel */}
    <path d="M30 40 Q20 60 25 90 Q30 110 40 120" />
    {/* Arch */}
    <path d="M40 120 Q50 130 60 125 Q75 115 80 100" />
    {/* Top of foot */}
    <path d="M70 40 Q85 60 85 80 L80 100" />
    {/* Toes */}
    <path d="M60 125 L55 145 Q55 155 60 160" />
    <path d="M68 122 L68 150 Q70 160 75 162" />
    <path d="M76 118 L80 148 Q82 158 86 158" />
    <path d="M82 112 L90 140 Q92 148 95 148" />
    <path d="M85 105 L95 125 Q98 130 98 135" />
    {/* Labels */}
    <text x="55" y="20" fontSize="8" fill="currentColor" stroke="none">Ankle</text>
    <text x="5" y="100" fontSize="8" fill="currentColor" stroke="none">Heel</text>
  </svg>
);

// Image imports for Primary Anatomical Systems
import SkeletalSystemImg from "@/assets/anatomy/Skeletal_System.png";
import DigestiveImg from "@/assets/anatomy/Digestive.png";
import RespiratoryImg from "@/assets/anatomy/Respiratory.png";
import NeurologicalImg from "@/assets/anatomy/Neurological.png";
import CardiovascularImg from "@/assets/anatomy/Cardiovascular.png";
import MuscularImg from "@/assets/anatomy/Muscular.png";
import BreastAugmentationImg from "@/assets/anatomy/Breast_Augmentation.png";
import InjectiblesAndFillersImg from "@/assets/anatomy/Injectibles_and_Fillers.png";
import BodyContouringImg from "@/assets/anatomy/Body_Controuring.png";
import FacialImg from "@/assets/anatomy/Facial.png";
import HandsWristsImg from "@/assets/anatomy/Hands_and_Wrists.png";
import HipImg from "@/assets/anatomy/Hip.png";
import ShoulderOrthoImg from "@/assets/anatomy/Shoulder_Ortho.png";
import SynovialJointsImg from "@/assets/anatomy/Synovial_Joints.png";
import KneeOrthoImg from "@/assets/anatomy/Knee_Ortho.png";
import ElbowImg from "@/assets/anatomy/Elbow.png";
import AnklesImg from "@/assets/anatomy/Ankles.png";
import ENTImg from "@/assets/anatomy/ENT.png";
import TeethImg from "@/assets/anatomy/Teeth.png";
import OBGYNImg from "@/assets/anatomy/OBGYN.png";
import PainPointsImg from "@/assets/anatomy/Pain_Points.png";
import UrologyImg from "@/assets/anatomy/Urology_and_Nephrology.png";
import EndocrinologyImg from "@/assets/anatomy/Endocrinology.png";
import AdvancedCardiologyImg from "@/assets/anatomy/Advanced_Cardiology.png";
import PodiatryImg from "@/assets/anatomy/Podiatry.png";
import EyeImg from "@/assets/anatomy/Eye.png";
import BrainImg from "@/assets/anatomy/Brain.png";
import SpinalCordImg from "@/assets/anatomy/Spinal_Cord_CX.png";
import PelvicFloorImg from "@/assets/anatomy/Pelvic_Floor.png";
import KidneyImg from "@/assets/anatomy/Kidney.png";

export interface AnatomyAsset {
  id: string;
  name: string;
  category: "body" | "spine" | "face" | "joints" | "systems" | "plastic-surgery" | "neuro";
  component: React.FC;
  width: number;
  height: number;
  imageSrc?: string;
}

export const anatomyAssets: AnatomyAsset[] = [
  { id: "body-front", name: "Body (Front)", category: "body", component: FullBodyFrontSVG, width: 120, height: 240 },
  { id: "body-back", name: "Body (Back)", category: "body", component: FullBodyBackSVG, width: 120, height: 240 },
  { id: "body-pain", name: "Pain Points", category: "body", component: () => null, width: 200, height: 300, imageSrc: PainPointsImg },
  { id: "spine", name: "Spine", category: "spine", component: SpineSVG, width: 80, height: 200 },
  { id: "pelvis", name: "Pelvis", category: "spine", component: PelvisSVG, width: 140, height: 100 },
  { id: "face-front", name: "Face (Front)", category: "face", component: FaceFrontSVG, width: 120, height: 150 },
  { id: "face-side", name: "Face (Side)", category: "face", component: FaceSideSVG, width: 120, height: 150 },
  { id: "shoulder", name: "Shoulder", category: "joints", component: ShoulderSVG, width: 120, height: 100 },
  { id: "knee", name: "Knee", category: "joints", component: KneeSVG, width: 80, height: 120 },
  { id: "hand", name: "Hand", category: "joints", component: HandSVG, width: 80, height: 110 },
  { id: "foot", name: "Foot", category: "joints", component: FootSVG, width: 70, height: 120 },
  { id: "ortho-hands", name: "Hands & Wrists", category: "joints", component: () => null, width: 200, height: 300, imageSrc: HandsWristsImg },
  { id: "ortho-hip", name: "Hip", category: "joints", component: () => null, width: 200, height: 300, imageSrc: HipImg },
  { id: "ortho-shoulder", name: "Shoulder (Detail)", category: "joints", component: () => null, width: 200, height: 300, imageSrc: ShoulderOrthoImg },
  { id: "ortho-synovial", name: "Synovial Joints", category: "joints", component: () => null, width: 200, height: 300, imageSrc: SynovialJointsImg },
  { id: "ortho-knee", name: "Knee (Detail)", category: "joints", component: () => null, width: 200, height: 300, imageSrc: KneeOrthoImg },
  { id: "ortho-elbow", name: "Elbow", category: "joints", component: () => null, width: 200, height: 300, imageSrc: ElbowImg },
  { id: "ortho-ankles", name: "Ankles", category: "joints", component: () => null, width: 200, height: 300, imageSrc: AnklesImg },
  { id: "ortho-podiatry", name: "Podiatry", category: "joints", component: () => null, width: 200, height: 300, imageSrc: PodiatryImg },
  // Face
  { id: "face-ent", name: "ENT", category: "face", component: () => null, width: 200, height: 300, imageSrc: ENTImg },
  { id: "face-eye", name: "Eye", category: "face", component: () => null, width: 200, height: 300, imageSrc: EyeImg },
  { id: "face-teeth", name: "Teeth", category: "face", component: () => null, width: 200, height: 300, imageSrc: TeethImg },
  // Primary Anatomical Systems (image-based)
  { id: "sys-skeletal", name: "Skeletal", category: "systems", component: () => null, width: 200, height: 300, imageSrc: SkeletalSystemImg },
  { id: "sys-muscular", name: "Muscular", category: "systems", component: () => null, width: 200, height: 300, imageSrc: MuscularImg },
  { id: "sys-cardiovascular", name: "Cardiovascular", category: "systems", component: () => null, width: 200, height: 300, imageSrc: CardiovascularImg },
  { id: "sys-respiratory", name: "Respiratory", category: "systems", component: () => null, width: 200, height: 300, imageSrc: RespiratoryImg },
  { id: "sys-digestive", name: "Digestive", category: "systems", component: () => null, width: 200, height: 300, imageSrc: DigestiveImg },
  { id: "sys-obgyn", name: "OB/GYN", category: "systems", component: () => null, width: 200, height: 300, imageSrc: OBGYNImg },
  { id: "sys-urology", name: "Urology & Nephrology", category: "systems", component: () => null, width: 200, height: 300, imageSrc: UrologyImg },
  { id: "sys-endocrinology", name: "Endocrinology", category: "systems", component: () => null, width: 200, height: 300, imageSrc: EndocrinologyImg },
  { id: "sys-adv-cardiology", name: "Advanced Cardiology", category: "systems", component: () => null, width: 200, height: 300, imageSrc: AdvancedCardiologyImg },
  { id: "sys-pelvic-floor", name: "Pelvic Floor", category: "systems", component: () => null, width: 200, height: 300, imageSrc: PelvicFloorImg },
  { id: "sys-kidney", name: "Kidney", category: "systems", component: () => null, width: 200, height: 300, imageSrc: KidneyImg },
  // Neuro
  { id: "neuro-neurological", name: "Neurological", category: "neuro", component: () => null, width: 200, height: 300, imageSrc: NeurologicalImg },
  { id: "neuro-brain", name: "Brain", category: "neuro", component: () => null, width: 200, height: 300, imageSrc: BrainImg },
  { id: "neuro-spinal-cord", name: "Spinal Cord", category: "neuro", component: () => null, width: 200, height: 300, imageSrc: SpinalCordImg },
  // Plastic Surgery (image-based)
  { id: "ps-breast", name: "Breast Augmentation", category: "plastic-surgery", component: () => null, width: 200, height: 300, imageSrc: BreastAugmentationImg },
  { id: "ps-injectibles", name: "Injectibles & Fillers", category: "plastic-surgery", component: () => null, width: 200, height: 300, imageSrc: InjectiblesAndFillersImg },
  { id: "ps-body", name: "Body Contouring", category: "plastic-surgery", component: () => null, width: 200, height: 300, imageSrc: BodyContouringImg },
  { id: "ps-facial", name: "Facial", category: "plastic-surgery", component: () => null, width: 200, height: 300, imageSrc: FacialImg },
];
