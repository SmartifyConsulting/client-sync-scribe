/**
 * Integrated Medical Anatomy Viewer
 * Clinical-grade anatomy visualization with layer controls and structure selection
 */

import React, { useState, useCallback, useMemo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Eye,
  EyeOff,
  ChevronRight,
  ChevronDown,
  Search,
  Palette,
  RotateCcw,
  Layers,
  Info,
  Bone,
  Heart,
  Brain,
  Activity,
  Wind,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Import SVG systems
import { 
  SkeletalSystemSVG, 
  MuscularSystemSVG, 
  CardiovascularSystemSVG,
  LayerState,
  ANATOMY_COLORS
} from "./svg";

// Import hierarchy for structure data
import { 
  COMPLETE_ANATOMY_HIERARCHY, 
  findStructureById, 
  AnatomySystem, 
  AnatomyStructure 
} from "./AnatomyHierarchy";

// Clinical highlight presets
const HIGHLIGHT_PRESETS = [
  { name: "Normal", color: "#90EE90", description: "Normal finding" },
  { name: "Pathology", color: "#FF0000", description: "Abnormal finding" },
  { name: "Inflammation", color: "#FF6347", description: "Inflammatory process" },
  { name: "Ischemia", color: "#9370DB", description: "Reduced blood flow" },
  { name: "Edema", color: "#87CEFA", description: "Swelling/fluid" },
  { name: "Attention", color: "#FFD700", description: "Area of concern" },
  { name: "Fracture", color: "#FF4500", description: "Bone fracture" },
  { name: "Lesion", color: "#DC143C", description: "Tissue lesion" },
];

// System icons
const SYSTEM_ICONS: Record<string, React.ReactNode> = {
  skeletal: <Bone className="h-4 w-4" />,
  muscular: <Activity className="h-4 w-4" />,
  nervous: <Brain className="h-4 w-4" />,
  cardiovascular: <Heart className="h-4 w-4" />,
  respiratory: <Wind className="h-4 w-4" />,
};

interface MedicalAnatomyViewerProps {
  onStructureSelect?: (structure: AnatomyStructure | null) => void;
  onLayerStateChange?: (layerStates: Record<string, LayerState>) => void;
  initialLayerStates?: Record<string, LayerState>;
  className?: string;
}

export function MedicalAnatomyViewer({
  onStructureSelect,
  onLayerStateChange,
  initialLayerStates = {},
  className,
}: MedicalAnatomyViewerProps) {
  // Current system and view
  const [activeSystem, setActiveSystem] = useState<string>("skeletal");
  const [viewType, setViewType] = useState<"anterior" | "posterior" | "lateral">("anterior");
  const [showLabels, setShowLabels] = useState(true);
  
  // Layer states
  const [layerStates, setLayerStates] = useState<Record<string, LayerState>>(initialLayerStates);
  
  // UI state
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedSystems, setExpandedSystems] = useState<string[]>(["skeletal"]);
  const [expandedSubsystems, setExpandedSubsystems] = useState<string[]>([]);
  const [selectedStructure, setSelectedStructure] = useState<AnatomyStructure | null>(null);
  const [highlightColor, setHighlightColor] = useState("#DC143C");
  
  // Initialize layer state for a structure
  const getLayerState = useCallback((layerId: string): LayerState => {
    return layerStates[layerId] || { visible: true, opacity: 1 };
  }, [layerStates]);
  
  // Update layer visibility
  const toggleLayerVisibility = useCallback((layerId: string) => {
    setLayerStates(prev => {
      const current = prev[layerId] || { visible: true, opacity: 1 };
      const newStates = {
        ...prev,
        [layerId]: { ...current, visible: !current.visible }
      };
      onLayerStateChange?.(newStates);
      return newStates;
    });
  }, [onLayerStateChange]);
  
  // Update layer opacity
  const setLayerOpacity = useCallback((layerId: string, opacity: number) => {
    setLayerStates(prev => {
      const current = prev[layerId] || { visible: true, opacity: 1 };
      const newStates = {
        ...prev,
        [layerId]: { ...current, opacity }
      };
      onLayerStateChange?.(newStates);
      return newStates;
    });
  }, [onLayerStateChange]);
  
  // Highlight a layer
  const highlightLayer = useCallback((layerId: string, color: string | undefined) => {
    setLayerStates(prev => {
      const current = prev[layerId] || { visible: true, opacity: 1 };
      const newStates = {
        ...prev,
        [layerId]: { ...current, highlightColor: color }
      };
      onLayerStateChange?.(newStates);
      return newStates;
    });
  }, [onLayerStateChange]);
  
  // Handle structure click from SVG
  const handleLayerClick = useCallback((layerId: string) => {
    const result = findStructureById(layerId);
    const structure = result?.structure || null;
    setSelectedStructure(structure);
    onStructureSelect?.(structure);
    
    // Auto-highlight clicked structure
    if (structure) {
      highlightLayer(layerId, highlightColor);
    }
  }, [highlightColor, highlightLayer, onStructureSelect]);
  
  // Clear all highlights
  const clearAllHighlights = useCallback(() => {
    setLayerStates(prev => {
      const newStates = { ...prev };
      Object.keys(newStates).forEach(key => {
        if (newStates[key].highlightColor) {
          newStates[key] = { ...newStates[key], highlightColor: undefined };
        }
      });
      onLayerStateChange?.(newStates);
      return newStates;
    });
    setSelectedStructure(null);
  }, [onLayerStateChange]);
  
  // Reset all layer states
  const resetAllLayers = useCallback(() => {
    setLayerStates({});
    onLayerStateChange?.({});
    setSelectedStructure(null);
  }, [onLayerStateChange]);
  
  // Toggle system expansion
  const toggleSystemExpansion = (systemId: string) => {
    setExpandedSystems(prev =>
      prev.includes(systemId)
        ? prev.filter(id => id !== systemId)
        : [...prev, systemId]
    );
  };
  
  // Toggle subsystem expansion
  const toggleSubsystemExpansion = (subsystemId: string) => {
    setExpandedSubsystems(prev =>
      prev.includes(subsystemId)
        ? prev.filter(id => id !== subsystemId)
        : [...prev, subsystemId]
    );
  };
  
  // Filter structures by search
  const filteredSystems = useMemo(() => {
    if (!searchQuery) return COMPLETE_ANATOMY_HIERARCHY;
    
    const query = searchQuery.toLowerCase();
    return COMPLETE_ANATOMY_HIERARCHY.map(system => ({
      ...system,
      subsystems: system.subsystems.map(sub => ({
        ...sub,
        structures: sub.structures.filter(s =>
          s.name.toLowerCase().includes(query) ||
          s.latinName?.toLowerCase().includes(query) ||
          s.description?.toLowerCase().includes(query)
        )
      })).filter(sub => sub.structures.length > 0)
    })).filter(sys => sys.subsystems.length > 0);
  }, [searchQuery]);
  
  // Render the active system SVG
  const renderSystemSVG = () => {
    const props = {
      viewType,
      layerStates,
      onLayerClick: handleLayerClick,
      showLabels,
    };
    
    switch (activeSystem) {
      case "skeletal":
        return <SkeletalSystemSVG {...props} />;
      case "muscular":
        return <MuscularSystemSVG {...props} />;
      case "cardiovascular":
        return <CardiovascularSystemSVG {...props} viewType="anterior" />;
      default:
        return <SkeletalSystemSVG {...props} />;
    }
  };
  
  return (
    <div className={cn("flex h-full", className)}>
      {/* Left Panel - Structure Browser */}
      <div className="w-72 border-r border-border bg-background flex flex-col">
        {/* Search */}
        <div className="p-3 border-b border-border">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search structures..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-9"
            />
          </div>
        </div>
        
        {/* System Tabs */}
        <div className="p-2 border-b border-border">
          <div className="flex flex-wrap gap-1">
            {["skeletal", "muscular", "cardiovascular"].map(sys => (
              <Button
                key={sys}
                size="sm"
                variant={activeSystem === sys ? "default" : "outline"}
                onClick={() => setActiveSystem(sys)}
                className="h-7 px-2 text-xs"
              >
                {SYSTEM_ICONS[sys]}
                <span className="ml-1 capitalize">{sys.slice(0, 4)}</span>
              </Button>
            ))}
          </div>
        </div>
        
        {/* Structure List */}
        <ScrollArea className="flex-1">
          <div className="p-2">
            {filteredSystems.map(system => (
              <Collapsible
                key={system.id}
                open={expandedSystems.includes(system.id)}
                onOpenChange={() => toggleSystemExpansion(system.id)}
              >
                <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 rounded-md hover:bg-muted/50 transition-colors">
                  {expandedSystems.includes(system.id) ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: system.color }}
                  />
                  <span className="text-sm font-medium">{system.name}</span>
                </CollapsibleTrigger>
                
                <CollapsibleContent>
                  <div className="ml-4 space-y-1">
                    {system.subsystems.map(subsystem => (
                      <Collapsible
                        key={subsystem.id}
                        open={expandedSubsystems.includes(subsystem.id)}
                        onOpenChange={() => toggleSubsystemExpansion(subsystem.id)}
                      >
                        <CollapsibleTrigger className="flex items-center gap-2 w-full p-1.5 rounded hover:bg-muted/30 transition-colors text-left">
                          {expandedSubsystems.includes(subsystem.id) ? (
                            <ChevronDown className="h-3 w-3" />
                          ) : (
                            <ChevronRight className="h-3 w-3" />
                          )}
                          <span className="text-xs font-medium">{subsystem.name}</span>
                          <Badge variant="secondary" className="ml-auto text-[10px] h-4 px-1">
                            {subsystem.structures.length}
                          </Badge>
                        </CollapsibleTrigger>
                        
                        <CollapsibleContent>
                          <div className="ml-4 space-y-0.5">
                            {subsystem.structures.map(structure => {
                              const state = getLayerState(structure.layerId);
                              const isSelected = selectedStructure?.id === structure.id;
                              
                              return (
                                <div
                                  key={structure.id}
                                  className={cn(
                                    "flex items-center gap-2 p-1.5 rounded text-xs cursor-pointer transition-colors",
                                    isSelected ? "bg-primary/10 text-primary" : "hover:bg-muted/30"
                                  )}
                                  onClick={() => handleLayerClick(structure.layerId)}
                                >
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleLayerVisibility(structure.layerId);
                                    }}
                                    className="p-0.5 hover:bg-muted rounded"
                                  >
                                    {state.visible ? (
                                      <Eye className="h-3 w-3" />
                                    ) : (
                                      <EyeOff className="h-3 w-3 text-muted-foreground" />
                                    )}
                                  </button>
                                  
                                  <span className={cn("flex-1 truncate", !state.visible && "text-muted-foreground")}>
                                    {structure.name}
                                  </span>
                                  
                                  {state.highlightColor && (
                                    <div
                                      className="w-2 h-2 rounded-full"
                                      style={{ backgroundColor: state.highlightColor }}
                                    />
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>
        </ScrollArea>
      </div>
      
      {/* Center - SVG Viewport */}
      <div className="flex-1 flex flex-col bg-muted/20">
        {/* Toolbar */}
        <div className="flex items-center gap-2 p-2 border-b border-border bg-background">
          {/* View Type */}
          <div className="flex items-center gap-1 bg-muted rounded-md p-0.5">
            {(["anterior", "posterior", "lateral"] as const).map(view => (
              <Button
                key={view}
                size="sm"
                variant={viewType === view ? "default" : "ghost"}
                onClick={() => setViewType(view)}
                className="h-6 px-2 text-xs capitalize"
              >
                {view}
              </Button>
            ))}
          </div>
          
          <div className="h-4 w-px bg-border" />
          
          {/* Labels Toggle */}
          <div className="flex items-center gap-2">
            <Switch
              id="show-labels"
              checked={showLabels}
              onCheckedChange={setShowLabels}
              className="scale-75"
            />
            <Label htmlFor="show-labels" className="text-xs">Labels</Label>
          </div>
          
          <div className="h-4 w-px bg-border" />
          
          {/* Actions */}
          <Button
            size="sm"
            variant="ghost"
            onClick={clearAllHighlights}
            className="h-6 px-2 text-xs"
          >
            Clear Highlights
          </Button>
          
          <Button
            size="sm"
            variant="ghost"
            onClick={resetAllLayers}
            className="h-6 px-2 text-xs"
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            Reset
          </Button>
        </div>
        
        {/* SVG Container */}
        <div className="flex-1 overflow-auto p-4">
          <div className="w-full h-full min-h-[600px] flex items-center justify-center">
            {renderSystemSVG()}
          </div>
        </div>
      </div>
      
      {/* Right Panel - Structure Details & Highlight Controls */}
      <div className="w-64 border-l border-border bg-background flex flex-col">
        {/* Highlight Presets */}
        <div className="p-3 border-b border-border">
          <div className="flex items-center gap-2 mb-2">
            <Palette className="h-4 w-4" />
            <span className="text-sm font-medium">Clinical Highlights</span>
          </div>
          <div className="grid grid-cols-4 gap-1">
            {HIGHLIGHT_PRESETS.map(preset => (
              <button
                key={preset.name}
                onClick={() => setHighlightColor(preset.color)}
                className={cn(
                  "w-6 h-6 rounded-md border-2 transition-all",
                  highlightColor === preset.color ? "border-foreground scale-110" : "border-transparent"
                )}
                style={{ backgroundColor: preset.color }}
                title={`${preset.name}: ${preset.description}`}
              />
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Click a structure to apply highlight
          </p>
        </div>
        
        {/* Selected Structure Details */}
        <ScrollArea className="flex-1">
          <div className="p-3">
            {selectedStructure ? (
              <div className="space-y-3">
                <div>
                  <h3 className="font-semibold text-sm">{selectedStructure.name}</h3>
                  {selectedStructure.latinName && (
                    <p className="text-xs text-muted-foreground italic">{selectedStructure.latinName}</p>
                  )}
                </div>
                
                {selectedStructure.description && (
                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground mb-1">Description</h4>
                    <p className="text-xs">{selectedStructure.description}</p>
                  </div>
                )}
                
                {selectedStructure.innervation && (
                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground mb-1">Innervation</h4>
                    <p className="text-xs">{selectedStructure.innervation}</p>
                  </div>
                )}
                
                {selectedStructure.bloodSupply && (
                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground mb-1">Blood Supply</h4>
                    <p className="text-xs">{selectedStructure.bloodSupply}</p>
                  </div>
                )}
                
                {selectedStructure.clinicalNotes && (
                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground mb-1">Clinical Notes</h4>
                    <p className="text-xs">{selectedStructure.clinicalNotes}</p>
                  </div>
                )}
                
                {/* Layer Controls */}
                <div className="pt-2 border-t border-border">
                  <h4 className="text-xs font-medium mb-2">Layer Controls</h4>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Visibility</Label>
                      <Switch
                        checked={getLayerState(selectedStructure.layerId).visible}
                        onCheckedChange={() => toggleLayerVisibility(selectedStructure.layerId)}
                        className="scale-75"
                      />
                    </div>
                    
                    <div>
                      <Label className="text-xs">Opacity</Label>
                      <Slider
                        value={[getLayerState(selectedStructure.layerId).opacity * 100]}
                        onValueChange={([val]) => setLayerOpacity(selectedStructure.layerId, val / 100)}
                        max={100}
                        step={5}
                        className="mt-1"
                      />
                    </div>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => highlightLayer(selectedStructure.layerId, undefined)}
                      className="w-full h-7 text-xs"
                    >
                      Remove Highlight
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Info className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Select a structure</p>
                <p className="text-xs mt-1">Click on anatomy to view details</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}

export default MedicalAnatomyViewer;
