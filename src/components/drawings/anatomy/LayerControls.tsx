/**
 * Layer Controls Component
 * Individual layer visibility, opacity, and highlight controls
 */

import React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  Eye, 
  EyeOff, 
  Palette, 
  ChevronRight, 
  ChevronDown,
  Layers,
  Target,
  Droplets,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AnatomyStructure, AnatomySystem, AnatomySubsystem } from "./AnatomyHierarchy";

export interface LayerState {
  layerId: string;
  visible: boolean;
  opacity: number;
  highlightColor: string | null;
  selected: boolean;
}

interface LayerControlsProps {
  system: AnatomySystem;
  layerStates: Record<string, LayerState>;
  onLayerToggle: (layerId: string) => void;
  onLayerOpacity: (layerId: string, opacity: number) => void;
  onLayerHighlight: (layerId: string, color: string | null) => void;
  onLayerSelect: (layerId: string) => void;
  onSelectAll: (subsystemId: string) => void;
  onHideAll: (subsystemId: string) => void;
  onShowAll: (subsystemId: string) => void;
  selectedLayerId: string | null;
  className?: string;
}

const HIGHLIGHT_COLORS = [
  "#DC143C", // Crimson - pathology
  "#FF8C00", // Dark Orange - inflammation
  "#FFD700", // Gold - area of interest
  "#32CD32", // Lime Green - healthy
  "#1E90FF", // Dodger Blue - structural
  "#9932CC", // Dark Orchid - nerve/vascular
  "#FF69B4", // Hot Pink - soft tissue
  "#00CED1", // Dark Turquoise - cartilage
];

export function LayerControls({
  system,
  layerStates,
  onLayerToggle,
  onLayerOpacity,
  onLayerHighlight,
  onLayerSelect,
  onSelectAll,
  onHideAll,
  onShowAll,
  selectedLayerId,
  className,
}: LayerControlsProps) {
  const [expandedSubsystems, setExpandedSubsystems] = React.useState<string[]>([]);

  const toggleSubsystem = (subsystemId: string) => {
    setExpandedSubsystems(prev =>
      prev.includes(subsystemId)
        ? prev.filter(id => id !== subsystemId)
        : [...prev, subsystemId]
    );
  };

  const getVisibleCount = (subsystem: AnatomySubsystem) => {
    return subsystem.structures.filter(s => layerStates[s.layerId]?.visible).length;
  };

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* System Header */}
      <div 
        className="flex items-center gap-2 p-3 border-b border-slate-200"
        style={{ backgroundColor: `${system.color}15` }}
      >
        <div 
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: system.color }}
        />
        <span className="text-sm font-semibold text-slate-800">{system.name}</span>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {system.subsystems.map((subsystem) => {
            const isExpanded = expandedSubsystems.includes(subsystem.id);
            const visibleCount = getVisibleCount(subsystem);
            const totalCount = subsystem.structures.length;

            return (
              <Collapsible 
                key={subsystem.id} 
                open={isExpanded}
                onOpenChange={() => toggleSubsystem(subsystem.id)}
              >
                <div className="rounded-lg border border-slate-200 bg-white">
                  {/* Subsystem Header */}
                  <CollapsibleTrigger className="w-full">
                    <div className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-t-lg">
                      <div className="flex items-center gap-2">
                        {isExpanded ? (
                          <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5 text-slate-500" />
                        )}
                        <span className="text-xs font-medium text-slate-700">
                          {subsystem.name}
                        </span>
                      </div>
                      <Badge variant="secondary" className="text-[10px] h-5">
                        {visibleCount}/{totalCount}
                      </Badge>
                    </div>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    {/* Subsystem Actions */}
                    <div className="flex items-center gap-1 px-2 pb-1 border-b border-slate-100">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-[10px] px-2"
                        onClick={() => onShowAll(subsystem.id)}
                      >
                        Show All
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-[10px] px-2"
                        onClick={() => onHideAll(subsystem.id)}
                      >
                        Hide All
                      </Button>
                    </div>

                    {/* Structure List */}
                    <div className="p-1 space-y-0.5">
                      {subsystem.structures.map((structure) => {
                        const state = layerStates[structure.layerId] || {
                          visible: true,
                          opacity: 1,
                          highlightColor: null,
                          selected: false,
                        };
                        const isSelected = selectedLayerId === structure.layerId;

                        return (
                          <div
                            key={structure.id}
                            className={cn(
                              "flex items-center gap-2 p-1.5 rounded text-xs",
                              "hover:bg-slate-50 cursor-pointer transition-colors",
                              isSelected && "bg-slate-100 ring-1 ring-slate-300"
                            )}
                            onClick={() => onLayerSelect(structure.layerId)}
                          >
                            {/* Visibility Toggle */}
                            <button
                              className="p-0.5 hover:bg-slate-200 rounded"
                              onClick={(e) => {
                                e.stopPropagation();
                                onLayerToggle(structure.layerId);
                              }}
                            >
                              {state.visible ? (
                                <Eye className="h-3 w-3 text-slate-600" />
                              ) : (
                                <EyeOff className="h-3 w-3 text-slate-400" />
                              )}
                            </button>

                            {/* Structure Name */}
                            <span 
                              className={cn(
                                "flex-1 truncate",
                                !state.visible && "text-slate-400"
                              )}
                            >
                              {structure.name}
                            </span>

                            {/* Highlight Indicator */}
                            {state.highlightColor && (
                              <div
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: state.highlightColor }}
                              />
                            )}

                            {/* Highlight Color Picker */}
                            <Popover>
                              <PopoverTrigger asChild>
                                <button
                                  className="p-0.5 hover:bg-slate-200 rounded"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Palette className="h-3 w-3 text-slate-500" />
                                </button>
                              </PopoverTrigger>
                              <PopoverContent className="w-48 p-2" align="end">
                                <div className="space-y-2">
                                  <div className="text-xs font-medium text-slate-700">
                                    Highlight Color
                                  </div>
                                  <div className="grid grid-cols-4 gap-1">
                                    {HIGHLIGHT_COLORS.map((color) => (
                                      <button
                                        key={color}
                                        className={cn(
                                          "w-8 h-8 rounded border-2",
                                          state.highlightColor === color
                                            ? "border-slate-800"
                                            : "border-transparent"
                                        )}
                                        style={{ backgroundColor: color }}
                                        onClick={() => onLayerHighlight(structure.layerId, color)}
                                      />
                                    ))}
                                  </div>
                                  {state.highlightColor && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="w-full h-7 text-xs"
                                      onClick={() => onLayerHighlight(structure.layerId, null)}
                                    >
                                      Clear Highlight
                                    </Button>
                                  )}
                                </div>
                              </PopoverContent>
                            </Popover>

                            {/* Opacity Control */}
                            <Popover>
                              <PopoverTrigger asChild>
                                <button
                                  className="p-0.5 hover:bg-slate-200 rounded"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Droplets className="h-3 w-3 text-slate-500" />
                                </button>
                              </PopoverTrigger>
                              <PopoverContent className="w-48 p-3" align="end">
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-medium text-slate-700">
                                      Opacity
                                    </span>
                                    <span className="text-xs text-slate-500">
                                      {Math.round(state.opacity * 100)}%
                                    </span>
                                  </div>
                                  <Slider
                                    value={[state.opacity * 100]}
                                    min={10}
                                    max={100}
                                    step={5}
                                    onValueChange={([value]) => 
                                      onLayerOpacity(structure.layerId, value / 100)
                                    }
                                  />
                                </div>
                              </PopoverContent>
                            </Popover>
                          </div>
                        );
                      })}
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
