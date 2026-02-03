import React, { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import {
  ChevronRight,
  ChevronDown,
  Heart,
  Bone,
  Brain,
  Eye,
  Activity,
  Stethoscope,
  Smile,
  User,
  Hand,
  Footprints,
  Palette,
  Droplets,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LayeredAnatomyAsset, AnatomyLayer } from "./MedicalAnatomyAssets";

// Types for hierarchical anatomy organization
export interface AnatomyStructure {
  id: string;
  name: string;
  latinName?: string;
  description?: string;
  clinicalNotes?: string;
  innervation?: string;
  bloodSupply?: string;
  assetId?: string; // Links to LayeredAnatomyAsset
}

export interface AnatomySubsystem {
  id: string;
  name: string;
  icon?: React.ReactNode;
  structures: AnatomyStructure[];
}

export interface AnatomySystem {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  subsystems: AnatomySubsystem[];
}

// Comprehensive anatomy hierarchy
export const ANATOMY_HIERARCHY: AnatomySystem[] = [
  {
    id: "musculoskeletal",
    name: "Musculoskeletal System",
    icon: <Bone className="h-4 w-4" />,
    color: "hsl(30, 60%, 70%)",
    subsystems: [
      {
        id: "axial-skeleton",
        name: "Axial Skeleton",
        structures: [
          { id: "skull", name: "Skull", latinName: "Cranium", description: "Protective bony case for the brain", assetId: "skull-anterior" },
          { id: "cervical-spine", name: "Cervical Spine", latinName: "Vertebrae cervicales", description: "C1-C7 vertebrae", assetId: "vertebral-column" },
          { id: "thoracic-spine", name: "Thoracic Spine", latinName: "Vertebrae thoracicae", description: "T1-T12 vertebrae", assetId: "vertebral-column" },
          { id: "lumbar-spine", name: "Lumbar Spine", latinName: "Vertebrae lumbales", description: "L1-L5 vertebrae", assetId: "vertebral-column" },
          { id: "sacrum", name: "Sacrum", latinName: "Os sacrum", description: "Fused S1-S5 vertebrae", assetId: "vertebral-column" },
          { id: "coccyx", name: "Coccyx", latinName: "Os coccygis", description: "Tailbone", assetId: "vertebral-column" },
          { id: "ribcage", name: "Rib Cage", latinName: "Cavea thoracis", description: "12 pairs of ribs", assetId: "full-body-anterior" },
          { id: "sternum", name: "Sternum", latinName: "Sternum", description: "Breastbone", assetId: "full-body-anterior" },
        ],
      },
      {
        id: "appendicular-skeleton",
        name: "Appendicular Skeleton",
        structures: [
          { id: "clavicle", name: "Clavicle", latinName: "Clavicula", description: "Collarbone" },
          { id: "scapula", name: "Scapula", latinName: "Scapula", description: "Shoulder blade" },
          { id: "humerus", name: "Humerus", latinName: "Humerus", description: "Upper arm bone" },
          { id: "radius", name: "Radius", latinName: "Radius", description: "Lateral forearm bone" },
          { id: "ulna", name: "Ulna", latinName: "Ulna", description: "Medial forearm bone" },
          { id: "pelvis", name: "Pelvis", latinName: "Pelvis", description: "Hip bone complex" },
          { id: "femur", name: "Femur", latinName: "Femur", description: "Thigh bone" },
          { id: "patella", name: "Patella", latinName: "Patella", description: "Kneecap", assetId: "knee-joint" },
          { id: "tibia", name: "Tibia", latinName: "Tibia", description: "Shinbone" },
          { id: "fibula", name: "Fibula", latinName: "Fibula", description: "Calf bone" },
        ],
      },
      {
        id: "joints",
        name: "Joints",
        structures: [
          { id: "shoulder-joint", name: "Shoulder Joint", latinName: "Articulatio humeri", description: "Ball-and-socket joint" },
          { id: "elbow-joint", name: "Elbow Joint", latinName: "Articulatio cubiti", description: "Hinge joint" },
          { id: "wrist-joint", name: "Wrist Joint", latinName: "Articulatio radiocarpalis", description: "Condyloid joint" },
          { id: "hip-joint", name: "Hip Joint", latinName: "Articulatio coxae", description: "Ball-and-socket joint" },
          { id: "knee-joint", name: "Knee Joint", latinName: "Articulatio genus", description: "Modified hinge joint", assetId: "knee-joint" },
          { id: "ankle-joint", name: "Ankle Joint", latinName: "Articulatio talocruralis", description: "Hinge joint" },
        ],
      },
      {
        id: "upper-limb-muscles",
        name: "Upper Limb Muscles",
        structures: [
          { id: "deltoid", name: "Deltoid", latinName: "Musculus deltoideus", description: "Shoulder abduction", innervation: "Axillary nerve" },
          { id: "biceps-brachii", name: "Biceps Brachii", latinName: "Musculus biceps brachii", description: "Elbow flexion, supination", innervation: "Musculocutaneous nerve" },
          { id: "triceps-brachii", name: "Triceps Brachii", latinName: "Musculus triceps brachii", description: "Elbow extension", innervation: "Radial nerve" },
          { id: "brachialis", name: "Brachialis", latinName: "Musculus brachialis", description: "Primary elbow flexor", innervation: "Musculocutaneous nerve" },
        ],
      },
      {
        id: "trunk-muscles",
        name: "Trunk Muscles",
        structures: [
          { id: "pectoralis-major", name: "Pectoralis Major", latinName: "Musculus pectoralis major", description: "Arm adduction, flexion", innervation: "Pectoral nerves" },
          { id: "rectus-abdominis", name: "Rectus Abdominis", latinName: "Musculus rectus abdominis", description: "Trunk flexion", innervation: "Intercostal nerves" },
          { id: "external-oblique", name: "External Oblique", latinName: "Musculus obliquus externus abdominis", description: "Trunk rotation" },
          { id: "latissimus-dorsi", name: "Latissimus Dorsi", latinName: "Musculus latissimus dorsi", description: "Arm extension, adduction" },
          { id: "trapezius", name: "Trapezius", latinName: "Musculus trapezius", description: "Scapular elevation, retraction" },
        ],
      },
      {
        id: "lower-limb-muscles",
        name: "Lower Limb Muscles",
        structures: [
          { id: "quadriceps", name: "Quadriceps Femoris", latinName: "Musculus quadriceps femoris", description: "Knee extension", innervation: "Femoral nerve" },
          { id: "hamstrings", name: "Hamstrings", latinName: "Musculi ischiocrurales", description: "Knee flexion, hip extension" },
          { id: "gluteus-maximus", name: "Gluteus Maximus", latinName: "Musculus gluteus maximus", description: "Hip extension" },
          { id: "gastrocnemius", name: "Gastrocnemius", latinName: "Musculus gastrocnemius", description: "Plantarflexion", innervation: "Tibial nerve" },
          { id: "tibialis-anterior", name: "Tibialis Anterior", latinName: "Musculus tibialis anterior", description: "Dorsiflexion" },
        ],
      },
    ],
  },
  {
    id: "cardiovascular",
    name: "Cardiovascular System",
    icon: <Heart className="h-4 w-4" />,
    color: "hsl(0, 70%, 55%)",
    subsystems: [
      {
        id: "heart",
        name: "Heart",
        structures: [
          { id: "right-atrium", name: "Right Atrium", latinName: "Atrium dextrum", description: "Receives deoxygenated blood" },
          { id: "right-ventricle", name: "Right Ventricle", latinName: "Ventriculus dexter", description: "Pumps to pulmonary circulation" },
          { id: "left-atrium", name: "Left Atrium", latinName: "Atrium sinistrum", description: "Receives oxygenated blood" },
          { id: "left-ventricle", name: "Left Ventricle", latinName: "Ventriculus sinister", description: "Pumps to systemic circulation" },
          { id: "cardiac-valves", name: "Cardiac Valves", description: "Tricuspid, Mitral, Aortic, Pulmonary", assetId: "heart-anatomy" },
        ],
      },
      {
        id: "major-arteries",
        name: "Major Arteries",
        structures: [
          { id: "aorta", name: "Aorta", latinName: "Aorta", description: "Main artery from the heart" },
          { id: "carotid-artery", name: "Carotid Artery", latinName: "Arteria carotis", description: "Blood supply to head and neck" },
          { id: "subclavian-artery", name: "Subclavian Artery", latinName: "Arteria subclavia", description: "Blood supply to upper limb" },
          { id: "femoral-artery", name: "Femoral Artery", latinName: "Arteria femoralis", description: "Blood supply to lower limb" },
          { id: "coronary-arteries", name: "Coronary Arteries", latinName: "Arteriae coronariae", description: "Blood supply to myocardium" },
        ],
      },
      {
        id: "major-veins",
        name: "Major Veins",
        structures: [
          { id: "superior-vena-cava", name: "Superior Vena Cava", latinName: "Vena cava superior", description: "Drains upper body" },
          { id: "inferior-vena-cava", name: "Inferior Vena Cava", latinName: "Vena cava inferior", description: "Drains lower body" },
          { id: "jugular-vein", name: "Jugular Vein", latinName: "Vena jugularis", description: "Drains head and neck" },
          { id: "portal-vein", name: "Portal Vein", latinName: "Vena portae hepatis", description: "Carries blood from GI tract to liver" },
        ],
      },
    ],
  },
  {
    id: "nervous",
    name: "Nervous System",
    icon: <Brain className="h-4 w-4" />,
    color: "hsl(45, 90%, 60%)",
    subsystems: [
      {
        id: "central-nervous",
        name: "Central Nervous System",
        structures: [
          { id: "brain", name: "Brain", latinName: "Encephalon", description: "Control center of the body" },
          { id: "cerebrum", name: "Cerebrum", latinName: "Cerebrum", description: "Higher cognitive functions" },
          { id: "cerebellum", name: "Cerebellum", latinName: "Cerebellum", description: "Motor coordination" },
          { id: "brainstem", name: "Brainstem", latinName: "Truncus encephali", description: "Basic life functions" },
          { id: "spinal-cord", name: "Spinal Cord", latinName: "Medulla spinalis", description: "Neural pathway", assetId: "vertebral-column" },
        ],
      },
      {
        id: "peripheral-nervous",
        name: "Peripheral Nervous System",
        structures: [
          { id: "brachial-plexus", name: "Brachial Plexus", latinName: "Plexus brachialis", description: "Nerves to upper limb" },
          { id: "lumbar-plexus", name: "Lumbar Plexus", latinName: "Plexus lumbalis", description: "Nerves to lower limb" },
          { id: "sciatic-nerve", name: "Sciatic Nerve", latinName: "Nervus ischiadicus", description: "Largest nerve in body" },
          { id: "femoral-nerve", name: "Femoral Nerve", latinName: "Nervus femoralis", description: "Motor and sensory to thigh" },
          { id: "median-nerve", name: "Median Nerve", latinName: "Nervus medianus", description: "Hand sensation and movement" },
        ],
      },
      {
        id: "cranial-nerves",
        name: "Cranial Nerves",
        structures: [
          { id: "cn-i", name: "I - Olfactory", latinName: "Nervus olfactorius", description: "Sense of smell" },
          { id: "cn-ii", name: "II - Optic", latinName: "Nervus opticus", description: "Vision" },
          { id: "cn-iii", name: "III - Oculomotor", latinName: "Nervus oculomotorius", description: "Eye movement" },
          { id: "cn-v", name: "V - Trigeminal", latinName: "Nervus trigeminus", description: "Facial sensation, mastication" },
          { id: "cn-vii", name: "VII - Facial", latinName: "Nervus facialis", description: "Facial expression, taste" },
          { id: "cn-x", name: "X - Vagus", latinName: "Nervus vagus", description: "Parasympathetic to thorax/abdomen" },
        ],
      },
    ],
  },
  {
    id: "respiratory",
    name: "Respiratory System",
    icon: <Activity className="h-4 w-4" />,
    color: "hsl(200, 60%, 70%)",
    subsystems: [
      {
        id: "upper-respiratory",
        name: "Upper Respiratory Tract",
        structures: [
          { id: "nasal-cavity", name: "Nasal Cavity", latinName: "Cavitas nasi", description: "Air filtration and warming" },
          { id: "pharynx", name: "Pharynx", latinName: "Pharynx", description: "Common pathway for air and food" },
          { id: "larynx", name: "Larynx", latinName: "Larynx", description: "Voice box, airway protection" },
        ],
      },
      {
        id: "lower-respiratory",
        name: "Lower Respiratory Tract",
        structures: [
          { id: "trachea", name: "Trachea", latinName: "Trachea", description: "Windpipe" },
          { id: "bronchi", name: "Bronchi", latinName: "Bronchi", description: "Primary airways to lungs" },
          { id: "lungs", name: "Lungs", latinName: "Pulmones", description: "Gas exchange organs" },
          { id: "diaphragm", name: "Diaphragm", latinName: "Diaphragma", description: "Primary respiratory muscle" },
        ],
      },
    ],
  },
  {
    id: "digestive",
    name: "Digestive System",
    icon: <Stethoscope className="h-4 w-4" />,
    color: "hsl(25, 70%, 55%)",
    subsystems: [
      {
        id: "gi-tract",
        name: "Gastrointestinal Tract",
        structures: [
          { id: "esophagus", name: "Esophagus", latinName: "Oesophagus", description: "Food passage to stomach" },
          { id: "stomach", name: "Stomach", latinName: "Gaster", description: "Mechanical and chemical digestion" },
          { id: "small-intestine", name: "Small Intestine", latinName: "Intestinum tenue", description: "Nutrient absorption" },
          { id: "large-intestine", name: "Large Intestine", latinName: "Intestinum crassum", description: "Water absorption" },
        ],
      },
      {
        id: "accessory-organs",
        name: "Accessory Organs",
        structures: [
          { id: "liver", name: "Liver", latinName: "Hepar", description: "Metabolism, detoxification, bile" },
          { id: "gallbladder", name: "Gallbladder", latinName: "Vesica biliaris", description: "Bile storage" },
          { id: "pancreas", name: "Pancreas", latinName: "Pancreas", description: "Digestive enzymes, hormones" },
          { id: "spleen", name: "Spleen", latinName: "Splen", description: "Blood filtration, immunity" },
        ],
      },
    ],
  },
  {
    id: "head-neck",
    name: "Head & Neck",
    icon: <User className="h-4 w-4" />,
    color: "hsl(280, 50%, 60%)",
    subsystems: [
      {
        id: "skull-facial",
        name: "Skull & Facial Bones",
        structures: [
          { id: "frontal-bone", name: "Frontal Bone", latinName: "Os frontale", description: "Forehead", assetId: "skull-anterior" },
          { id: "parietal-bones", name: "Parietal Bones", latinName: "Ossa parietalia", description: "Skull roof" },
          { id: "temporal-bones", name: "Temporal Bones", latinName: "Ossa temporalia", description: "Contains ear structures" },
          { id: "mandible", name: "Mandible", latinName: "Mandibula", description: "Lower jaw" },
          { id: "maxilla", name: "Maxilla", latinName: "Maxilla", description: "Upper jaw" },
          { id: "zygomatic-bones", name: "Zygomatic Bones", latinName: "Ossa zygomatica", description: "Cheekbones" },
          { id: "nasal-bones", name: "Nasal Bones", latinName: "Ossa nasalia", description: "Bridge of nose" },
        ],
      },
      {
        id: "eye-structures",
        name: "Eye & Orbit",
        icon: <Eye className="h-3 w-3" />,
        structures: [
          { id: "orbit", name: "Orbit", latinName: "Orbita", description: "Eye socket" },
          { id: "eyeball", name: "Eyeball", latinName: "Bulbus oculi", description: "Globe of the eye" },
          { id: "extraocular-muscles", name: "Extraocular Muscles", description: "Eye movement muscles" },
          { id: "lacrimal-apparatus", name: "Lacrimal Apparatus", latinName: "Apparatus lacrimalis", description: "Tear production and drainage" },
        ],
      },
      {
        id: "neck-structures",
        name: "Neck Structures",
        structures: [
          { id: "thyroid-gland", name: "Thyroid Gland", latinName: "Glandula thyroidea", description: "Metabolism regulation" },
          { id: "parathyroid-glands", name: "Parathyroid Glands", latinName: "Glandulae parathyroideae", description: "Calcium regulation" },
          { id: "cervical-lymph-nodes", name: "Cervical Lymph Nodes", latinName: "Nodi lymphoidei cervicales", description: "Immune surveillance" },
          { id: "sternocleidomastoid", name: "Sternocleidomastoid", latinName: "Musculus sternocleidomastoideus", description: "Neck rotation, flexion" },
        ],
      },
    ],
  },
  {
    id: "dental",
    name: "Dental & Oral",
    icon: <Smile className="h-4 w-4" />,
    color: "hsl(180, 50%, 60%)",
    subsystems: [
      {
        id: "teeth-upper",
        name: "Upper Teeth (Maxillary)",
        structures: [
          { id: "upper-incisors", name: "Central & Lateral Incisors", description: "Teeth 11-12, 21-22 (FDI)", assetId: "dental-arch-upper" },
          { id: "upper-canines", name: "Canines", description: "Teeth 13, 23 (FDI)", assetId: "dental-arch-upper" },
          { id: "upper-premolars", name: "Premolars", description: "Teeth 14-15, 24-25 (FDI)", assetId: "dental-arch-upper" },
          { id: "upper-molars", name: "Molars", description: "Teeth 16-18, 26-28 (FDI)", assetId: "dental-arch-upper" },
        ],
      },
      {
        id: "teeth-lower",
        name: "Lower Teeth (Mandibular)",
        structures: [
          { id: "lower-incisors", name: "Central & Lateral Incisors", description: "Teeth 31-32, 41-42 (FDI)", assetId: "dental-arch-lower" },
          { id: "lower-canines", name: "Canines", description: "Teeth 33, 43 (FDI)", assetId: "dental-arch-lower" },
          { id: "lower-premolars", name: "Premolars", description: "Teeth 34-35, 44-45 (FDI)", assetId: "dental-arch-lower" },
          { id: "lower-molars", name: "Molars", description: "Teeth 36-38, 46-48 (FDI)", assetId: "dental-arch-lower" },
        ],
      },
      {
        id: "oral-structures",
        name: "Oral Structures",
        structures: [
          { id: "tongue", name: "Tongue", latinName: "Lingua", description: "Taste, swallowing, speech" },
          { id: "palate", name: "Palate", latinName: "Palatum", description: "Hard and soft palate" },
          { id: "salivary-glands", name: "Salivary Glands", latinName: "Glandulae salivariae", description: "Saliva production" },
          { id: "temporomandibular-joint", name: "TMJ", latinName: "Articulatio temporomandibularis", description: "Jaw joint" },
        ],
      },
    ],
  },
  {
    id: "extremities",
    name: "Extremities",
    icon: <Hand className="h-4 w-4" />,
    color: "hsl(150, 50%, 50%)",
    subsystems: [
      {
        id: "hand-wrist",
        name: "Hand & Wrist",
        icon: <Hand className="h-3 w-3" />,
        structures: [
          { id: "carpal-bones", name: "Carpal Bones", latinName: "Ossa carpi", description: "8 wrist bones" },
          { id: "metacarpals", name: "Metacarpals", latinName: "Ossa metacarpi", description: "Palm bones" },
          { id: "phalanges-hand", name: "Phalanges", latinName: "Phalanges", description: "Finger bones" },
          { id: "thenar-muscles", name: "Thenar Muscles", description: "Thumb muscles" },
          { id: "hypothenar-muscles", name: "Hypothenar Muscles", description: "Little finger muscles" },
        ],
      },
      {
        id: "foot-ankle",
        name: "Foot & Ankle",
        icon: <Footprints className="h-3 w-3" />,
        structures: [
          { id: "tarsal-bones", name: "Tarsal Bones", latinName: "Ossa tarsi", description: "7 ankle bones" },
          { id: "metatarsals", name: "Metatarsals", latinName: "Ossa metatarsi", description: "Foot bones" },
          { id: "phalanges-foot", name: "Phalanges", latinName: "Phalanges", description: "Toe bones" },
          { id: "plantar-fascia", name: "Plantar Fascia", latinName: "Fascia plantaris", description: "Arch support" },
          { id: "achilles-tendon", name: "Achilles Tendon", latinName: "Tendo calcaneus", description: "Connects calf to heel" },
        ],
      },
    ],
  },
];

interface AnatomyBrowserProps {
  onSelectStructure: (structure: AnatomyStructure, system: AnatomySystem, highlightColor: string) => void;
  selectedStructureId: string | null;
  highlightColor: string;
  highlightOpacity: number;
  onHighlightColorChange: (color: string) => void;
  onHighlightOpacityChange: (opacity: number) => void;
  visibleLayers: AnatomyLayer[];
  anatomyAssets: LayeredAnatomyAsset[];
  onDragStart: (asset: LayeredAnatomyAsset) => void;
}

export function AnatomyBrowser({
  onSelectStructure,
  selectedStructureId,
  highlightColor,
  highlightOpacity,
  onHighlightColorChange,
  onHighlightOpacityChange,
  visibleLayers,
  anatomyAssets,
  onDragStart,
}: AnatomyBrowserProps) {
  const [expandedSystems, setExpandedSystems] = useState<string[]>(["musculoskeletal"]);
  const [expandedSubsystems, setExpandedSubsystems] = useState<string[]>([]);

  const toggleSystem = (systemId: string) => {
    setExpandedSystems((prev) =>
      prev.includes(systemId) ? prev.filter((id) => id !== systemId) : [...prev, systemId]
    );
  };

  const toggleSubsystem = (subsystemId: string) => {
    setExpandedSubsystems((prev) =>
      prev.includes(subsystemId) ? prev.filter((id) => id !== subsystemId) : [...prev, subsystemId]
    );
  };

  const findAssetForStructure = (structure: AnatomyStructure): LayeredAnatomyAsset | undefined => {
    if (structure.assetId) {
      return anatomyAssets.find((a) => a.id === structure.assetId);
    }
    return undefined;
  };

  // Clinical-grade color presets with medical context
  const CLINICAL_HIGHLIGHT_PRESETS = [
    { color: "#DC143C", name: "Pathology", description: "Abnormality / Disease" },
    { color: "#FF4500", name: "Lesion", description: "Tissue damage" },
    { color: "#2563EB", name: "Inflammation", description: "Inflammatory process" },
    { color: "#0EA5E9", name: "Edema", description: "Fluid accumulation" },
    { color: "#22C55E", name: "Surgical Target", description: "Operative focus" },
    { color: "#10B981", name: "Healthy", description: "Normal tissue" },
    { color: "#F59E0B", name: "Caution", description: "Area of concern" },
    { color: "#8B5CF6", name: "Nerve", description: "Neural involvement" },
    { color: "#EC4899", name: "Vascular", description: "Blood vessel issue" },
    { color: "#6B7280", name: "Neutral", description: "Reference marking" },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Clinical Highlight Controls */}
      <div className="p-2 border-b bg-muted/30 space-y-3">
        {/* Color Presets with Clinical Context */}
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <Palette className="h-3 w-3 text-muted-foreground" />
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Clinical Highlight</span>
          </div>
          <div className="grid grid-cols-5 gap-1">
            {CLINICAL_HIGHLIGHT_PRESETS.map(({ color, name, description }) => (
              <Popover key={color}>
                <PopoverTrigger asChild>
                  <button
                    onClick={() => onHighlightColorChange(color)}
                    className={cn(
                      "w-6 h-6 rounded-md border-2 transition-all hover:scale-110 relative",
                      highlightColor === color ? "border-foreground ring-2 ring-foreground/20 scale-110" : "border-transparent"
                    )}
                    style={{ backgroundColor: color }}
                  >
                    {highlightColor === color && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-2 h-2 bg-white rounded-full shadow" />
                      </div>
                    )}
                  </button>
                </PopoverTrigger>
                <PopoverContent side="top" className="w-auto p-2 text-center">
                  <p className="text-xs font-semibold">{name}</p>
                  <p className="text-[10px] text-muted-foreground">{description}</p>
                </PopoverContent>
              </Popover>
            ))}
          </div>
        </div>

        {/* Opacity Control */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <Droplets className="h-3 w-3 text-muted-foreground" />
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Opacity</span>
            </div>
            <span className="text-[10px] font-mono text-muted-foreground">{Math.round(highlightOpacity * 100)}%</span>
          </div>
          <Slider
            value={[highlightOpacity * 100]}
            onValueChange={(v) => onHighlightOpacityChange(v[0] / 100)}
            min={20}
            max={100}
            step={5}
            className="w-full"
          />
          <div className="flex justify-between mt-1">
            <span className="text-[8px] text-muted-foreground">Subtle</span>
            <span className="text-[8px] text-muted-foreground">Bold</span>
          </div>
        </div>

        {/* Current Selection Preview */}
        {selectedStructureId && (
          <div 
            className="flex items-center gap-2 p-2 rounded-lg border-2"
            style={{ 
              borderColor: highlightColor,
              backgroundColor: `${highlightColor}${Math.round(highlightOpacity * 40).toString(16).padStart(2, '0')}`
            }}
          >
            <div 
              className="w-4 h-4 rounded-full shrink-0"
              style={{ 
                backgroundColor: highlightColor,
                opacity: highlightOpacity
              }}
            />
            <span className="text-[10px] font-medium truncate">Active highlight preview</span>
          </div>
        )}
      </div>

      {/* Systems Tree */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {ANATOMY_HIERARCHY.map((system) => (
            <Collapsible
              key={system.id}
              open={expandedSystems.includes(system.id)}
              onOpenChange={() => toggleSystem(system.id)}
            >
              <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 rounded-lg hover:bg-muted/50 transition-colors text-left">
                {expandedSystems.includes(system.id) ? (
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                )}
                <div
                  className="w-5 h-5 rounded-md flex items-center justify-center shrink-0"
                  style={{ backgroundColor: system.color }}
                >
                  {React.cloneElement(system.icon as React.ReactElement, { className: "h-3 w-3 text-white" })}
                </div>
                <span className="text-xs font-semibold truncate">{system.name}</span>
                <Badge variant="secondary" className="ml-auto text-[9px] h-4 px-1">
                  {system.subsystems.reduce((acc, sub) => acc + sub.structures.length, 0)}
                </Badge>
              </CollapsibleTrigger>

              <CollapsibleContent className="ml-4 border-l border-border/50">
                {system.subsystems.map((subsystem) => (
                  <Collapsible
                    key={subsystem.id}
                    open={expandedSubsystems.includes(subsystem.id)}
                    onOpenChange={() => toggleSubsystem(subsystem.id)}
                  >
                    <CollapsibleTrigger className="flex items-center gap-2 w-full p-1.5 pl-3 hover:bg-muted/30 transition-colors text-left rounded-r-lg">
                      {expandedSubsystems.includes(subsystem.id) ? (
                        <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
                      ) : (
                        <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
                      )}
                      {subsystem.icon && (
                        <span className="shrink-0">{subsystem.icon}</span>
                      )}
                      <span className="text-[11px] font-medium truncate">{subsystem.name}</span>
                      <Badge variant="outline" className="ml-auto text-[8px] h-3.5 px-1">
                        {subsystem.structures.length}
                      </Badge>
                    </CollapsibleTrigger>

                    <CollapsibleContent className="ml-5">
                      {subsystem.structures.map((structure) => {
                        const isSelected = selectedStructureId === structure.id;
                        const asset = findAssetForStructure(structure);

                        return (
                          <div
                            key={structure.id}
                            className={cn(
                              "flex items-center gap-2 p-1.5 pl-2 rounded-r-lg cursor-pointer transition-all",
                              isSelected
                                ? "bg-primary/10 border-l-2"
                                : "hover:bg-muted/30 border-l-2 border-transparent opacity-80 hover:opacity-100"
                            )}
                            style={{
                              borderLeftColor: isSelected ? highlightColor : "transparent",
                            }}
                            onClick={() => onSelectStructure(structure, system, highlightColor)}
                            draggable={!!asset}
                            onDragStart={() => asset && onDragStart(asset)}
                          >
                            <div
                              className={cn(
                                "w-2 h-2 rounded-full shrink-0 transition-all",
                                isSelected ? "scale-125" : ""
                              )}
                              style={{
                                backgroundColor: isSelected ? highlightColor : system.color,
                                opacity: isSelected ? 1 : 0.5,
                              }}
                            />
                            <div className="flex-1 min-w-0">
                              <span
                                className={cn(
                                  "text-[10px] block truncate transition-colors",
                                  isSelected ? "font-semibold text-foreground" : "text-foreground/80"
                                )}
                              >
                                {structure.name}
                              </span>
                              {structure.latinName && (
                                <span className="text-[8px] text-muted-foreground italic block truncate">
                                  {structure.latinName}
                                </span>
                              )}
                            </div>
                            {asset && (
                              <Badge variant="secondary" className="text-[7px] h-3 px-1 shrink-0">
                                drag
                              </Badge>
                            )}
                          </div>
                        );
                      })}
                    </CollapsibleContent>
                  </Collapsible>
                ))}
              </CollapsibleContent>
            </Collapsible>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

// Metadata Panel Component
interface StructureMetadataPanelProps {
  structure: AnatomyStructure | null;
  system: AnatomySystem | null;
  highlightColor: string;
  highlightOpacity: number;
  onClose: () => void;
}

export function StructureMetadataPanel({
  structure,
  system,
  highlightColor,
  highlightOpacity,
  onClose,
}: StructureMetadataPanelProps) {
  if (!structure || !system) return null;

  // Convert hex to rgba for opacity
  const hexToRgba = (hex: string, alpha: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  return (
    <div 
      className="absolute bottom-4 left-4 right-4 bg-background/95 backdrop-blur-sm border-2 rounded-xl shadow-xl p-4 max-w-md animate-in slide-in-from-bottom-4"
      style={{ 
        borderColor: hexToRgba(highlightColor, highlightOpacity),
        boxShadow: `0 4px 20px ${hexToRgba(highlightColor, highlightOpacity * 0.3)}`
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ 
              backgroundColor: hexToRgba(highlightColor, highlightOpacity),
            }}
          >
            {React.cloneElement(system.icon as React.ReactElement, { className: "h-4 w-4 text-white" })}
          </div>
          <div>
            <h4 className="font-bold text-sm">{structure.name}</h4>
            {structure.latinName && (
              <p className="text-xs text-muted-foreground italic">{structure.latinName}</p>
            )}
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground transition-colors p-1 hover:bg-muted rounded"
        >
          ×
        </button>
      </div>

      {/* Highlight indicator bar */}
      <div 
        className="mt-3 h-1 rounded-full"
        style={{ 
          backgroundColor: hexToRgba(highlightColor, highlightOpacity),
        }}
      />

      <div className="mt-3 space-y-2">
        {structure.description && (
          <div>
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Description</span>
            <p className="text-xs mt-0.5">{structure.description}</p>
          </div>
        )}

        {structure.innervation && (
          <div>
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Innervation</span>
            <p className="text-xs mt-0.5">{structure.innervation}</p>
          </div>
        )}

        {structure.bloodSupply && (
          <div>
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Blood Supply</span>
            <p className="text-xs mt-0.5">{structure.bloodSupply}</p>
          </div>
        )}

        {structure.clinicalNotes && (
          <div>
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Clinical Notes</span>
            <p className="text-xs mt-0.5">{structure.clinicalNotes}</p>
          </div>
        )}
      </div>

      <div className="mt-3 pt-2 border-t flex items-center justify-between gap-2">
        <Badge variant="outline" style={{ borderColor: system.color, color: system.color }} className="text-[9px]">
          {system.name}
        </Badge>
        <span className="text-[9px] text-muted-foreground">
          Opacity: {Math.round(highlightOpacity * 100)}%
        </span>
      </div>
    </div>
  );
}
