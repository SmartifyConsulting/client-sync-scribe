/**
 * Complete Anatomy Browser
 * Full 12-system hierarchical navigation with layer controls
 */

import React, { useState, useCallback } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  ChevronRight,
  ChevronDown,
  Search,
  Bone,
  Heart,
  Brain,
  Wind,
  Apple,
  Droplets,
  Baby,
  Zap,
  Shield,
  Layers,
  Eye as EyeIcon,
  Ear,
  Target,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  COMPLETE_ANATOMY_HIERARCHY, 
  AnatomySystem, 
  AnatomySubsystem, 
  AnatomyStructure,
  findStructureById,
} from "./AnatomyHierarchy";
import { LayerState } from "./LayerControls";


// System icons
const SYSTEM_ICONS: Record<string, React.ReactNode> = {
  skeletal: <Bone className="h-4 w-4" />,
  muscular: <Zap className="h-4 w-4" />,
  nervous: <Brain className="h-4 w-4" />,
  cardiovascular: <Heart className="h-4 w-4" />,
  respiratory: <Wind className="h-4 w-4" />,
  digestive: <Apple className="h-4 w-4" />,
  urinary: <Droplets className="h-4 w-4" />,
  reproductive: <Baby className="h-4 w-4" />,
  endocrine: <Zap className="h-4 w-4" />,
  lymphatic: <Shield className="h-4 w-4" />,
  integumentary: <Layers className="h-4 w-4" />,
  sensory: <EyeIcon className="h-4 w-4" />,
};

interface CompleteAnatomyBrowserProps {
  onStructureSelect: (structure: AnatomyStructure, system: AnatomySystem) => void;
  onSystemSelect: (system: AnatomySystem) => void;
  selectedStructureId: string | null;
  selectedSystemId: string | null;
  layerStates: Record<string, LayerState>;
  onLayerToggle: (layerId: string) => void;
  className?: string;
}

export function CompleteAnatomyBrowser({
  onStructureSelect,
  onSystemSelect,
  selectedStructureId,
  selectedSystemId,
  layerStates,
  onLayerToggle,
  className,
}: CompleteAnatomyBrowserProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedSystems, setExpandedSystems] = useState<string[]>([]);
  const [expandedSubsystems, setExpandedSubsystems] = useState<string[]>([]);

  const toggleSystem = (systemId: string) => {
    setExpandedSystems(prev =>
      prev.includes(systemId)
        ? prev.filter(id => id !== systemId)
        : [...prev, systemId]
    );
  };

  const toggleSubsystem = (subsystemId: string) => {
    setExpandedSubsystems(prev =>
      prev.includes(subsystemId)
        ? prev.filter(id => id !== subsystemId)
        : [...prev, subsystemId]
    );
  };

  // Filter structures by search query
  const getFilteredHierarchy = useCallback(() => {
    if (!searchQuery.trim()) return COMPLETE_ANATOMY_HIERARCHY;

    const query = searchQuery.toLowerCase();
    return COMPLETE_ANATOMY_HIERARCHY.map(system => ({
      ...system,
      subsystems: system.subsystems.map(subsystem => ({
        ...subsystem,
        structures: subsystem.structures.filter(structure =>
          structure.name.toLowerCase().includes(query) ||
          structure.latinName?.toLowerCase().includes(query) ||
          structure.description?.toLowerCase().includes(query)
        ),
      })).filter(subsystem => subsystem.structures.length > 0),
    })).filter(system => system.subsystems.length > 0);
  }, [searchQuery]);

  const filteredHierarchy = getFilteredHierarchy();

  // Count visible layers in a subsystem
  const getVisibleCount = (subsystem: AnatomySubsystem) => {
    return subsystem.structures.filter(s => layerStates[s.layerId]?.visible !== false).length;
  };

  return (
    <div className={cn("flex flex-col h-full bg-white", className)}>
      {/* Search */}
      <div className="p-3 border-b border-slate-200">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search anatomy..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-9 text-sm bg-slate-50 border-slate-200"
          />
          {searchQuery && (
            <button
              className="absolute right-2 top-2 p-0.5 hover:bg-slate-200 rounded"
              onClick={() => setSearchQuery("")}
            >
              <X className="h-4 w-4 text-slate-400" />
            </button>
          )}
        </div>
      </div>

      {/* System Navigation */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {filteredHierarchy.map((system) => {
            const isExpanded = expandedSystems.includes(system.id);
            const isSelected = selectedSystemId === system.id;
            const Icon = SYSTEM_ICONS[system.id] || <Target className="h-4 w-4" />;

            return (
              <div key={system.id} className="rounded-lg overflow-hidden">
                {/* System Header */}
                <div
                  className={cn(
                    "flex items-center gap-2 p-2 cursor-pointer transition-colors",
                    isSelected ? "bg-slate-100" : "hover:bg-slate-50"
                  )}
                  style={{ borderLeft: `3px solid ${system.color}` }}
                  onClick={() => {
                    toggleSystem(system.id);
                    onSystemSelect(system);
                  }}
                >
                  <div 
                    className="p-1 rounded"
                    style={{ backgroundColor: `${system.color}20` }}
                  >
                    {Icon}
                  </div>
                  <span className="flex-1 text-sm font-medium text-slate-800">
                    {system.name}
                  </span>
                  <Badge variant="outline" className="text-[10px] h-5">
                    {system.subsystems.reduce((acc, sub) => acc + sub.structures.length, 0)}
                  </Badge>
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-slate-400" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  )}
                </div>

                {/* Subsystems */}
                {isExpanded && (
                  <div className="pl-4 py-1 space-y-0.5">
                    {system.subsystems.map((subsystem) => {
                      const isSubExpanded = expandedSubsystems.includes(subsystem.id);
                      const visibleCount = getVisibleCount(subsystem);
                      const totalCount = subsystem.structures.length;

                      return (
                        <Collapsible
                          key={subsystem.id}
                          open={isSubExpanded}
                          onOpenChange={() => toggleSubsystem(subsystem.id)}
                        >
                          <CollapsibleTrigger className="w-full">
                            <div className="flex items-center gap-2 p-1.5 rounded hover:bg-slate-50 text-left">
                              {isSubExpanded ? (
                                <ChevronDown className="h-3 w-3 text-slate-400" />
                              ) : (
                                <ChevronRight className="h-3 w-3 text-slate-400" />
                              )}
                              <span className="flex-1 text-xs font-medium text-slate-700 truncate">
                                {subsystem.name}
                              </span>
                              <Badge 
                                variant="secondary" 
                                className={cn(
                                  "text-[9px] h-4 px-1.5",
                                  visibleCount === totalCount && "bg-green-100 text-green-700",
                                  visibleCount === 0 && "bg-slate-200 text-slate-500"
                                )}
                              >
                                {visibleCount}/{totalCount}
                              </Badge>
                            </div>
                          </CollapsibleTrigger>

                          <CollapsibleContent>
                            <div className="pl-5 py-1 space-y-0.5">
                              {subsystem.structures.map((structure) => {
                                const isStructureSelected = selectedStructureId === structure.id;
                                const layerState = layerStates[structure.layerId];
                                const isVisible = layerState?.visible !== false;

                                return (
                                  <div
                                    key={structure.id}
                                    className={cn(
                                      "flex items-center gap-2 p-1.5 rounded cursor-pointer transition-colors group",
                                      isStructureSelected 
                                        ? "bg-slate-100 ring-1 ring-slate-300" 
                                        : "hover:bg-slate-50",
                                      !isVisible && "opacity-50"
                                    )}
                                    onClick={() => onStructureSelect(structure, system)}
                                  >
                                    {/* Visibility indicator */}
                                    <button
                                      className={cn(
                                        "w-2 h-2 rounded-full border",
                                        isVisible 
                                          ? "bg-green-500 border-green-600" 
                                          : "bg-slate-300 border-slate-400"
                                      )}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onLayerToggle(structure.layerId);
                                      }}
                                    />

                                    {/* Structure info */}
                                    <div className="flex-1 min-w-0">
                                      <div className="text-xs text-slate-800 truncate">
                                        {structure.name}
                                      </div>
                                      {structure.latinName && (
                                        <div className="text-[10px] text-slate-500 italic truncate">
                                          {structure.latinName}
                                        </div>
                                      )}
                                    </div>

                                    {/* Highlight indicator */}
                                    {layerState?.highlightColor && (
                                      <div
                                        className="w-3 h-3 rounded-full border border-white shadow-sm"
                                        style={{ backgroundColor: layerState.highlightColor }}
                                      />
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* Quick Stats */}
      <div className="p-3 border-t border-slate-200 bg-slate-50">
        <div className="flex items-center justify-between text-xs text-slate-600">
          <span>12 Systems</span>
          <span>•</span>
          <span>
            {COMPLETE_ANATOMY_HIERARCHY.reduce(
              (acc, sys) => acc + sys.subsystems.reduce((a, sub) => a + sub.structures.length, 0),
              0
            )} Structures
          </span>
        </div>
      </div>
    </div>
  );
}

// Structure Metadata Panel - shows details when a structure is selected
interface StructureDetailPanelProps {
  structure: AnatomyStructure | null;
  system: AnatomySystem | null;
  onClose: () => void;
}

export function StructureDetailPanel({ structure, system, onClose }: StructureDetailPanelProps) {
  if (!structure || !system) return null;

  return (
    <div className="p-4 bg-white border-t border-slate-200">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-slate-800">{structure.name}</h3>
          {structure.latinName && (
            <p className="text-sm text-slate-500 italic">{structure.latinName}</p>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-slate-100 rounded"
        >
          <X className="h-4 w-4 text-slate-400" />
        </button>
      </div>

      {structure.description && (
        <p className="text-sm text-slate-600 mb-3">{structure.description}</p>
      )}

      <div className="space-y-2 text-xs">
        {structure.innervation && (
          <div className="flex gap-2">
            <span className="font-medium text-slate-700">Innervation:</span>
            <span className="text-slate-600">{structure.innervation}</span>
          </div>
        )}
        {structure.bloodSupply && (
          <div className="flex gap-2">
            <span className="font-medium text-slate-700">Blood Supply:</span>
            <span className="text-slate-600">{structure.bloodSupply}</span>
          </div>
        )}
        {structure.clinicalNotes && (
          <div className="mt-2 p-2 bg-amber-50 rounded border border-amber-200">
            <span className="font-medium text-amber-800">Clinical Notes:</span>
            <p className="text-amber-700 mt-1">{structure.clinicalNotes}</p>
          </div>
        )}
      </div>

      <div className="mt-3 pt-3 border-t border-slate-100">
        <Badge 
          className="text-[10px]"
          style={{ backgroundColor: `${system.color}20`, color: system.color }}
        >
          {system.name}
        </Badge>
      </div>
    </div>
  );
}

// Re-export types for convenience
export type { AnatomyStructure, AnatomySystem, AnatomySubsystem };
export { COMPLETE_ANATOMY_HIERARCHY, findStructureById };
