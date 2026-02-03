import React from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Stethoscope,
  Heart,
  Brain,
  Bone,
  Activity,
  Eye,
  Ear,
  Wind,
  Baby,
  Syringe,
  Scissors,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CanvasElement } from "@/hooks/useSessionDrawings";
import { professionalAnatomyAssets, AnatomyLayer } from "./MedicalAnatomyAssets";

export interface DrawingTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: React.ReactNode;
  tags: string[];
  elements: CanvasElement[];
  defaultLayers: AnatomyLayer[];
}

// Pre-configured anatomy layouts for common clinical scenarios
export const DRAWING_TEMPLATES: DrawingTemplate[] = [
  {
    id: "general-exam",
    name: "General Physical Exam",
    description: "Full body anterior view for comprehensive physical examination",
    category: "General",
    icon: <Stethoscope className="h-4 w-4" />,
    tags: ["routine", "checkup", "physical"],
    defaultLayers: ["skin", "muscular", "skeletal", "labels"],
    elements: [
      {
        id: "template-body-1",
        type: "anatomy",
        data: { 
          assetId: "body-anterior",
          visibleLayers: ["skin", "muscular", "skeletal", "labels"],
          rotation: 0,
        },
        x: 100,
        y: 50,
        width: 400,
        height: 600,
      },
    ],
  },
  {
    id: "cardio-assessment",
    name: "Cardiovascular Assessment",
    description: "Heart and circulatory system for cardiac evaluations",
    category: "Cardiology",
    icon: <Heart className="h-4 w-4" />,
    tags: ["heart", "cardiac", "circulation", "blood pressure"],
    defaultLayers: ["vascular", "labels"],
    elements: [
      {
        id: "template-heart-1",
        type: "anatomy",
        data: { 
          assetId: "heart",
          visibleLayers: ["vascular", "organs", "labels"],
          rotation: 0,
        },
        x: 150,
        y: 100,
        width: 350,
        height: 400,
      },
      {
        id: "template-chest-1",
        type: "anatomy",
        data: { 
          assetId: "thorax-anterior",
          visibleLayers: ["vascular", "skeletal", "labels"],
          rotation: 0,
        },
        x: 550,
        y: 100,
        width: 300,
        height: 350,
      },
    ],
  },
  {
    id: "neuro-assessment",
    name: "Neurological Assessment",
    description: "Brain and nervous system for neurological evaluations",
    category: "Neurology",
    icon: <Brain className="h-4 w-4" />,
    tags: ["brain", "nerves", "cranial", "spinal"],
    defaultLayers: ["nervous", "labels"],
    elements: [
      {
        id: "template-brain-1",
        type: "anatomy",
        data: { 
          assetId: "brain-lateral",
          visibleLayers: ["nervous", "labels"],
          rotation: 0,
        },
        x: 100,
        y: 100,
        width: 350,
        height: 300,
      },
      {
        id: "template-spine-1",
        type: "anatomy",
        data: { 
          assetId: "spine-lateral",
          visibleLayers: ["nervous", "skeletal", "labels"],
          rotation: 0,
        },
        x: 500,
        y: 50,
        width: 200,
        height: 500,
      },
    ],
  },
  {
    id: "orthopedic-upper",
    name: "Upper Extremity Ortho",
    description: "Shoulder, arm, and hand for orthopedic consultations",
    category: "Orthopedics",
    icon: <Bone className="h-4 w-4" />,
    tags: ["shoulder", "arm", "hand", "fracture", "joint"],
    defaultLayers: ["skeletal", "muscular", "labels"],
    elements: [
      {
        id: "template-arm-1",
        type: "anatomy",
        data: { 
          assetId: "arm-anterior",
          visibleLayers: ["skeletal", "muscular", "labels"],
          rotation: 0,
        },
        x: 100,
        y: 100,
        width: 250,
        height: 450,
      },
      {
        id: "template-hand-1",
        type: "anatomy",
        data: { 
          assetId: "hand-palmar",
          visibleLayers: ["skeletal", "labels"],
          rotation: 0,
        },
        x: 400,
        y: 150,
        width: 250,
        height: 300,
      },
    ],
  },
  {
    id: "orthopedic-lower",
    name: "Lower Extremity Ortho",
    description: "Hip, leg, and foot for orthopedic consultations",
    category: "Orthopedics",
    icon: <Bone className="h-4 w-4" />,
    tags: ["hip", "leg", "foot", "knee", "fracture"],
    defaultLayers: ["skeletal", "muscular", "labels"],
    elements: [
      {
        id: "template-leg-1",
        type: "anatomy",
        data: { 
          assetId: "leg-anterior",
          visibleLayers: ["skeletal", "muscular", "labels"],
          rotation: 0,
        },
        x: 100,
        y: 50,
        width: 200,
        height: 550,
      },
      {
        id: "template-foot-1",
        type: "anatomy",
        data: { 
          assetId: "foot-lateral",
          visibleLayers: ["skeletal", "labels"],
          rotation: 0,
        },
        x: 350,
        y: 300,
        width: 300,
        height: 200,
      },
    ],
  },
  {
    id: "respiratory-assessment",
    name: "Respiratory Assessment",
    description: "Lungs and airways for pulmonary evaluations",
    category: "Pulmonology",
    icon: <Wind className="h-4 w-4" />,
    tags: ["lungs", "breathing", "asthma", "copd"],
    defaultLayers: ["organs", "skeletal", "labels"],
    elements: [
      {
        id: "template-lungs-1",
        type: "anatomy",
        data: { 
          assetId: "lungs-anterior",
          visibleLayers: ["organs", "labels"],
          rotation: 0,
        },
        x: 150,
        y: 100,
        width: 350,
        height: 400,
      },
    ],
  },
  {
    id: "abdominal-exam",
    name: "Abdominal Examination",
    description: "Digestive organs for GI consultations",
    category: "Gastroenterology",
    icon: <Activity className="h-4 w-4" />,
    tags: ["stomach", "intestine", "liver", "digestion"],
    defaultLayers: ["organs", "labels"],
    elements: [
      {
        id: "template-abdomen-1",
        type: "anatomy",
        data: { 
          assetId: "abdomen-anterior",
          visibleLayers: ["organs", "labels"],
          rotation: 0,
        },
        x: 150,
        y: 100,
        width: 400,
        height: 450,
      },
    ],
  },
  {
    id: "eye-exam",
    name: "Ophthalmology Exam",
    description: "Eye anatomy for vision and ocular evaluations",
    category: "Ophthalmology",
    icon: <Eye className="h-4 w-4" />,
    tags: ["eye", "vision", "retina", "cornea"],
    defaultLayers: ["organs", "nervous", "labels"],
    elements: [
      {
        id: "template-eye-1",
        type: "anatomy",
        data: { 
          assetId: "eye-anterior",
          visibleLayers: ["organs", "nervous", "labels"],
          rotation: 0,
        },
        x: 100,
        y: 150,
        width: 300,
        height: 300,
      },
      {
        id: "template-eye-2",
        type: "anatomy",
        data: { 
          assetId: "eye-lateral",
          visibleLayers: ["organs", "nervous", "labels"],
          rotation: 0,
        },
        x: 450,
        y: 150,
        width: 300,
        height: 300,
      },
    ],
  },
  {
    id: "ent-exam",
    name: "ENT Examination",
    description: "Ear, nose, and throat anatomy for otolaryngology",
    category: "ENT",
    icon: <Ear className="h-4 w-4" />,
    tags: ["ear", "nose", "throat", "sinus", "hearing"],
    defaultLayers: ["organs", "skeletal", "labels"],
    elements: [
      {
        id: "template-head-1",
        type: "anatomy",
        data: { 
          assetId: "head-lateral",
          visibleLayers: ["organs", "skeletal", "labels"],
          rotation: 0,
        },
        x: 150,
        y: 100,
        width: 400,
        height: 400,
      },
    ],
  },
  {
    id: "pediatric-growth",
    name: "Pediatric Growth Chart",
    description: "Child body overview for growth assessments",
    category: "Pediatrics",
    icon: <Baby className="h-4 w-4" />,
    tags: ["child", "growth", "development", "pediatric"],
    defaultLayers: ["skin", "skeletal", "labels"],
    elements: [
      {
        id: "template-child-1",
        type: "anatomy",
        data: { 
          assetId: "body-anterior",
          visibleLayers: ["skin", "skeletal", "labels"],
          rotation: 0,
        },
        x: 200,
        y: 80,
        width: 300,
        height: 450,
      },
    ],
  },
  {
    id: "injection-sites",
    name: "Injection Site Reference",
    description: "Common injection and IV sites for procedures",
    category: "Procedures",
    icon: <Syringe className="h-4 w-4" />,
    tags: ["injection", "IV", "vaccine", "procedure"],
    defaultLayers: ["skin", "muscular", "labels"],
    elements: [
      {
        id: "template-deltoid-1",
        type: "anatomy",
        data: { 
          assetId: "arm-anterior",
          visibleLayers: ["skin", "muscular", "labels"],
          rotation: 0,
        },
        x: 50,
        y: 100,
        width: 200,
        height: 350,
      },
      {
        id: "template-thigh-1",
        type: "anatomy",
        data: { 
          assetId: "leg-anterior",
          visibleLayers: ["skin", "muscular", "labels"],
          rotation: 0,
        },
        x: 280,
        y: 50,
        width: 180,
        height: 450,
      },
      {
        id: "template-gluteal-1",
        type: "anatomy",
        data: { 
          assetId: "pelvis-posterior",
          visibleLayers: ["skin", "muscular", "labels"],
          rotation: 0,
        },
        x: 500,
        y: 150,
        width: 250,
        height: 280,
      },
    ],
  },
  {
    id: "surgical-planning",
    name: "Surgical Planning",
    description: "Anatomical reference for surgical procedure planning",
    category: "Surgery",
    icon: <Scissors className="h-4 w-4" />,
    tags: ["surgery", "incision", "procedure", "planning"],
    defaultLayers: ["skin", "muscular", "skeletal", "labels"],
    elements: [
      {
        id: "template-torso-1",
        type: "anatomy",
        data: { 
          assetId: "thorax-anterior",
          visibleLayers: ["skin", "muscular", "skeletal", "labels"],
          rotation: 0,
        },
        x: 100,
        y: 50,
        width: 350,
        height: 400,
      },
      {
        id: "template-abdomen-surgical-1",
        type: "anatomy",
        data: { 
          assetId: "abdomen-anterior",
          visibleLayers: ["skin", "muscular", "organs", "labels"],
          rotation: 0,
        },
        x: 500,
        y: 50,
        width: 350,
        height: 400,
      },
    ],
  },
  {
    id: "dermatology-exam",
    name: "Dermatology Mapping",
    description: "Body surface for skin condition documentation",
    category: "Dermatology",
    icon: <Activity className="h-4 w-4" />,
    tags: ["skin", "rash", "lesion", "dermatology"],
    defaultLayers: ["skin", "labels"],
    elements: [
      {
        id: "template-body-derm-1",
        type: "anatomy",
        data: { 
          assetId: "body-anterior",
          visibleLayers: ["skin", "labels"],
          rotation: 0,
        },
        x: 50,
        y: 30,
        width: 350,
        height: 550,
      },
      {
        id: "template-body-derm-2",
        type: "anatomy",
        data: { 
          assetId: "body-posterior",
          visibleLayers: ["skin", "labels"],
          rotation: 0,
        },
        x: 450,
        y: 30,
        width: 350,
        height: 550,
      },
    ],
  },
];

// Group templates by category
export const TEMPLATE_CATEGORIES = Array.from(
  new Set(DRAWING_TEMPLATES.map(t => t.category))
);

interface DrawingTemplatesProps {
  onSelectTemplate: (template: DrawingTemplate) => void;
  searchQuery?: string;
}

export function DrawingTemplates({ onSelectTemplate, searchQuery = "" }: DrawingTemplatesProps) {
  const filteredTemplates = DRAWING_TEMPLATES.filter(template => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      template.name.toLowerCase().includes(query) ||
      template.description.toLowerCase().includes(query) ||
      template.category.toLowerCase().includes(query) ||
      template.tags.some(tag => tag.toLowerCase().includes(query))
    );
  });

  const templatesByCategory = TEMPLATE_CATEGORIES.reduce((acc, category) => {
    const templates = filteredTemplates.filter(t => t.category === category);
    if (templates.length > 0) {
      acc[category] = templates;
    }
    return acc;
  }, {} as Record<string, DrawingTemplate[]>);

  return (
    <ScrollArea className="h-full">
      <div className="p-2 space-y-4">
        {Object.entries(templatesByCategory).map(([category, templates]) => (
          <div key={category}>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-2 mb-2">
              {category}
            </h4>
            <div className="space-y-1">
              {templates.map((template) => (
                <Button
                  key={template.id}
                  variant="ghost"
                  className="w-full justify-start h-auto py-2 px-2 hover:bg-primary/5"
                  onClick={() => onSelectTemplate(template)}
                >
                  <div className="flex items-start gap-2 w-full">
                    <div className="p-1.5 rounded bg-primary/10 text-primary shrink-0 mt-0.5">
                      {template.icon}
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <p className="text-sm font-medium truncate">{template.name}</p>
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {template.description}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {template.tags.slice(0, 3).map(tag => (
                          <Badge 
                            key={tag} 
                            variant="secondary" 
                            className="text-[10px] px-1 py-0 h-4"
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          </div>
        ))}

        {Object.keys(templatesByCategory).length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">No templates found</p>
            <p className="text-xs mt-1">Try a different search term</p>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
