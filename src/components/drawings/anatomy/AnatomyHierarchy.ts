/**
 * Complete Anatomy Hierarchy
 * 12 anatomical systems with full subsection breakdown
 * Each structure has a corresponding visual layer
 */

import { ReactNode } from "react";

// Structure represents a single anatomical element that can be:
// - Visually represented
// - Individually selectable
// - Individually highlightable
export interface AnatomyStructure {
  id: string;
  name: string;
  latinName?: string;
  description?: string;
  innervation?: string;
  bloodSupply?: string;
  clinicalNotes?: string;
  layerId: string; // Links to visual layer in SVG
  parentId?: string; // For nested structures
  children?: string[]; // IDs of child structures
}

export interface AnatomySubsystem {
  id: string;
  name: string;
  structures: AnatomyStructure[];
}

export interface AnatomySystem {
  id: string;
  name: string;
  color: string; // System highlight color
  subsystems: AnatomySubsystem[];
}

// Complete 12-system hierarchy as specified
export const COMPLETE_ANATOMY_HIERARCHY: AnatomySystem[] = [
  // 1. SKELETAL SYSTEM
  {
    id: "skeletal",
    name: "Skeletal System",
    color: "#D2B48C",
    subsystems: [
      {
        id: "skull",
        name: "Skull",
        structures: [
          { id: "frontal-bone", name: "Frontal Bone", latinName: "Os frontale", layerId: "skull-frontal", description: "Forms the forehead" },
          { id: "parietal-bones", name: "Parietal Bones", latinName: "Ossa parietalia", layerId: "skull-parietal", description: "Form sides and roof of cranium" },
          { id: "temporal-bones", name: "Temporal Bones", latinName: "Ossa temporalia", layerId: "skull-temporal", description: "House middle and inner ear" },
          { id: "occipital-bone", name: "Occipital Bone", latinName: "Os occipitale", layerId: "skull-occipital", description: "Forms back of skull" },
          { id: "sphenoid-bone", name: "Sphenoid Bone", latinName: "Os sphenoidale", layerId: "skull-sphenoid", description: "Butterfly-shaped bone at skull base" },
          { id: "ethmoid-bone", name: "Ethmoid Bone", latinName: "Os ethmoidale", layerId: "skull-ethmoid", description: "Between eyes, forms nasal cavity roof" },
        ],
      },
      {
        id: "facial-bones",
        name: "Facial Bones",
        structures: [
          { id: "maxilla", name: "Maxilla", latinName: "Maxilla", layerId: "facial-maxilla", description: "Upper jaw bone" },
          { id: "mandible", name: "Mandible", latinName: "Mandibula", layerId: "facial-mandible", description: "Lower jaw bone" },
          { id: "zygomatic-bones", name: "Zygomatic Bones", latinName: "Ossa zygomatica", layerId: "facial-zygomatic", description: "Cheekbones" },
          { id: "nasal-bones", name: "Nasal Bones", latinName: "Ossa nasalia", layerId: "facial-nasal", description: "Bridge of nose" },
          { id: "lacrimal-bones", name: "Lacrimal Bones", latinName: "Ossa lacrimalia", layerId: "facial-lacrimal", description: "Smallest facial bones" },
          { id: "palatine-bones", name: "Palatine Bones", latinName: "Ossa palatina", layerId: "facial-palatine", description: "Form hard palate" },
          { id: "inferior-nasal-conchae", name: "Inferior Nasal Conchae", latinName: "Conchae nasales inferiores", layerId: "facial-conchae", description: "Scroll-shaped bones in nasal cavity" },
          { id: "vomer", name: "Vomer", latinName: "Vomer", layerId: "facial-vomer", description: "Forms nasal septum" },
        ],
      },
      {
        id: "vertebral-column",
        name: "Vertebral Column",
        structures: [
          { id: "cervical-c1", name: "C1 - Atlas", latinName: "Atlas", layerId: "vertebra-c1", description: "First cervical vertebra" },
          { id: "cervical-c2", name: "C2 - Axis", latinName: "Axis", layerId: "vertebra-c2", description: "Second cervical vertebra" },
          { id: "cervical-c3-c7", name: "C3-C7 Cervical", latinName: "Vertebrae cervicales", layerId: "vertebra-c3-c7", description: "Lower cervical vertebrae" },
          { id: "thoracic-t1-t12", name: "T1-T12 Thoracic", latinName: "Vertebrae thoracicae", layerId: "vertebra-thoracic", description: "12 thoracic vertebrae" },
          { id: "lumbar-l1-l5", name: "L1-L5 Lumbar", latinName: "Vertebrae lumbales", layerId: "vertebra-lumbar", description: "5 lumbar vertebrae" },
          { id: "sacral", name: "Sacrum", latinName: "Os sacrum", layerId: "vertebra-sacrum", description: "Fused sacral vertebrae" },
          { id: "coccygeal", name: "Coccyx", latinName: "Os coccygis", layerId: "vertebra-coccyx", description: "Tailbone" },
        ],
      },
      {
        id: "thoracic-cage",
        name: "Thoracic Cage",
        structures: [
          { id: "ribs-true", name: "True Ribs (1-7)", latinName: "Costae verae", layerId: "ribs-true", description: "Attach directly to sternum" },
          { id: "ribs-false", name: "False Ribs (8-10)", latinName: "Costae spuriae", layerId: "ribs-false", description: "Connect via costal cartilage" },
          { id: "ribs-floating", name: "Floating Ribs (11-12)", latinName: "Costae fluctuantes", layerId: "ribs-floating", description: "No anterior attachment" },
          { id: "sternum-manubrium", name: "Manubrium", latinName: "Manubrium sterni", layerId: "sternum-manubrium", description: "Upper sternum" },
          { id: "sternum-body", name: "Sternal Body", latinName: "Corpus sterni", layerId: "sternum-body", description: "Middle sternum" },
          { id: "sternum-xiphoid", name: "Xiphoid Process", latinName: "Processus xiphoideus", layerId: "sternum-xiphoid", description: "Lower sternum" },
        ],
      },
      {
        id: "upper-limb-bones",
        name: "Upper Limb Bones",
        structures: [
          { id: "clavicle", name: "Clavicle", latinName: "Clavicula", layerId: "bone-clavicle", description: "Collarbone" },
          { id: "scapula", name: "Scapula", latinName: "Scapula", layerId: "bone-scapula", description: "Shoulder blade" },
          { id: "humerus", name: "Humerus", latinName: "Humerus", layerId: "bone-humerus", description: "Upper arm bone" },
          { id: "radius", name: "Radius", latinName: "Radius", layerId: "bone-radius", description: "Lateral forearm bone" },
          { id: "ulna", name: "Ulna", latinName: "Ulna", layerId: "bone-ulna", description: "Medial forearm bone" },
          { id: "carpal-bones", name: "Carpal Bones", latinName: "Ossa carpi", layerId: "bone-carpals", description: "8 wrist bones" },
          { id: "metacarpals", name: "Metacarpals", latinName: "Ossa metacarpi", layerId: "bone-metacarpals", description: "5 palm bones" },
          { id: "phalanges-hand", name: "Phalanges (Hand)", latinName: "Phalanges manus", layerId: "bone-phalanges-hand", description: "14 finger bones" },
        ],
      },
      {
        id: "pelvic-girdle",
        name: "Pelvic Girdle",
        structures: [
          { id: "ilium", name: "Ilium", latinName: "Os ilium", layerId: "pelvis-ilium", description: "Superior hip bone" },
          { id: "ischium", name: "Ischium", latinName: "Os ischii", layerId: "pelvis-ischium", description: "Posterior-inferior hip bone" },
          { id: "pubis", name: "Pubis", latinName: "Os pubis", layerId: "pelvis-pubis", description: "Anterior hip bone" },
          { id: "acetabulum", name: "Acetabulum", latinName: "Acetabulum", layerId: "pelvis-acetabulum", description: "Hip socket" },
        ],
      },
      {
        id: "lower-limb-bones",
        name: "Lower Limb Bones",
        structures: [
          { id: "femur", name: "Femur", latinName: "Femur", layerId: "bone-femur", description: "Thigh bone" },
          { id: "patella", name: "Patella", latinName: "Patella", layerId: "bone-patella", description: "Kneecap" },
          { id: "tibia", name: "Tibia", latinName: "Tibia", layerId: "bone-tibia", description: "Shinbone" },
          { id: "fibula", name: "Fibula", latinName: "Fibula", layerId: "bone-fibula", description: "Lateral leg bone" },
          { id: "tarsal-bones", name: "Tarsal Bones", latinName: "Ossa tarsi", layerId: "bone-tarsals", description: "7 ankle bones" },
          { id: "metatarsals", name: "Metatarsals", latinName: "Ossa metatarsi", layerId: "bone-metatarsals", description: "5 foot bones" },
          { id: "phalanges-foot", name: "Phalanges (Foot)", latinName: "Phalanges pedis", layerId: "bone-phalanges-foot", description: "14 toe bones" },
        ],
      },
    ],
  },

  // 2. MUSCULAR SYSTEM
  {
    id: "muscular",
    name: "Muscular System",
    color: "#CD5C5C",
    subsystems: [
      {
        id: "head-neck-muscles",
        name: "Muscles of the Head and Neck",
        structures: [
          { id: "frontalis", name: "Frontalis", latinName: "Musculus frontalis", layerId: "muscle-frontalis", description: "Raises eyebrows" },
          { id: "orbicularis-oculi", name: "Orbicularis Oculi", latinName: "Musculus orbicularis oculi", layerId: "muscle-orbicularis-oculi", description: "Closes eyelids" },
          { id: "orbicularis-oris", name: "Orbicularis Oris", latinName: "Musculus orbicularis oris", layerId: "muscle-orbicularis-oris", description: "Closes lips" },
          { id: "masseter", name: "Masseter", latinName: "Musculus masseter", layerId: "muscle-masseter", description: "Jaw closure" },
          { id: "temporalis", name: "Temporalis", latinName: "Musculus temporalis", layerId: "muscle-temporalis", description: "Jaw elevation" },
          { id: "sternocleidomastoid", name: "Sternocleidomastoid", latinName: "Musculus sternocleidomastoideus", layerId: "muscle-scm", description: "Neck rotation and flexion", innervation: "Accessory nerve (CN XI)" },
          { id: "platysma", name: "Platysma", latinName: "Musculus platysma", layerId: "muscle-platysma", description: "Depresses mandible" },
        ],
      },
      {
        id: "back-muscles",
        name: "Muscles of the Back",
        structures: [
          { id: "trapezius", name: "Trapezius", latinName: "Musculus trapezius", layerId: "muscle-trapezius", description: "Scapular elevation, retraction, rotation", innervation: "Accessory nerve (CN XI)" },
          { id: "latissimus-dorsi", name: "Latissimus Dorsi", latinName: "Musculus latissimus dorsi", layerId: "muscle-latissimus", description: "Arm extension, adduction, medial rotation", innervation: "Thoracodorsal nerve" },
          { id: "rhomboid-major", name: "Rhomboid Major", latinName: "Musculus rhomboideus major", layerId: "muscle-rhomboid-major", description: "Scapular retraction" },
          { id: "rhomboid-minor", name: "Rhomboid Minor", latinName: "Musculus rhomboideus minor", layerId: "muscle-rhomboid-minor", description: "Scapular retraction" },
          { id: "erector-spinae", name: "Erector Spinae", latinName: "Musculus erector spinae", layerId: "muscle-erector-spinae", description: "Extends and stabilizes spine" },
        ],
      },
      {
        id: "thoracic-muscles",
        name: "Thoracic Muscles",
        structures: [
          { id: "pectoralis-major", name: "Pectoralis Major", latinName: "Musculus pectoralis major", layerId: "muscle-pec-major", description: "Arm flexion, adduction, medial rotation", innervation: "Pectoral nerves" },
          { id: "pectoralis-minor", name: "Pectoralis Minor", latinName: "Musculus pectoralis minor", layerId: "muscle-pec-minor", description: "Stabilizes scapula" },
          { id: "serratus-anterior", name: "Serratus Anterior", latinName: "Musculus serratus anterior", layerId: "muscle-serratus", description: "Protracts and rotates scapula", innervation: "Long thoracic nerve" },
          { id: "intercostals-external", name: "External Intercostals", latinName: "Musculi intercostales externi", layerId: "muscle-intercostals-ext", description: "Elevate ribs during inspiration" },
          { id: "intercostals-internal", name: "Internal Intercostals", latinName: "Musculi intercostales interni", layerId: "muscle-intercostals-int", description: "Depress ribs during expiration" },
          { id: "diaphragm", name: "Diaphragm", latinName: "Diaphragma", layerId: "muscle-diaphragm", description: "Primary muscle of respiration", innervation: "Phrenic nerve (C3-C5)" },
        ],
      },
      {
        id: "abdominal-muscles",
        name: "Abdominal Muscles",
        structures: [
          { id: "rectus-abdominis", name: "Rectus Abdominis", latinName: "Musculus rectus abdominis", layerId: "muscle-rectus-abdominis", description: "Trunk flexion, compresses abdomen", innervation: "Intercostal nerves (T7-T12)" },
          { id: "external-oblique", name: "External Oblique", latinName: "Musculus obliquus externus abdominis", layerId: "muscle-ext-oblique", description: "Trunk rotation, lateral flexion" },
          { id: "internal-oblique", name: "Internal Oblique", latinName: "Musculus obliquus internus abdominis", layerId: "muscle-int-oblique", description: "Trunk rotation, lateral flexion" },
          { id: "transversus-abdominis", name: "Transversus Abdominis", latinName: "Musculus transversus abdominis", layerId: "muscle-transversus", description: "Compresses abdomen" },
        ],
      },
      {
        id: "upper-limb-muscles",
        name: "Upper Limb Muscles",
        structures: [
          { id: "deltoid", name: "Deltoid", latinName: "Musculus deltoideus", layerId: "muscle-deltoid", description: "Shoulder abduction, flexion, extension", innervation: "Axillary nerve" },
          { id: "biceps-brachii", name: "Biceps Brachii", latinName: "Musculus biceps brachii", layerId: "muscle-biceps", description: "Elbow flexion, forearm supination", innervation: "Musculocutaneous nerve" },
          { id: "triceps-brachii", name: "Triceps Brachii", latinName: "Musculus triceps brachii", layerId: "muscle-triceps", description: "Elbow extension", innervation: "Radial nerve" },
          { id: "brachialis", name: "Brachialis", latinName: "Musculus brachialis", layerId: "muscle-brachialis", description: "Primary elbow flexor", innervation: "Musculocutaneous nerve" },
          { id: "brachioradialis", name: "Brachioradialis", latinName: "Musculus brachioradialis", layerId: "muscle-brachioradialis", description: "Elbow flexion" },
          { id: "forearm-flexors", name: "Forearm Flexors", latinName: "Musculi flexores antebrachii", layerId: "muscle-forearm-flexors", description: "Wrist and finger flexion" },
          { id: "forearm-extensors", name: "Forearm Extensors", latinName: "Musculi extensores antebrachii", layerId: "muscle-forearm-extensors", description: "Wrist and finger extension" },
        ],
      },
      {
        id: "lower-limb-muscles",
        name: "Lower Limb Muscles",
        structures: [
          { id: "gluteus-maximus", name: "Gluteus Maximus", latinName: "Musculus gluteus maximus", layerId: "muscle-glute-max", description: "Hip extension, lateral rotation", innervation: "Inferior gluteal nerve" },
          { id: "gluteus-medius", name: "Gluteus Medius", latinName: "Musculus gluteus medius", layerId: "muscle-glute-med", description: "Hip abduction", innervation: "Superior gluteal nerve" },
          { id: "quadriceps-femoris", name: "Quadriceps Femoris", latinName: "Musculus quadriceps femoris", layerId: "muscle-quadriceps", description: "Knee extension", innervation: "Femoral nerve" },
          { id: "hamstrings", name: "Hamstrings", latinName: "Musculi ischiocrurales", layerId: "muscle-hamstrings", description: "Knee flexion, hip extension" },
          { id: "adductors", name: "Hip Adductors", latinName: "Musculi adductores", layerId: "muscle-adductors", description: "Hip adduction" },
          { id: "gastrocnemius", name: "Gastrocnemius", latinName: "Musculus gastrocnemius", layerId: "muscle-gastrocnemius", description: "Plantarflexion, knee flexion", innervation: "Tibial nerve" },
          { id: "soleus", name: "Soleus", latinName: "Musculus soleus", layerId: "muscle-soleus", description: "Plantarflexion" },
          { id: "tibialis-anterior", name: "Tibialis Anterior", latinName: "Musculus tibialis anterior", layerId: "muscle-tibialis-ant", description: "Dorsiflexion, foot inversion" },
        ],
      },
      {
        id: "pelvic-floor-muscles",
        name: "Pelvic Floor Muscles",
        structures: [
          { id: "levator-ani", name: "Levator Ani", latinName: "Musculus levator ani", layerId: "muscle-levator-ani", description: "Supports pelvic viscera" },
          { id: "coccygeus", name: "Coccygeus", latinName: "Musculus coccygeus", layerId: "muscle-coccygeus", description: "Supports pelvic viscera" },
          { id: "external-anal-sphincter", name: "External Anal Sphincter", latinName: "Musculus sphincter ani externus", layerId: "muscle-anal-sphincter", description: "Controls defecation" },
        ],
      },
    ],
  },

  // 3. NERVOUS SYSTEM
  {
    id: "nervous",
    name: "Nervous System",
    color: "#FFD700",
    subsystems: [
      {
        id: "brain",
        name: "Brain",
        structures: [
          { id: "cerebrum", name: "Cerebrum", latinName: "Cerebrum", layerId: "brain-cerebrum", description: "Higher cognitive functions" },
          { id: "frontal-lobe", name: "Frontal Lobe", latinName: "Lobus frontalis", layerId: "brain-frontal", description: "Motor function, personality, decision making" },
          { id: "parietal-lobe", name: "Parietal Lobe", latinName: "Lobus parietalis", layerId: "brain-parietal", description: "Sensory processing, spatial awareness" },
          { id: "temporal-lobe", name: "Temporal Lobe", latinName: "Lobus temporalis", layerId: "brain-temporal", description: "Hearing, memory, language" },
          { id: "occipital-lobe", name: "Occipital Lobe", latinName: "Lobus occipitalis", layerId: "brain-occipital", description: "Visual processing" },
          { id: "cerebellum", name: "Cerebellum", latinName: "Cerebellum", layerId: "brain-cerebellum", description: "Motor coordination, balance" },
          { id: "brainstem", name: "Brainstem", latinName: "Truncus encephali", layerId: "brain-brainstem", description: "Basic life functions" },
        ],
      },
      {
        id: "spinal-cord",
        name: "Spinal Cord",
        structures: [
          { id: "cervical-cord", name: "Cervical Spinal Cord", latinName: "Pars cervicalis medullae spinalis", layerId: "cord-cervical", description: "C1-C8 segments" },
          { id: "thoracic-cord", name: "Thoracic Spinal Cord", latinName: "Pars thoracica medullae spinalis", layerId: "cord-thoracic", description: "T1-T12 segments" },
          { id: "lumbar-cord", name: "Lumbar Spinal Cord", latinName: "Pars lumbalis medullae spinalis", layerId: "cord-lumbar", description: "L1-L5 segments" },
          { id: "sacral-cord", name: "Sacral Spinal Cord", latinName: "Pars sacralis medullae spinalis", layerId: "cord-sacral", description: "S1-S5 segments" },
          { id: "cauda-equina", name: "Cauda Equina", latinName: "Cauda equina", layerId: "cord-cauda-equina", description: "Bundle of spinal nerves below L2" },
        ],
      },
      {
        id: "cranial-nerves",
        name: "Cranial Nerves",
        structures: [
          { id: "cn-i", name: "I - Olfactory", latinName: "Nervus olfactorius", layerId: "cn-olfactory", description: "Sense of smell" },
          { id: "cn-ii", name: "II - Optic", latinName: "Nervus opticus", layerId: "cn-optic", description: "Vision" },
          { id: "cn-iii", name: "III - Oculomotor", latinName: "Nervus oculomotorius", layerId: "cn-oculomotor", description: "Eye movement, pupil constriction" },
          { id: "cn-iv", name: "IV - Trochlear", latinName: "Nervus trochlearis", layerId: "cn-trochlear", description: "Superior oblique muscle" },
          { id: "cn-v", name: "V - Trigeminal", latinName: "Nervus trigeminus", layerId: "cn-trigeminal", description: "Facial sensation, mastication" },
          { id: "cn-vi", name: "VI - Abducens", latinName: "Nervus abducens", layerId: "cn-abducens", description: "Lateral rectus muscle" },
          { id: "cn-vii", name: "VII - Facial", latinName: "Nervus facialis", layerId: "cn-facial", description: "Facial expression, taste" },
          { id: "cn-viii", name: "VIII - Vestibulocochlear", latinName: "Nervus vestibulocochlearis", layerId: "cn-vestibulocochlear", description: "Hearing, balance" },
          { id: "cn-ix", name: "IX - Glossopharyngeal", latinName: "Nervus glossopharyngeus", layerId: "cn-glossopharyngeal", description: "Swallowing, taste" },
          { id: "cn-x", name: "X - Vagus", latinName: "Nervus vagus", layerId: "cn-vagus", description: "Parasympathetic to thorax/abdomen" },
          { id: "cn-xi", name: "XI - Accessory", latinName: "Nervus accessorius", layerId: "cn-accessory", description: "Trapezius, sternocleidomastoid" },
          { id: "cn-xii", name: "XII - Hypoglossal", latinName: "Nervus hypoglossus", layerId: "cn-hypoglossal", description: "Tongue movement" },
        ],
      },
      {
        id: "spinal-nerves",
        name: "Spinal Nerves",
        structures: [
          { id: "cervical-nerves", name: "Cervical Nerves (C1-C8)", latinName: "Nervi cervicales", layerId: "nerve-cervical", description: "Neck and upper limb innervation" },
          { id: "thoracic-nerves", name: "Thoracic Nerves (T1-T12)", latinName: "Nervi thoracici", layerId: "nerve-thoracic", description: "Thorax and abdominal wall" },
          { id: "lumbar-nerves", name: "Lumbar Nerves (L1-L5)", latinName: "Nervi lumbales", layerId: "nerve-lumbar", description: "Lower limb and pelvis" },
          { id: "sacral-nerves", name: "Sacral Nerves (S1-S5)", latinName: "Nervi sacrales", layerId: "nerve-sacral", description: "Pelvis and lower limb" },
          { id: "brachial-plexus", name: "Brachial Plexus", latinName: "Plexus brachialis", layerId: "nerve-brachial-plexus", description: "C5-T1 to upper limb" },
          { id: "lumbar-plexus", name: "Lumbar Plexus", latinName: "Plexus lumbalis", layerId: "nerve-lumbar-plexus", description: "L1-L4 to lower limb" },
          { id: "sacral-plexus", name: "Sacral Plexus", latinName: "Plexus sacralis", layerId: "nerve-sacral-plexus", description: "L4-S4 to lower limb" },
          { id: "sciatic-nerve", name: "Sciatic Nerve", latinName: "Nervus ischiadicus", layerId: "nerve-sciatic", description: "Largest nerve in body" },
        ],
      },
      {
        id: "autonomic-sympathetic",
        name: "Sympathetic Division",
        structures: [
          { id: "sympathetic-trunk", name: "Sympathetic Trunk", latinName: "Truncus sympathicus", layerId: "ans-sympathetic-trunk", description: "Chain ganglia along spine" },
          { id: "splanchnic-nerves", name: "Splanchnic Nerves", latinName: "Nervi splanchnici", layerId: "ans-splanchnic", description: "To abdominal organs" },
        ],
      },
      {
        id: "autonomic-parasympathetic",
        name: "Parasympathetic Division",
        structures: [
          { id: "vagus-autonomic", name: "Vagus Nerve (Autonomic)", latinName: "Nervus vagus", layerId: "ans-vagus", description: "Rest and digest" },
          { id: "pelvic-splanchnic", name: "Pelvic Splanchnic Nerves", latinName: "Nervi splanchnici pelvici", layerId: "ans-pelvic-splanchnic", description: "S2-S4 to pelvic organs" },
        ],
      },
    ],
  },

  // 4. CARDIOVASCULAR SYSTEM
  {
    id: "cardiovascular",
    name: "Cardiovascular System",
    color: "#DC143C",
    subsystems: [
      {
        id: "heart",
        name: "Heart",
        structures: [
          { id: "right-atrium", name: "Right Atrium", latinName: "Atrium dextrum", layerId: "heart-ra", description: "Receives deoxygenated blood from body" },
          { id: "right-ventricle", name: "Right Ventricle", latinName: "Ventriculus dexter", layerId: "heart-rv", description: "Pumps blood to lungs" },
          { id: "left-atrium", name: "Left Atrium", latinName: "Atrium sinistrum", layerId: "heart-la", description: "Receives oxygenated blood from lungs" },
          { id: "left-ventricle", name: "Left Ventricle", latinName: "Ventriculus sinister", layerId: "heart-lv", description: "Pumps blood to body" },
          { id: "tricuspid-valve", name: "Tricuspid Valve", latinName: "Valva tricuspidalis", layerId: "heart-tricuspid", description: "Between RA and RV" },
          { id: "pulmonary-valve", name: "Pulmonary Valve", latinName: "Valva pulmonalis", layerId: "heart-pulmonary-valve", description: "Between RV and pulmonary artery" },
          { id: "mitral-valve", name: "Mitral Valve", latinName: "Valva mitralis", layerId: "heart-mitral", description: "Between LA and LV" },
          { id: "aortic-valve", name: "Aortic Valve", latinName: "Valva aortae", layerId: "heart-aortic-valve", description: "Between LV and aorta" },
        ],
      },
      {
        id: "arteries",
        name: "Arteries",
        structures: [
          { id: "aorta", name: "Aorta", latinName: "Aorta", layerId: "artery-aorta", description: "Main artery from heart" },
          { id: "carotid-arteries", name: "Common Carotid Arteries", latinName: "Arteriae carotides communes", layerId: "artery-carotid", description: "Blood to head and neck" },
          { id: "subclavian-arteries", name: "Subclavian Arteries", latinName: "Arteriae subclaviae", layerId: "artery-subclavian", description: "Blood to upper limbs" },
          { id: "coronary-arteries", name: "Coronary Arteries", latinName: "Arteriae coronariae", layerId: "artery-coronary", description: "Blood to heart muscle" },
          { id: "pulmonary-arteries", name: "Pulmonary Arteries", latinName: "Arteriae pulmonales", layerId: "artery-pulmonary", description: "Deoxygenated blood to lungs" },
          { id: "brachial-artery", name: "Brachial Artery", latinName: "Arteria brachialis", layerId: "artery-brachial", description: "Upper arm blood supply" },
          { id: "radial-artery", name: "Radial Artery", latinName: "Arteria radialis", layerId: "artery-radial", description: "Forearm blood supply" },
          { id: "femoral-artery", name: "Femoral Artery", latinName: "Arteria femoralis", layerId: "artery-femoral", description: "Thigh blood supply" },
          { id: "popliteal-artery", name: "Popliteal Artery", latinName: "Arteria poplitea", layerId: "artery-popliteal", description: "Knee region blood supply" },
        ],
      },
      {
        id: "veins",
        name: "Veins",
        structures: [
          { id: "superior-vena-cava", name: "Superior Vena Cava", latinName: "Vena cava superior", layerId: "vein-svc", description: "Drains upper body" },
          { id: "inferior-vena-cava", name: "Inferior Vena Cava", latinName: "Vena cava inferior", layerId: "vein-ivc", description: "Drains lower body" },
          { id: "jugular-veins", name: "Jugular Veins", latinName: "Venae jugulares", layerId: "vein-jugular", description: "Drain head and neck" },
          { id: "pulmonary-veins", name: "Pulmonary Veins", latinName: "Venae pulmonales", layerId: "vein-pulmonary", description: "Oxygenated blood from lungs" },
          { id: "portal-vein", name: "Hepatic Portal Vein", latinName: "Vena portae hepatis", layerId: "vein-portal", description: "GI tract to liver" },
          { id: "femoral-vein", name: "Femoral Vein", latinName: "Vena femoralis", layerId: "vein-femoral", description: "Drains lower limb" },
        ],
      },
      {
        id: "capillaries",
        name: "Capillaries",
        structures: [
          { id: "systemic-capillaries", name: "Systemic Capillaries", layerId: "capillary-systemic", description: "Gas exchange with tissues" },
          { id: "pulmonary-capillaries", name: "Pulmonary Capillaries", layerId: "capillary-pulmonary", description: "Gas exchange in lungs" },
        ],
      },
      {
        id: "pulmonary-circulation",
        name: "Pulmonary Circulation",
        structures: [
          { id: "pulmonary-trunk", name: "Pulmonary Trunk", latinName: "Truncus pulmonalis", layerId: "pulm-trunk", description: "RV to pulmonary arteries" },
        ],
      },
      {
        id: "systemic-circulation",
        name: "Systemic Circulation",
        structures: [
          { id: "aortic-arch", name: "Aortic Arch", latinName: "Arcus aortae", layerId: "systemic-aortic-arch", description: "Curves over heart" },
          { id: "descending-aorta", name: "Descending Aorta", latinName: "Aorta descendens", layerId: "systemic-desc-aorta", description: "Thoracic and abdominal" },
        ],
      },
    ],
  },

  // 5. RESPIRATORY SYSTEM
  {
    id: "respiratory",
    name: "Respiratory System",
    color: "#87CEEB",
    subsystems: [
      {
        id: "nasal-cavity",
        name: "Nasal Cavity",
        structures: [
          { id: "nasal-septum", name: "Nasal Septum", latinName: "Septum nasi", layerId: "resp-nasal-septum", description: "Divides nasal cavity" },
          { id: "nasal-conchae", name: "Nasal Conchae", latinName: "Conchae nasales", layerId: "resp-nasal-conchae", description: "Increase surface area" },
          { id: "paranasal-sinuses", name: "Paranasal Sinuses", latinName: "Sinus paranasales", layerId: "resp-sinuses", description: "Air-filled cavities" },
        ],
      },
      {
        id: "pharynx",
        name: "Pharynx",
        structures: [
          { id: "nasopharynx", name: "Nasopharynx", latinName: "Pars nasalis pharyngis", layerId: "resp-nasopharynx", description: "Behind nasal cavity" },
          { id: "oropharynx", name: "Oropharynx", latinName: "Pars oralis pharyngis", layerId: "resp-oropharynx", description: "Behind oral cavity" },
          { id: "laryngopharynx", name: "Laryngopharynx", latinName: "Pars laryngea pharyngis", layerId: "resp-laryngopharynx", description: "Behind larynx" },
        ],
      },
      {
        id: "larynx",
        name: "Larynx",
        structures: [
          { id: "thyroid-cartilage", name: "Thyroid Cartilage", latinName: "Cartilago thyroidea", layerId: "resp-thyroid-cart", description: "Adam's apple" },
          { id: "cricoid-cartilage", name: "Cricoid Cartilage", latinName: "Cartilago cricoidea", layerId: "resp-cricoid", description: "Ring-shaped cartilage" },
          { id: "epiglottis", name: "Epiglottis", latinName: "Epiglottis", layerId: "resp-epiglottis", description: "Covers airway during swallowing" },
          { id: "vocal-cords", name: "Vocal Cords", latinName: "Plicae vocales", layerId: "resp-vocal-cords", description: "Voice production" },
        ],
      },
      {
        id: "trachea",
        name: "Trachea",
        structures: [
          { id: "trachea-main", name: "Trachea", latinName: "Trachea", layerId: "resp-trachea", description: "Windpipe, C-shaped cartilages" },
          { id: "carina", name: "Carina", latinName: "Carina tracheae", layerId: "resp-carina", description: "Tracheal bifurcation point" },
        ],
      },
      {
        id: "bronchi",
        name: "Bronchi",
        structures: [
          { id: "primary-bronchi", name: "Primary Bronchi", latinName: "Bronchi principales", layerId: "resp-primary-bronchi", description: "Left and right main bronchi" },
          { id: "secondary-bronchi", name: "Secondary Bronchi", latinName: "Bronchi lobares", layerId: "resp-secondary-bronchi", description: "Lobar bronchi" },
          { id: "tertiary-bronchi", name: "Tertiary Bronchi", latinName: "Bronchi segmentales", layerId: "resp-tertiary-bronchi", description: "Segmental bronchi" },
          { id: "bronchioles", name: "Bronchioles", latinName: "Bronchioli", layerId: "resp-bronchioles", description: "Smallest airways" },
        ],
      },
      {
        id: "lungs",
        name: "Lungs",
        structures: [
          { id: "right-lung-upper", name: "Right Upper Lobe", latinName: "Lobus superior dexter", layerId: "lung-right-upper", description: "Right lung superior lobe" },
          { id: "right-lung-middle", name: "Right Middle Lobe", latinName: "Lobus medius", layerId: "lung-right-middle", description: "Right lung middle lobe" },
          { id: "right-lung-lower", name: "Right Lower Lobe", latinName: "Lobus inferior dexter", layerId: "lung-right-lower", description: "Right lung inferior lobe" },
          { id: "left-lung-upper", name: "Left Upper Lobe", latinName: "Lobus superior sinister", layerId: "lung-left-upper", description: "Left lung superior lobe" },
          { id: "left-lung-lower", name: "Left Lower Lobe", latinName: "Lobus inferior sinister", layerId: "lung-left-lower", description: "Left lung inferior lobe" },
          { id: "alveoli", name: "Alveoli", latinName: "Alveoli pulmonum", layerId: "lung-alveoli", description: "Gas exchange units" },
        ],
      },
      {
        id: "diaphragm-resp",
        name: "Diaphragm",
        structures: [
          { id: "diaphragm-dome", name: "Diaphragm", latinName: "Diaphragma", layerId: "resp-diaphragm", description: "Primary respiratory muscle" },
        ],
      },
    ],
  },

  // 6. DIGESTIVE SYSTEM
  {
    id: "digestive",
    name: "Digestive System",
    color: "#DEB887",
    subsystems: [
      {
        id: "oral-cavity",
        name: "Oral Cavity",
        structures: [
          { id: "tongue", name: "Tongue", latinName: "Lingua", layerId: "dig-tongue", description: "Taste and manipulation of food" },
          { id: "teeth", name: "Teeth", latinName: "Dentes", layerId: "dig-teeth", description: "Mechanical digestion" },
          { id: "salivary-glands", name: "Salivary Glands", latinName: "Glandulae salivariae", layerId: "dig-salivary", description: "Saliva production" },
          { id: "hard-palate", name: "Hard Palate", latinName: "Palatum durum", layerId: "dig-hard-palate", description: "Roof of mouth" },
          { id: "soft-palate", name: "Soft Palate", latinName: "Palatum molle", layerId: "dig-soft-palate", description: "Posterior roof of mouth" },
        ],
      },
      {
        id: "esophagus",
        name: "Esophagus",
        structures: [
          { id: "esophagus-cervical", name: "Cervical Esophagus", layerId: "dig-esoph-cervical", description: "Neck portion" },
          { id: "esophagus-thoracic", name: "Thoracic Esophagus", layerId: "dig-esoph-thoracic", description: "Chest portion" },
          { id: "esophagus-abdominal", name: "Abdominal Esophagus", layerId: "dig-esoph-abdominal", description: "Abdominal portion" },
        ],
      },
      {
        id: "stomach",
        name: "Stomach",
        structures: [
          { id: "cardia", name: "Cardia", latinName: "Cardia", layerId: "stomach-cardia", description: "Gastroesophageal junction" },
          { id: "fundus", name: "Fundus", latinName: "Fundus gastricus", layerId: "stomach-fundus", description: "Upper portion" },
          { id: "body-stomach", name: "Body", latinName: "Corpus gastricum", layerId: "stomach-body", description: "Main portion" },
          { id: "pylorus", name: "Pylorus", latinName: "Pylorus", layerId: "stomach-pylorus", description: "Junction with duodenum" },
        ],
      },
      {
        id: "small-intestine",
        name: "Small Intestine",
        structures: [
          { id: "duodenum", name: "Duodenum", latinName: "Duodenum", layerId: "si-duodenum", description: "First 25cm of small intestine" },
          { id: "jejunum", name: "Jejunum", latinName: "Jejunum", layerId: "si-jejunum", description: "Middle portion, major absorption" },
          { id: "ileum", name: "Ileum", latinName: "Ileum", layerId: "si-ileum", description: "Final portion, B12 and bile salt absorption" },
        ],
      },
      {
        id: "large-intestine",
        name: "Large Intestine",
        structures: [
          { id: "cecum", name: "Cecum", latinName: "Caecum", layerId: "li-cecum", description: "First portion of large intestine" },
          { id: "appendix", name: "Appendix", latinName: "Appendix vermiformis", layerId: "li-appendix", description: "Vestigial structure" },
          { id: "ascending-colon", name: "Ascending Colon", latinName: "Colon ascendens", layerId: "li-ascending", description: "Right side of abdomen" },
          { id: "transverse-colon", name: "Transverse Colon", latinName: "Colon transversum", layerId: "li-transverse", description: "Crosses abdomen" },
          { id: "descending-colon", name: "Descending Colon", latinName: "Colon descendens", layerId: "li-descending", description: "Left side of abdomen" },
          { id: "sigmoid-colon", name: "Sigmoid Colon", latinName: "Colon sigmoideum", layerId: "li-sigmoid", description: "S-shaped portion" },
          { id: "rectum", name: "Rectum", latinName: "Rectum", layerId: "li-rectum", description: "Final straight portion" },
          { id: "anal-canal", name: "Anal Canal", latinName: "Canalis analis", layerId: "li-anal-canal", description: "Terminal portion" },
        ],
      },
      {
        id: "liver",
        name: "Liver",
        structures: [
          { id: "right-lobe-liver", name: "Right Lobe", latinName: "Lobus hepatis dexter", layerId: "liver-right", description: "Larger lobe" },
          { id: "left-lobe-liver", name: "Left Lobe", latinName: "Lobus hepatis sinister", layerId: "liver-left", description: "Smaller lobe" },
          { id: "caudate-lobe", name: "Caudate Lobe", latinName: "Lobus caudatus", layerId: "liver-caudate", description: "Posterior lobe" },
          { id: "quadrate-lobe", name: "Quadrate Lobe", latinName: "Lobus quadratus", layerId: "liver-quadrate", description: "Inferior lobe" },
        ],
      },
      {
        id: "gallbladder",
        name: "Gallbladder",
        structures: [
          { id: "gallbladder-fundus", name: "Gallbladder", latinName: "Vesica biliaris", layerId: "gallbladder-main", description: "Bile storage and concentration" },
          { id: "cystic-duct", name: "Cystic Duct", latinName: "Ductus cysticus", layerId: "gallbladder-cystic-duct", description: "Drains gallbladder" },
          { id: "common-bile-duct", name: "Common Bile Duct", latinName: "Ductus choledochus", layerId: "gallbladder-cbd", description: "Bile to duodenum" },
        ],
      },
      {
        id: "pancreas",
        name: "Pancreas",
        structures: [
          { id: "pancreas-head", name: "Head of Pancreas", latinName: "Caput pancreatis", layerId: "pancreas-head", description: "Within C-curve of duodenum" },
          { id: "pancreas-body", name: "Body of Pancreas", latinName: "Corpus pancreatis", layerId: "pancreas-body", description: "Central portion" },
          { id: "pancreas-tail", name: "Tail of Pancreas", latinName: "Cauda pancreatis", layerId: "pancreas-tail", description: "Extends to spleen" },
        ],
      },
    ],
  },

  // 7. URINARY SYSTEM
  {
    id: "urinary",
    name: "Urinary System",
    color: "#F0E68C",
    subsystems: [
      {
        id: "kidneys",
        name: "Kidneys",
        structures: [
          { id: "right-kidney", name: "Right Kidney", latinName: "Ren dexter", layerId: "kidney-right", description: "Slightly lower due to liver" },
          { id: "left-kidney", name: "Left Kidney", latinName: "Ren sinister", layerId: "kidney-left", description: "Slightly higher" },
          { id: "renal-cortex", name: "Renal Cortex", latinName: "Cortex renalis", layerId: "kidney-cortex", description: "Outer layer" },
          { id: "renal-medulla", name: "Renal Medulla", latinName: "Medulla renalis", layerId: "kidney-medulla", description: "Inner layer, pyramids" },
          { id: "renal-pelvis", name: "Renal Pelvis", latinName: "Pelvis renalis", layerId: "kidney-pelvis", description: "Collects urine" },
        ],
      },
      {
        id: "ureters",
        name: "Ureters",
        structures: [
          { id: "right-ureter", name: "Right Ureter", latinName: "Ureter dexter", layerId: "ureter-right", description: "Kidney to bladder" },
          { id: "left-ureter", name: "Left Ureter", latinName: "Ureter sinister", layerId: "ureter-left", description: "Kidney to bladder" },
        ],
      },
      {
        id: "bladder",
        name: "Bladder",
        structures: [
          { id: "urinary-bladder", name: "Urinary Bladder", latinName: "Vesica urinaria", layerId: "bladder-main", description: "Urine storage" },
          { id: "trigone", name: "Trigone", latinName: "Trigonum vesicae", layerId: "bladder-trigone", description: "Triangular base" },
        ],
      },
      {
        id: "urethra",
        name: "Urethra",
        structures: [
          { id: "urethra-main", name: "Urethra", latinName: "Urethra", layerId: "urethra-main", description: "Urine excretion" },
        ],
      },
    ],
  },

  // 8. REPRODUCTIVE SYSTEM
  {
    id: "reproductive",
    name: "Reproductive System",
    color: "#DDA0DD",
    subsystems: [
      {
        id: "male-reproductive",
        name: "Male Reproductive",
        structures: [
          { id: "testes", name: "Testes", latinName: "Testes", layerId: "male-testes", description: "Sperm and testosterone production" },
          { id: "epididymis", name: "Epididymis", latinName: "Epididymis", layerId: "male-epididymis", description: "Sperm maturation and storage" },
          { id: "vas-deferens", name: "Vas Deferens", latinName: "Ductus deferens", layerId: "male-vas-deferens", description: "Sperm transport" },
          { id: "seminal-vesicles", name: "Seminal Vesicles", latinName: "Vesiculae seminales", layerId: "male-seminal-vesicles", description: "Semen component production" },
          { id: "prostate", name: "Prostate", latinName: "Prostata", layerId: "male-prostate", description: "Prostate fluid production" },
          { id: "penis", name: "Penis", latinName: "Penis", layerId: "male-penis", description: "Copulation and urination" },
        ],
      },
      {
        id: "female-reproductive",
        name: "Female Reproductive",
        structures: [
          { id: "ovaries", name: "Ovaries", latinName: "Ovaria", layerId: "female-ovaries", description: "Egg and hormone production" },
          { id: "fallopian-tubes", name: "Fallopian Tubes", latinName: "Tubae uterinae", layerId: "female-fallopian", description: "Egg transport, fertilization site" },
          { id: "uterus", name: "Uterus", latinName: "Uterus", layerId: "female-uterus", description: "Fetal development" },
          { id: "cervix", name: "Cervix", latinName: "Cervix uteri", layerId: "female-cervix", description: "Lower uterus, opens to vagina" },
          { id: "vagina", name: "Vagina", latinName: "Vagina", layerId: "female-vagina", description: "Birth canal" },
        ],
      },
    ],
  },

  // 9. ENDOCRINE SYSTEM
  {
    id: "endocrine",
    name: "Endocrine System",
    color: "#9370DB",
    subsystems: [
      {
        id: "hypothalamus-pituitary",
        name: "Hypothalamus & Pituitary",
        structures: [
          { id: "hypothalamus", name: "Hypothalamus", latinName: "Hypothalamus", layerId: "endo-hypothalamus", description: "Master regulator" },
          { id: "pituitary-anterior", name: "Anterior Pituitary", latinName: "Adenohypophysis", layerId: "endo-pituitary-ant", description: "ACTH, TSH, GH, FSH, LH, prolactin" },
          { id: "pituitary-posterior", name: "Posterior Pituitary", latinName: "Neurohypophysis", layerId: "endo-pituitary-post", description: "ADH, oxytocin" },
        ],
      },
      {
        id: "thyroid-parathyroid",
        name: "Thyroid & Parathyroids",
        structures: [
          { id: "thyroid", name: "Thyroid Gland", latinName: "Glandula thyroidea", layerId: "endo-thyroid", description: "T3, T4, calcitonin" },
          { id: "parathyroids", name: "Parathyroid Glands", latinName: "Glandulae parathyroideae", layerId: "endo-parathyroid", description: "PTH - calcium regulation" },
        ],
      },
      {
        id: "adrenal-glands",
        name: "Adrenal Glands",
        structures: [
          { id: "adrenal-cortex", name: "Adrenal Cortex", latinName: "Cortex glandulae suprarenalis", layerId: "endo-adrenal-cortex", description: "Cortisol, aldosterone" },
          { id: "adrenal-medulla", name: "Adrenal Medulla", latinName: "Medulla glandulae suprarenalis", layerId: "endo-adrenal-medulla", description: "Epinephrine, norepinephrine" },
        ],
      },
      {
        id: "pancreatic-islets",
        name: "Pancreatic Islets",
        structures: [
          { id: "islets-langerhans", name: "Islets of Langerhans", latinName: "Insulae pancreaticae", layerId: "endo-islets", description: "Insulin, glucagon" },
        ],
      },
      {
        id: "gonads",
        name: "Gonads",
        structures: [
          { id: "gonads-testes", name: "Testes (Endocrine)", layerId: "endo-testes", description: "Testosterone" },
          { id: "gonads-ovaries", name: "Ovaries (Endocrine)", layerId: "endo-ovaries", description: "Estrogen, progesterone" },
        ],
      },
    ],
  },

  // 10. LYMPHATIC & IMMUNE SYSTEM
  {
    id: "lymphatic",
    name: "Lymphatic & Immune System",
    color: "#98FB98",
    subsystems: [
      {
        id: "lymph-nodes",
        name: "Lymph Nodes",
        structures: [
          { id: "cervical-nodes", name: "Cervical Lymph Nodes", latinName: "Nodi lymphoidei cervicales", layerId: "lymph-cervical", description: "Drain head and neck" },
          { id: "axillary-nodes", name: "Axillary Lymph Nodes", latinName: "Nodi lymphoidei axillares", layerId: "lymph-axillary", description: "Drain upper limb and breast" },
          { id: "inguinal-nodes", name: "Inguinal Lymph Nodes", latinName: "Nodi lymphoidei inguinales", layerId: "lymph-inguinal", description: "Drain lower limb and pelvis" },
          { id: "mesenteric-nodes", name: "Mesenteric Lymph Nodes", latinName: "Nodi lymphoidei mesenterici", layerId: "lymph-mesenteric", description: "Drain GI tract" },
        ],
      },
      {
        id: "lymphatic-vessels",
        name: "Lymphatic Vessels",
        structures: [
          { id: "thoracic-duct", name: "Thoracic Duct", latinName: "Ductus thoracicus", layerId: "lymph-thoracic-duct", description: "Main lymphatic vessel" },
          { id: "right-lymphatic-duct", name: "Right Lymphatic Duct", latinName: "Ductus lymphaticus dexter", layerId: "lymph-right-duct", description: "Drains right upper body" },
        ],
      },
      {
        id: "spleen",
        name: "Spleen",
        structures: [
          { id: "spleen-main", name: "Spleen", latinName: "Splen", layerId: "lymph-spleen", description: "Blood filtration, immune function" },
        ],
      },
      {
        id: "thymus",
        name: "Thymus",
        structures: [
          { id: "thymus-main", name: "Thymus", latinName: "Thymus", layerId: "lymph-thymus", description: "T-cell maturation" },
        ],
      },
      {
        id: "tonsils",
        name: "Tonsils",
        structures: [
          { id: "palatine-tonsils", name: "Palatine Tonsils", latinName: "Tonsillae palatinae", layerId: "lymph-palatine-tonsils", description: "Throat immunity" },
          { id: "pharyngeal-tonsil", name: "Pharyngeal Tonsil (Adenoid)", latinName: "Tonsilla pharyngealis", layerId: "lymph-adenoid", description: "Nasopharynx immunity" },
          { id: "lingual-tonsils", name: "Lingual Tonsils", latinName: "Tonsillae linguales", layerId: "lymph-lingual-tonsils", description: "Base of tongue" },
        ],
      },
    ],
  },

  // 11. INTEGUMENTARY SYSTEM
  {
    id: "integumentary",
    name: "Integumentary System",
    color: "#FFDAB9",
    subsystems: [
      {
        id: "skin-layers",
        name: "Skin Layers",
        structures: [
          { id: "epidermis", name: "Epidermis", latinName: "Epidermis", layerId: "skin-epidermis", description: "Outermost layer, protection" },
          { id: "dermis", name: "Dermis", latinName: "Dermis", layerId: "skin-dermis", description: "Contains vessels, nerves, glands" },
          { id: "hypodermis", name: "Hypodermis", latinName: "Tela subcutanea", layerId: "skin-hypodermis", description: "Fat storage, insulation" },
        ],
      },
      {
        id: "hair",
        name: "Hair",
        structures: [
          { id: "hair-follicle", name: "Hair Follicle", latinName: "Folliculus pili", layerId: "skin-hair-follicle", description: "Hair growth structure" },
          { id: "hair-shaft", name: "Hair Shaft", latinName: "Scapus pili", layerId: "skin-hair-shaft", description: "Visible hair" },
          { id: "arrector-pili", name: "Arrector Pili Muscle", latinName: "Musculus arrector pili", layerId: "skin-arrector-pili", description: "Causes goosebumps" },
        ],
      },
      {
        id: "nails",
        name: "Nails",
        structures: [
          { id: "nail-plate", name: "Nail Plate", latinName: "Lamina unguis", layerId: "skin-nail-plate", description: "Visible nail" },
          { id: "nail-bed", name: "Nail Bed", latinName: "Lectulus unguis", layerId: "skin-nail-bed", description: "Tissue under nail" },
          { id: "nail-matrix", name: "Nail Matrix", latinName: "Matrix unguis", layerId: "skin-nail-matrix", description: "Nail growth zone" },
        ],
      },
      {
        id: "sweat-glands",
        name: "Sweat Glands",
        structures: [
          { id: "eccrine-glands", name: "Eccrine Sweat Glands", latinName: "Glandulae sudoriferae eccrinae", layerId: "skin-eccrine", description: "Temperature regulation" },
          { id: "apocrine-glands", name: "Apocrine Sweat Glands", latinName: "Glandulae sudoriferae apocrinae", layerId: "skin-apocrine", description: "Scent glands" },
        ],
      },
      {
        id: "sebaceous-glands",
        name: "Sebaceous Glands",
        structures: [
          { id: "sebaceous-main", name: "Sebaceous Glands", latinName: "Glandulae sebaceae", layerId: "skin-sebaceous", description: "Oil/sebum production" },
        ],
      },
    ],
  },

  // 12. SENSORY ORGANS
  {
    id: "sensory",
    name: "Sensory Organs",
    color: "#40E0D0",
    subsystems: [
      {
        id: "eye",
        name: "Eye",
        structures: [
          { id: "cornea", name: "Cornea", latinName: "Cornea", layerId: "eye-cornea", description: "Clear front of eye" },
          { id: "iris", name: "Iris", latinName: "Iris", layerId: "eye-iris", description: "Controls pupil size" },
          { id: "pupil", name: "Pupil", latinName: "Pupilla", layerId: "eye-pupil", description: "Opening for light" },
          { id: "lens", name: "Lens", latinName: "Lens crystallina", layerId: "eye-lens", description: "Focuses light on retina" },
          { id: "retina", name: "Retina", latinName: "Retina", layerId: "eye-retina", description: "Light-sensitive layer" },
          { id: "optic-nerve", name: "Optic Nerve", latinName: "Nervus opticus", layerId: "eye-optic-nerve", description: "Visual information to brain" },
          { id: "vitreous-humor", name: "Vitreous Humor", latinName: "Corpus vitreum", layerId: "eye-vitreous", description: "Gel filling eye" },
          { id: "sclera", name: "Sclera", latinName: "Sclera", layerId: "eye-sclera", description: "White of eye" },
        ],
      },
      {
        id: "ear",
        name: "Ear",
        structures: [
          { id: "external-ear", name: "External Ear (Auricle)", latinName: "Auricula", layerId: "ear-external", description: "Collects sound" },
          { id: "ear-canal", name: "External Auditory Canal", latinName: "Meatus acusticus externus", layerId: "ear-canal", description: "Sound passage" },
          { id: "tympanic-membrane", name: "Tympanic Membrane", latinName: "Membrana tympani", layerId: "ear-tympanic", description: "Eardrum" },
          { id: "ossicles", name: "Ossicles", latinName: "Ossicula auditus", layerId: "ear-ossicles", description: "Malleus, incus, stapes" },
          { id: "cochlea", name: "Cochlea", latinName: "Cochlea", layerId: "ear-cochlea", description: "Hearing organ" },
          { id: "semicircular-canals", name: "Semicircular Canals", latinName: "Canales semicirculares", layerId: "ear-semicircular", description: "Balance and equilibrium" },
          { id: "vestibulocochlear-nerve", name: "Vestibulocochlear Nerve", latinName: "Nervus vestibulocochlearis", layerId: "ear-cn8", description: "Hearing and balance signals" },
        ],
      },
      {
        id: "nose-olfaction",
        name: "Nose (Olfaction)",
        structures: [
          { id: "olfactory-epithelium", name: "Olfactory Epithelium", latinName: "Epithelium olfactorium", layerId: "nose-olfactory-epi", description: "Smell receptors" },
          { id: "olfactory-bulb", name: "Olfactory Bulb", latinName: "Bulbus olfactorius", layerId: "nose-olfactory-bulb", description: "First processing center" },
          { id: "olfactory-tract", name: "Olfactory Tract", latinName: "Tractus olfactorius", layerId: "nose-olfactory-tract", description: "Pathway to brain" },
        ],
      },
      {
        id: "tongue-taste",
        name: "Tongue (Taste)",
        structures: [
          { id: "fungiform-papillae", name: "Fungiform Papillae", latinName: "Papillae fungiformes", layerId: "tongue-fungiform", description: "Contain taste buds" },
          { id: "circumvallate-papillae", name: "Circumvallate Papillae", latinName: "Papillae vallatae", layerId: "tongue-circumvallate", description: "Large posterior papillae" },
          { id: "foliate-papillae", name: "Foliate Papillae", latinName: "Papillae foliatae", layerId: "tongue-foliate", description: "Lateral tongue" },
          { id: "taste-buds", name: "Taste Buds", latinName: "Caliculi gustatorii", layerId: "tongue-taste-buds", description: "Taste receptors" },
        ],
      },
    ],
  },
];

// Helper to find a structure by ID across all systems
export function findStructureById(id: string): { structure: AnatomyStructure; system: AnatomySystem; subsystem: AnatomySubsystem } | null {
  for (const system of COMPLETE_ANATOMY_HIERARCHY) {
    for (const subsystem of system.subsystems) {
      const structure = subsystem.structures.find(s => s.id === id);
      if (structure) {
        return { structure, system, subsystem };
      }
    }
  }
  return null;
}

// Get all layer IDs for a system
export function getSystemLayerIds(systemId: string): string[] {
  const system = COMPLETE_ANATOMY_HIERARCHY.find(s => s.id === systemId);
  if (!system) return [];
  
  const layerIds: string[] = [];
  for (const subsystem of system.subsystems) {
    for (const structure of subsystem.structures) {
      layerIds.push(structure.layerId);
    }
  }
  return layerIds;
}

// Get all structures as flat list
export function getAllStructures(): AnatomyStructure[] {
  const structures: AnatomyStructure[] = [];
  for (const system of COMPLETE_ANATOMY_HIERARCHY) {
    for (const subsystem of system.subsystems) {
      structures.push(...subsystem.structures);
    }
  }
  return structures;
}
