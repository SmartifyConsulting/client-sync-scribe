import React, { useRef, useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Pencil,
  Eraser,
  Type,
  Trash2,
  Save,
  Undo,
  Redo,
  History,
  Move,
  Circle,
  Square,
  Minus,
  ArrowRight,
  Download,
  Loader2,
  ZoomIn,
  ZoomOut,
  RotateCw,
  RotateCcw,
  X,
  Maximize2,
  Layers,
  Hand,
  Highlighter,
  Eye,
  EyeOff,
  Edit3,
  Check,
} from "lucide-react";
import { professionalAnatomyAssets, LayeredAnatomyAsset, AnatomyLayer } from "./MedicalAnatomyAssets";
import { AnatomyBrowser, StructureMetadataPanel, AnatomyStructure, AnatomySystem } from "./AnatomyBrowser";
import { useSessionDrawings, CanvasData, CanvasElement } from "@/hooks/useSessionDrawings";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface DrawingPadProps {
  patientId: string;
  sessionId?: string | null;
  patientName?: string;
  onClose?: () => void;
  isModal?: boolean;
}

type Tool = "pen" | "marker" | "eraser" | "text" | "select" | "pan" | "line" | "circle" | "rectangle" | "arrow";

const COLORS = [
  "#000000", "#DC143C", "#FF4500", "#FFD700", "#228B22", 
  "#008B8B", "#0066CC", "#663399", "#C71585", "#4A4A4A"
];

const FONT_SIZES = [
  { label: "XS", size: 10 },
  { label: "S", size: 14 },
  { label: "M", size: 18 },
  { label: "L", size: 24 },
  { label: "XL", size: 32 },
];

const DEFAULT_LAYERS: AnatomyLayer[] = ["skin", "muscular", "skeletal", "labels"];

export function DrawingPad({ patientId, sessionId, patientName, onClose, isModal = false }: DrawingPadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Tool state
  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState("#DC143C");
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [fontSize, setFontSize] = useState(18);
  const [isDrawing, setIsDrawing] = useState(false);
  
  // Annotation visibility
  const [showAnnotations, setShowAnnotations] = useState(true);
  
  // Editing state
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [editingTextValue, setEditingTextValue] = useState("");
  
  // Canvas state
  const [elements, setElements] = useState<CanvasElement[]>([]);
  const [history, setHistory] = useState<CanvasElement[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  
  // Transform state (zoom, pan, rotate)
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  
  // Layer visibility
  const [visibleLayers, setVisibleLayers] = useState<AnatomyLayer[]>(DEFAULT_LAYERS);
  const [showLayerPanel, setShowLayerPanel] = useState(false);
  
  // Anatomy selection state
  const [selectedStructure, setSelectedStructure] = useState<AnatomyStructure | null>(null);
  const [selectedSystem, setSelectedSystem] = useState<AnatomySystem | null>(null);
  const [highlightColor, setHighlightColor] = useState("#DC143C");
  const [highlightOpacity, setHighlightOpacity] = useState(0.7);
  
  // UI state
  const [draggedAnatomy, setDraggedAnatomy] = useState<LayeredAnatomyAsset | null>(null);
  const [showVersions, setShowVersions] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [textPosition, setTextPosition] = useState<{ x: number; y: number } | null>(null);
  const [isDraggingElement, setIsDraggingElement] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isResizing, setIsResizing] = useState(false);
  const [resizeCorner, setResizeCorner] = useState<string | null>(null);

  const { 
    drawings, 
    currentDrawing, 
    loading, 
    saving, 
    saveDrawing, 
    loadVersion 
  } = useSessionDrawings(patientId, sessionId);

  // Initialize canvas with current drawing
  useEffect(() => {
    if (currentDrawing?.canvas_data?.elements) {
      setElements(currentDrawing.canvas_data.elements);
      setHistory([currentDrawing.canvas_data.elements]);
      setHistoryIndex(0);
    }
  }, [currentDrawing]);

  // Render elements to canvas (only annotation elements, not anatomy)
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear and apply transforms
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#FAFAFA";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Skip rendering annotations if hidden
    if (!showAnnotations) return;
    
    // Apply zoom and pan
    ctx.setTransform(scale, 0, 0, scale, offset.x, offset.y);

    // Render annotation elements (paths, text, shapes)
    elements
      .filter(el => el.type !== "anatomy")
      .forEach((element) => {
        ctx.save();
        
        if (element.type === "path") {
          const isMarker = element.data.isMarker;
          
          if (isMarker) {
            // Marker: semi-transparent, thicker stroke
            ctx.globalAlpha = 0.4;
            ctx.strokeStyle = element.color || "#FFD700";
            ctx.lineWidth = ((element.strokeWidth || 8) * 3) / scale;
          } else {
            // Pen: solid stroke
            ctx.strokeStyle = element.color || "#000000";
            ctx.lineWidth = (element.strokeWidth || 2) / scale;
          }
          
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          
          const points = element.data.points as { x: number; y: number }[];
          if (points && points.length > 1) {
            ctx.beginPath();
            ctx.moveTo(points[0].x, points[0].y);
            for (let i = 1; i < points.length; i++) {
              ctx.lineTo(points[i].x, points[i].y);
            }
            ctx.stroke();
          }
        } else if (element.type === "text") {
          ctx.fillStyle = element.color || "#000000";
          const fontWeight = element.data.fontWeight || "normal";
          const fontFamily = element.data.fontFamily || "Arial, sans-serif";
          ctx.font = `${fontWeight} ${(element.strokeWidth || 16) / scale}px ${fontFamily}`;
          ctx.fillText(element.data.text, element.x, element.y);
        } else if (element.type === "shape") {
          ctx.strokeStyle = element.color || "#000000";
          ctx.lineWidth = (element.strokeWidth || 2) / scale;
          
          if (element.data.shapeType === "line" || element.data.shapeType === "arrow") {
            ctx.beginPath();
            ctx.moveTo(element.x, element.y);
            ctx.lineTo(element.data.endX, element.data.endY);
            ctx.stroke();
            
            if (element.data.shapeType === "arrow") {
              const angle = Math.atan2(element.data.endY - element.y, element.data.endX - element.x);
              const headLen = 15 / scale;
              ctx.beginPath();
              ctx.moveTo(element.data.endX, element.data.endY);
              ctx.lineTo(
                element.data.endX - headLen * Math.cos(angle - Math.PI / 6),
                element.data.endY - headLen * Math.sin(angle - Math.PI / 6)
              );
              ctx.moveTo(element.data.endX, element.data.endY);
              ctx.lineTo(
                element.data.endX - headLen * Math.cos(angle + Math.PI / 6),
                element.data.endY - headLen * Math.sin(angle + Math.PI / 6)
              );
              ctx.stroke();
            }
          } else if (element.data.shapeType === "circle") {
            ctx.beginPath();
            const radius = Math.sqrt(
              Math.pow(element.data.endX - element.x, 2) + 
              Math.pow(element.data.endY - element.y, 2)
            );
            ctx.arc(element.x, element.y, radius, 0, 2 * Math.PI);
            ctx.stroke();
          } else if (element.data.shapeType === "rectangle") {
            ctx.beginPath();
            ctx.rect(
              element.x, 
              element.y, 
              element.data.endX - element.x, 
              element.data.endY - element.y
            );
            ctx.stroke();
          }
        }
        
        ctx.restore();
      });
  }, [elements, scale, offset, showAnnotations]);

  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  // Handle canvas resize
  useEffect(() => {
    const resizeCanvas = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
      renderCanvas();
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    return () => window.removeEventListener("resize", resizeCanvas);
  }, [renderCanvas]);

  // Zoom handling with wheel
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const newScale = Math.max(0.25, Math.min(4, scale * delta));
      
      // Zoom toward mouse position
      const rect = container.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      const newOffsetX = mouseX - (mouseX - offset.x) * (newScale / scale);
      const newOffsetY = mouseY - (mouseY - offset.y) * (newScale / scale);
      
      setScale(newScale);
      setOffset({ x: newOffsetX, y: newOffsetY });
    };

    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => container.removeEventListener("wheel", handleWheel);
  }, [scale, offset]);

  const addToHistory = (newElements: CanvasElement[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newElements);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setElements(history[historyIndex - 1]);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setElements(history[historyIndex + 1]);
    }
  };

  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left - offset.x) / scale,
      y: (e.clientY - rect.top - offset.y) / scale,
    };
  };

  const [currentPath, setCurrentPath] = useState<{ x: number; y: number }[]>([]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoords(e);

    if (tool === "pan") {
      setIsPanning(true);
      setPanStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
      return;
    }

    setIsDrawing(true);

    if (tool === "pen" || tool === "marker" || tool === "eraser") {
      setCurrentPath([coords]);
    } else if (tool === "text") {
      setTextPosition(coords);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPanning) {
      setOffset({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
      return;
    }

    if (!isDrawing) return;
    const coords = getCanvasCoords(e);

    if (tool === "pen" || tool === "marker" || tool === "eraser") {
      setCurrentPath((prev) => [...prev, coords]);
      
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (ctx && currentPath.length > 0) {
        ctx.save();
        ctx.setTransform(scale, 0, 0, scale, offset.x, offset.y);
        
        if (tool === "marker") {
          ctx.globalAlpha = 0.4;
          ctx.strokeStyle = color;
          ctx.lineWidth = (strokeWidth * 4) / scale;
        } else if (tool === "eraser") {
          ctx.strokeStyle = "#FAFAFA";
          ctx.lineWidth = (strokeWidth * 3) / scale;
        } else {
          ctx.strokeStyle = color;
          ctx.lineWidth = strokeWidth / scale;
        }
        
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(currentPath[currentPath.length - 1].x, currentPath[currentPath.length - 1].y);
        ctx.lineTo(coords.x, coords.y);
        ctx.stroke();
        ctx.restore();
      }
    }
  };

  const handleMouseUp = () => {
    if (isPanning) {
      setIsPanning(false);
      return;
    }

    if (!isDrawing) return;
    setIsDrawing(false);

    if ((tool === "pen" || tool === "marker" || tool === "eraser") && currentPath.length > 1) {
      const newElement: CanvasElement = {
        id: crypto.randomUUID(),
        type: "path",
        data: { 
          points: currentPath,
          isMarker: tool === "marker",
        },
        x: 0,
        y: 0,
        color: tool === "eraser" ? "#FAFAFA" : color,
        strokeWidth: tool === "eraser" ? strokeWidth * 3 : (tool === "marker" ? strokeWidth * 4 : strokeWidth),
      };
      const newElements = [...elements, newElement];
      setElements(newElements);
      addToHistory(newElements);
    }
    
    setCurrentPath([]);
  };

  const handleAddText = () => {
    if (!textInput || !textPosition) return;
    
    const newElement: CanvasElement = {
      id: crypto.randomUUID(),
      type: "text",
      data: { 
        text: textInput,
        fontWeight: "normal",
        fontFamily: "Arial, sans-serif",
      },
      x: textPosition.x,
      y: textPosition.y,
      color,
      strokeWidth: fontSize,
    };
    const newElements = [...elements, newElement];
    setElements(newElements);
    addToHistory(newElements);
    setTextInput("");
    setTextPosition(null);
    setTool("select");
  };

  // Update existing text element
  const handleUpdateText = (elementId: string, newText: string) => {
    setElements(prev => prev.map(el => 
      el.id === elementId 
        ? { ...el, data: { ...el.data, text: newText } }
        : el
    ));
    addToHistory(elements);
    setEditingTextId(null);
    setEditingTextValue("");
  };

  // Start editing a text element
  const startEditingText = (element: CanvasElement) => {
    if (element.type !== "text") return;
    setEditingTextId(element.id);
    setEditingTextValue(element.data.text);
    setSelectedElement(element.id);
  };

  const handleDragStart = (asset: LayeredAnatomyAsset) => {
    setDraggedAnatomy(asset);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!draggedAnatomy || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left - offset.x) / scale - draggedAnatomy.defaultWidth / 2;
    const y = (e.clientY - rect.top - offset.y) / scale - draggedAnatomy.defaultHeight / 2;

    const newElement: CanvasElement = {
      id: crypto.randomUUID(),
      type: "anatomy",
      data: { 
        assetId: draggedAnatomy.id,
        visibleLayers: [...visibleLayers],
        rotation: 0,
      },
      x,
      y,
      width: draggedAnatomy.defaultWidth,
      height: draggedAnatomy.defaultHeight,
    };
    const newElements = [...elements, newElement];
    setElements(newElements);
    addToHistory(newElements);
    setDraggedAnatomy(null);
    setSelectedElement(newElement.id);
  };

  const handleSave = async (createNewVersion = false) => {
    const canvasData: CanvasData = { elements };
    await saveDrawing(canvasData, createNewVersion);
  };

  const clearCanvas = () => {
    setElements([]);
    addToHistory([]);
    setSelectedElement(null);
  };

  const resetView = () => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  };

  const exportImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const link = document.createElement("a");
    link.download = `clinical-drawing-${patientName || "patient"}-${format(new Date(), "yyyy-MM-dd")}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  // Element manipulation
  const handleElementMouseDown = (e: React.MouseEvent, elementId: string) => {
    e.stopPropagation();
    setSelectedElement(elementId);
    
    if (tool === "select") {
      const element = elements.find(el => el.id === elementId);
      if (element) {
        const rect = (e.target as HTMLElement).getBoundingClientRect();
        setDragOffset({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top
        });
        setIsDraggingElement(true);
      }
    }
  };

  const handleElementMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingElement || !selectedElement || !containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const newX = (e.clientX - rect.left - offset.x) / scale - dragOffset.x;
    const newY = (e.clientY - rect.top - offset.y) / scale - dragOffset.y;
    
    setElements(prev => prev.map(el => 
      el.id === selectedElement 
        ? { ...el, x: newX, y: newY }
        : el
    ));
  };

  const handleElementMouseUp = () => {
    if (isDraggingElement && selectedElement) {
      addToHistory(elements);
    }
    setIsDraggingElement(false);
    setIsResizing(false);
    setResizeCorner(null);
  };

  const handleResizeStart = (e: React.MouseEvent, corner: string) => {
    e.stopPropagation();
    setIsResizing(true);
    setResizeCorner(corner);
  };

  const handleResize = (e: React.MouseEvent) => {
    if (!isResizing || !selectedElement || !containerRef.current || !resizeCorner) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left - offset.x) / scale;
    const mouseY = (e.clientY - rect.top - offset.y) / scale;
    
    setElements(prev => prev.map(el => {
      if (el.id !== selectedElement) return el;
      
      let newWidth = el.width || 100;
      let newHeight = el.height || 100;
      let newX = el.x;
      let newY = el.y;
      
      if (resizeCorner.includes("e")) newWidth = Math.max(60, mouseX - el.x);
      if (resizeCorner.includes("w")) {
        const widthDiff = el.x - mouseX;
        newWidth = Math.max(60, (el.width || 100) + widthDiff);
        newX = mouseX;
      }
      if (resizeCorner.includes("s")) newHeight = Math.max(60, mouseY - el.y);
      if (resizeCorner.includes("n")) {
        const heightDiff = el.y - mouseY;
        newHeight = Math.max(60, (el.height || 100) + heightDiff);
        newY = mouseY;
      }
      
      return { ...el, x: newX, y: newY, width: newWidth, height: newHeight };
    }));
  };

  const scaleElement = (factor: number) => {
    if (!selectedElement) return;
    setElements(prev => prev.map(el => {
      if (el.id !== selectedElement) return el;
      return {
        ...el,
        width: (el.width || 100) * factor,
        height: (el.height || 100) * factor
      };
    }));
    addToHistory(elements);
  };

  const rotateElement = (degrees: number) => {
    if (!selectedElement) return;
    setElements(prev => prev.map(el => {
      if (el.id !== selectedElement) return el;
      return {
        ...el,
        data: { ...el.data, rotation: ((el.data.rotation || 0) + degrees) % 360 }
      };
    }));
    addToHistory(elements);
  };

  const deleteSelectedElement = () => {
    if (!selectedElement) return;
    const newElements = elements.filter(el => el.id !== selectedElement);
    setElements(newElements);
    addToHistory(newElements);
    setSelectedElement(null);
  };

  const toggleLayer = (layer: AnatomyLayer) => {
    setVisibleLayers(prev => 
      prev.includes(layer) 
        ? prev.filter(l => l !== layer)
        : [...prev, layer]
    );
  };

  // Update selected element's visible layers
  const updateElementLayers = (layer: AnatomyLayer) => {
    if (!selectedElement) return;
    setElements(prev => prev.map(el => {
      if (el.id !== selectedElement || el.type !== "anatomy") return el;
      const currentLayers = el.data.visibleLayers || DEFAULT_LAYERS;
      const newLayers = currentLayers.includes(layer)
        ? currentLayers.filter((l: AnatomyLayer) => l !== layer)
        : [...currentLayers, layer];
      return { ...el, data: { ...el.data, visibleLayers: newLayers } };
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const selectedEl = elements.find(el => el.id === selectedElement);
  const selectedAsset = selectedEl?.type === "anatomy" 
    ? professionalAnatomyAssets.find(a => a.id === selectedEl.data.assetId)
    : null;

  return (
    <div 
      className={cn("flex flex-col h-full bg-background", isModal && "max-h-[85vh]")}
      onMouseMove={(e) => {
        if (isDraggingElement) handleElementMouseMove(e);
        if (isResizing) handleResize(e);
      }}
      onMouseUp={handleElementMouseUp}
      onMouseLeave={handleElementMouseUp}
    >
      {/* Professional Toolbar */}
      <div className="flex flex-wrap items-center gap-1.5 px-3 py-2 bg-muted/30 border-b">
        {/* Drawing Tools */}
        <div className="flex items-center gap-0.5 pr-2 border-r">
          <Button
            variant={tool === "select" ? "secondary" : "ghost"}
            size="icon"
            className="h-8 w-8"
            onClick={() => setTool("select")}
            title="Select (V)"
          >
            <Move className="h-4 w-4" />
          </Button>
          <Button
            variant={tool === "pan" ? "secondary" : "ghost"}
            size="icon"
            className="h-8 w-8"
            onClick={() => setTool("pan")}
            title="Pan (Space+Drag)"
          >
            <Hand className="h-4 w-4" />
          </Button>
          <Button
            variant={tool === "pen" ? "secondary" : "ghost"}
            size="icon"
            className="h-8 w-8"
            onClick={() => setTool("pen")}
            title="Pen (P)"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant={tool === "marker" ? "secondary" : "ghost"}
            size="icon"
            className="h-8 w-8"
            onClick={() => setTool("marker")}
            title="Marker (M)"
          >
            <Highlighter className="h-4 w-4" />
          </Button>
          <Button
            variant={tool === "eraser" ? "secondary" : "ghost"}
            size="icon"
            className="h-8 w-8"
            onClick={() => setTool("eraser")}
            title="Eraser (E)"
          >
            <Eraser className="h-4 w-4" />
          </Button>
          <Button
            variant={tool === "text" ? "secondary" : "ghost"}
            size="icon"
            className="h-8 w-8"
            onClick={() => setTool("text")}
            title="Text (T)"
          >
            <Type className="h-4 w-4" />
          </Button>
        </div>

        {/* Shape Tools */}
        <div className="flex items-center gap-0.5 pr-2 border-r">
          <Button
            variant={tool === "line" ? "secondary" : "ghost"}
            size="icon"
            className="h-8 w-8"
            onClick={() => setTool("line")}
            title="Line"
          >
            <Minus className="h-4 w-4" />
          </Button>
          <Button
            variant={tool === "arrow" ? "secondary" : "ghost"}
            size="icon"
            className="h-8 w-8"
            onClick={() => setTool("arrow")}
            title="Arrow"
          >
            <ArrowRight className="h-4 w-4" />
          </Button>
          <Button
            variant={tool === "circle" ? "secondary" : "ghost"}
            size="icon"
            className="h-8 w-8"
            onClick={() => setTool("circle")}
            title="Circle"
          >
            <Circle className="h-4 w-4" />
          </Button>
          <Button
            variant={tool === "rectangle" ? "secondary" : "ghost"}
            size="icon"
            className="h-8 w-8"
            onClick={() => setTool("rectangle")}
            title="Rectangle"
          >
            <Square className="h-4 w-4" />
          </Button>
        </div>

        {/* Color & Stroke */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" title="Annotation Color">
              <div className="h-5 w-5 rounded-full border-2 border-background shadow-sm" style={{ backgroundColor: color }} />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-3">
            <div className="space-y-3">
              <div>
                <p className="text-xs font-medium mb-2">Color</p>
                <div className="grid grid-cols-5 gap-1.5">
                  {COLORS.map((c) => (
                    <button
                      key={c}
                      className={cn(
                        "h-7 w-7 rounded-full border-2 transition-transform hover:scale-110",
                        color === c ? "border-primary ring-2 ring-primary/30" : "border-transparent"
                      )}
                      style={{ backgroundColor: c }}
                      onClick={() => setColor(c)}
                    />
                  ))}
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        <div className="flex items-center gap-2 w-20 px-2">
          <span className="text-xs text-muted-foreground whitespace-nowrap">Size</span>
          <Slider
            value={[strokeWidth]}
            onValueChange={(v) => setStrokeWidth(v[0])}
            min={1}
            max={10}
            step={1}
            className="flex-1"
          />
        </div>

        {/* Font Size (shown when text tool selected) */}
        {tool === "text" && (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 gap-1 px-2" title="Font Size">
                <Type className="h-3.5 w-3.5" />
                <span className="text-xs">{fontSize}px</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2">
              <div className="space-y-2">
                <p className="text-xs font-medium">Font Size</p>
                <div className="flex gap-1">
                  {FONT_SIZES.map(({ label, size }) => (
                    <Button
                      key={size}
                      variant={fontSize === size ? "secondary" : "outline"}
                      size="sm"
                      className="h-8 w-10"
                      onClick={() => setFontSize(size)}
                    >
                      {label}
                    </Button>
                  ))}
                </div>
                <Slider
                  value={[fontSize]}
                  onValueChange={(v) => setFontSize(v[0])}
                  min={8}
                  max={48}
                  step={2}
                  className="w-full"
                />
              </div>
            </PopoverContent>
          </Popover>
        )}

        {/* Toggle Annotations Visibility */}
        <Button
          variant={showAnnotations ? "ghost" : "secondary"}
          size="icon"
          className="h-8 w-8"
          onClick={() => setShowAnnotations(!showAnnotations)}
          title={showAnnotations ? "Hide Annotations" : "Show Annotations"}
        >
          {showAnnotations ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
        </Button>

        {/* View Controls */}
        <div className="flex items-center gap-0.5 px-2 border-l border-r">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setScale(s => Math.max(0.25, s * 0.8))} title="Zoom Out">
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-xs text-muted-foreground w-12 text-center">{Math.round(scale * 100)}%</span>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setScale(s => Math.min(4, s * 1.25))} title="Zoom In">
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={resetView} title="Reset View">
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>

        {/* History & Actions */}
        <div className="flex items-center gap-0.5 pr-2 border-r">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={undo} disabled={historyIndex <= 0} title="Undo">
            <Undo className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={redo} disabled={historyIndex >= history.length - 1} title="Redo">
            <Redo className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-0.5">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={clearCanvas} title="Clear All">
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={exportImage} title="Export Image">
            <Download className="h-4 w-4" />
          </Button>
        </div>

        {/* Save Actions */}
        <div className="flex items-center gap-1 ml-auto">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1"
            onClick={() => setShowLayerPanel(!showLayerPanel)}
          >
            <Layers className="h-4 w-4" />
            <span className="hidden lg:inline">Layers</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1"
            onClick={() => setShowVersions(!showVersions)}
          >
            <History className="h-4 w-4" />
            {drawings.length > 0 && <Badge variant="secondary" className="h-5 px-1.5">{drawings.length}</Badge>}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8"
            onClick={() => handleSave(false)}
            disabled={saving}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 sm:mr-1" />}
            <span className="hidden sm:inline">Save</span>
          </Button>
          <Button
            variant="default"
            size="sm"
            className="h-8"
            onClick={() => handleSave(true)}
            disabled={saving}
          >
            <span className="hidden sm:inline">New Version</span>
            <span className="sm:hidden">+</span>
          </Button>
        </div>
      </div>

      {/* Element Control Bar */}
      {selectedElement && selectedEl?.type === "anatomy" && selectedAsset && (
        <div className="flex items-center gap-3 px-3 py-2 bg-primary/5 border-b">
          <span className="text-sm font-medium">{selectedAsset.name}</span>
          <span className="text-xs text-muted-foreground">{selectedAsset.description}</span>
          
          <div className="flex items-center gap-1 ml-auto">
            <Button variant="outline" size="sm" className="h-7 gap-1" onClick={() => scaleElement(0.9)} title="Shrink">
              <ZoomOut className="h-3.5 w-3.5" />
            </Button>
            <Button variant="outline" size="sm" className="h-7 gap-1" onClick={() => scaleElement(1.1)} title="Enlarge">
              <ZoomIn className="h-3.5 w-3.5" />
            </Button>
            <Button variant="outline" size="sm" className="h-7 gap-1" onClick={() => rotateElement(-90)} title="Rotate Left">
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
            <Button variant="outline" size="sm" className="h-7 gap-1" onClick={() => rotateElement(90)} title="Rotate Right">
              <RotateCw className="h-3.5 w-3.5" />
            </Button>
            
            {/* Layer toggles for selected element */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 gap-1">
                  <Layers className="h-3.5 w-3.5" />
                  <span className="text-xs">Systems</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-2">
                <div className="space-y-2">
                  {selectedAsset.availableLayers.map(layer => (
                    <div key={layer} className="flex items-center justify-between">
                      <Label className="text-xs capitalize">{layer}</Label>
                      <Switch
                        checked={(selectedEl.data.visibleLayers || DEFAULT_LAYERS).includes(layer)}
                        onCheckedChange={() => updateElementLayers(layer)}
                      />
                    </div>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
            
            <Button variant="destructive" size="sm" className="h-7" onClick={deleteSelectedElement} title="Delete">
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex flex-1 min-h-0">
        {/* Anatomy Browser Panel */}
        <div className="w-56 border-r bg-muted/20 flex flex-col">
          <div className="p-2 border-b bg-muted/30">
            <h4 className="font-semibold text-xs uppercase tracking-wide text-muted-foreground">Anatomy Systems</h4>
          </div>
          <AnatomyBrowser
            onSelectStructure={(structure, system, color) => {
              setSelectedStructure(structure);
              setSelectedSystem(system);
              setHighlightColor(color);
            }}
            selectedStructureId={selectedStructure?.id || null}
            highlightColor={highlightColor}
            highlightOpacity={highlightOpacity}
            onHighlightColorChange={setHighlightColor}
            onHighlightOpacityChange={setHighlightOpacity}
            visibleLayers={visibleLayers}
            anatomyAssets={professionalAnatomyAssets}
            onDragStart={handleDragStart}
          />
        </div>

        {/* Canvas Area */}
        <div 
          ref={containerRef}
          className={cn(
            "flex-1 relative overflow-hidden",
            tool === "pan" && "cursor-grab",
            isPanning && "cursor-grabbing"
          )}
          style={{ backgroundColor: "#F5F5F5" }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => tool !== "select" && setSelectedElement(null)}
        >
          {/* Grid background */}
          <div 
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: `
                linear-gradient(to right, #E0E0E0 1px, transparent 1px),
                linear-gradient(to bottom, #E0E0E0 1px, transparent 1px)
              `,
              backgroundSize: `${20 * scale}px ${20 * scale}px`,
              backgroundPosition: `${offset.x}px ${offset.y}px`,
            }}
          />
          
          <canvas
            ref={canvasRef}
            className="absolute inset-0"
            style={{ cursor: tool === "pen" ? "crosshair" : tool === "pan" ? (isPanning ? "grabbing" : "grab") : "default" }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          />
          
          {/* Anatomy Overlays with clinical highlighting */}
          {elements
            .filter((el) => el.type === "anatomy")
            .map((el) => {
              const asset = professionalAnatomyAssets.find((a) => a.id === el.data.assetId);
              if (!asset) return null;
              const isSelected = selectedElement === el.id;
              const elementLayers = el.data.visibleLayers || DEFAULT_LAYERS;
              
              // Check if this element matches the selected structure
              const isStructureHighlighted = selectedStructure?.assetId === el.data.assetId;
              const shouldDim = selectedStructure && !isStructureHighlighted;
              
              // Convert hex color to rgba for opacity control
              const hexToRgba = (hex: string, alpha: number) => {
                const r = parseInt(hex.slice(1, 3), 16);
                const g = parseInt(hex.slice(3, 5), 16);
                const b = parseInt(hex.slice(5, 7), 16);
                return `rgba(${r}, ${g}, ${b}, ${alpha})`;
              };
              
              return (
                <div
                  key={el.id}
                  className={cn(
                    "absolute transition-all duration-200",
                    isSelected && "ring-2 shadow-xl",
                    tool === "select" && "cursor-move"
                  )}
                  style={{
                    left: el.x * scale + offset.x,
                    top: el.y * scale + offset.y,
                    width: (el.width || asset.defaultWidth) * scale,
                    height: (el.height || asset.defaultHeight) * scale,
                    transform: el.data.rotation ? `rotate(${el.data.rotation}deg)` : undefined,
                    transformOrigin: "center center",
                    opacity: shouldDim ? 0.3 : 1,
                    filter: shouldDim ? "grayscale(70%)" : "none",
                    boxShadow: isSelected 
                      ? `0 0 0 2px hsl(var(--primary))` 
                      : undefined,
                  }}
                  onMouseDown={(e) => handleElementMouseDown(e, el.id)}
                >
                  {/* Base anatomy rendering - always at full fidelity */}
                  <asset.component visibleLayers={elementLayers} color={undefined} />
                  
                  {/* Clinical highlight overlay - separate layer to preserve anatomical accuracy */}
                  {isStructureHighlighted && (
                    <>
                      {/* Non-distorting color overlay with adjustable opacity */}
                      <div 
                        className="absolute inset-0 pointer-events-none rounded-lg mix-blend-multiply"
                        style={{ 
                          backgroundColor: hexToRgba(highlightColor, highlightOpacity * 0.35),
                        }}
                      />
                      
                      {/* Highlight border with glow effect */}
                      <div 
                        className="absolute inset-0 pointer-events-none rounded-lg"
                        style={{ 
                          border: `3px solid ${hexToRgba(highlightColor, highlightOpacity)}`,
                          boxShadow: `
                            inset 0 0 ${20 * highlightOpacity}px ${hexToRgba(highlightColor, highlightOpacity * 0.3)},
                            0 0 ${15 * highlightOpacity}px ${hexToRgba(highlightColor, highlightOpacity * 0.5)}
                          `,
                        }}
                      />
                      
                      {/* Corner indicators for clinical marking */}
                      <div className="absolute top-0 left-0 w-4 h-4 pointer-events-none" style={{ borderTop: `3px solid ${highlightColor}`, borderLeft: `3px solid ${highlightColor}`, opacity: highlightOpacity }} />
                      <div className="absolute top-0 right-0 w-4 h-4 pointer-events-none" style={{ borderTop: `3px solid ${highlightColor}`, borderRight: `3px solid ${highlightColor}`, opacity: highlightOpacity }} />
                      <div className="absolute bottom-0 left-0 w-4 h-4 pointer-events-none" style={{ borderBottom: `3px solid ${highlightColor}`, borderLeft: `3px solid ${highlightColor}`, opacity: highlightOpacity }} />
                      <div className="absolute bottom-0 right-0 w-4 h-4 pointer-events-none" style={{ borderBottom: `3px solid ${highlightColor}`, borderRight: `3px solid ${highlightColor}`, opacity: highlightOpacity }} />
                    </>
                  )}
                  
                  {/* Structure name label when highlighted */}
                  {isStructureHighlighted && selectedStructure && (
                    <div 
                      className="absolute -top-8 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap shadow-lg backdrop-blur-sm"
                      style={{ 
                        backgroundColor: hexToRgba(highlightColor, highlightOpacity),
                        color: "#FFFFFF",
                        boxShadow: `0 2px 8px ${hexToRgba(highlightColor, 0.4)}`
                      }}
                    >
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-white/80" />
                        {selectedStructure.name}
                      </div>
                    </div>
                  )}
                  
                  {/* Resize Handles */}
                  {isSelected && (
                    <>
                      <div 
                        className="absolute -top-2 -left-2 w-4 h-4 rounded-full cursor-nw-resize border-2 border-background shadow-lg" 
                        style={{ backgroundColor: "hsl(var(--primary))" }}
                        onMouseDown={(e) => handleResizeStart(e, "nw")} 
                      />
                      <div 
                        className="absolute -top-2 -right-2 w-4 h-4 rounded-full cursor-ne-resize border-2 border-background shadow-lg" 
                        style={{ backgroundColor: "hsl(var(--primary))" }}
                        onMouseDown={(e) => handleResizeStart(e, "ne")} 
                      />
                      <div 
                        className="absolute -bottom-2 -left-2 w-4 h-4 rounded-full cursor-sw-resize border-2 border-background shadow-lg" 
                        style={{ backgroundColor: "hsl(var(--primary))" }}
                        onMouseDown={(e) => handleResizeStart(e, "sw")} 
                      />
                      <div 
                        className="absolute -bottom-2 -right-2 w-4 h-4 rounded-full cursor-se-resize border-2 border-background shadow-lg" 
                        style={{ backgroundColor: "hsl(var(--primary))" }}
                        onMouseDown={(e) => handleResizeStart(e, "se")} 
                      />
                    </>
                  )}
                </div>
              );
            })}
          
          {/* Structure Metadata Panel */}
          <StructureMetadataPanel
            structure={selectedStructure}
            system={selectedSystem}
            highlightColor={highlightColor}
            highlightOpacity={highlightOpacity}
            onClose={() => {
              setSelectedStructure(null);
              setSelectedSystem(null);
            }}
          />

          {/* Text Input Dialog */}
          {textPosition && (
            <div
              className="absolute bg-background border-2 rounded-xl shadow-xl p-4 z-20"
              style={{ 
                left: textPosition.x * scale + offset.x, 
                top: textPosition.y * scale + offset.y,
                borderColor: color,
              }}
            >
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <Type className="h-4 w-4" style={{ color }} />
                  <span className="text-xs font-medium">Add Text Label</span>
                </div>
                <input
                  type="text"
                  className="border rounded-lg px-3 py-2 text-sm w-56 bg-background"
                  placeholder="Enter annotation text..."
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  style={{ fontSize: `${Math.min(fontSize, 20)}px` }}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddText();
                    if (e.key === "Escape") {
                      setTextPosition(null);
                      setTextInput("");
                    }
                  }}
                />
                
                {/* Font size selector in text dialog */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Size:</span>
                  <div className="flex gap-1">
                    {FONT_SIZES.map(({ label, size }) => (
                      <Button
                        key={size}
                        variant={fontSize === size ? "secondary" : "ghost"}
                        size="sm"
                        className="h-6 w-8 text-xs p-0"
                        onClick={() => setFontSize(size)}
                      >
                        {label}
                      </Button>
                    ))}
                  </div>
                </div>
                
                {/* Color selector */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Color:</span>
                  <div className="flex gap-1">
                    {COLORS.slice(0, 6).map((c) => (
                      <button
                        key={c}
                        className={cn(
                          "w-5 h-5 rounded-full border-2 transition-transform hover:scale-110",
                          color === c ? "border-foreground scale-110" : "border-transparent"
                        )}
                        style={{ backgroundColor: c }}
                        onClick={() => setColor(c)}
                      />
                    ))}
                  </div>
                </div>
                
                <div className="flex gap-2 pt-1">
                  <Button size="sm" onClick={handleAddText} className="flex-1">
                    <Check className="h-3.5 w-3.5 mr-1" />
                    Add
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { setTextPosition(null); setTextInput(""); }}>
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Editable Text Labels Overlay */}
          {showAnnotations && elements
            .filter(el => el.type === "text")
            .map(el => {
              const isEditing = editingTextId === el.id;
              const isSelected = selectedElement === el.id;
              
              return (
                <div
                  key={`text-overlay-${el.id}`}
                  className={cn(
                    "absolute cursor-pointer transition-all group",
                    isSelected && "ring-2 ring-primary rounded",
                    tool === "select" && "hover:ring-2 hover:ring-primary/50 hover:rounded"
                  )}
                  style={{
                    left: el.x * scale + offset.x,
                    top: (el.y - (el.strokeWidth || 16)) * scale + offset.y,
                    transform: `scale(${scale})`,
                    transformOrigin: "top left",
                  }}
                  onClick={() => {
                    if (tool === "select") {
                      setSelectedElement(el.id);
                    }
                  }}
                  onDoubleClick={() => startEditingText(el)}
                >
                  {isEditing ? (
                    <input
                      type="text"
                      className="bg-background border rounded px-1 min-w-[100px]"
                      style={{
                        color: el.color || "#000000",
                        fontSize: `${el.strokeWidth || 16}px`,
                        fontFamily: el.data.fontFamily || "Arial, sans-serif",
                      }}
                      value={editingTextValue}
                      onChange={(e) => setEditingTextValue(e.target.value)}
                      onBlur={() => handleUpdateText(el.id, editingTextValue)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleUpdateText(el.id, editingTextValue);
                        if (e.key === "Escape") {
                          setEditingTextId(null);
                          setEditingTextValue("");
                        }
                      }}
                      autoFocus
                    />
                  ) : (
                    <div className="relative">
                      <span
                        style={{
                          color: el.color || "#000000",
                          fontSize: `${el.strokeWidth || 16}px`,
                          fontFamily: el.data.fontFamily || "Arial, sans-serif",
                          fontWeight: el.data.fontWeight || "normal",
                        }}
                      >
                        {el.data.text}
                      </span>
                      {isSelected && (
                        <Button
                          variant="secondary"
                          size="sm"
                          className="absolute -top-6 left-0 h-5 px-1.5 text-[10px] opacity-0 group-hover:opacity-100"
                          onClick={() => startEditingText(el)}
                        >
                          <Edit3 className="h-3 w-3 mr-0.5" />
                          Edit
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          }

          {/* Status indicator */}
          <div className="absolute bottom-3 left-3 px-2 py-1 bg-background/80 rounded text-xs text-muted-foreground backdrop-blur-sm flex items-center gap-2">
            <span>{Math.round(scale * 100)}%</span>
            <span className="text-muted-foreground/50">•</span>
            <span className="flex items-center gap-1">
              {showAnnotations ? (
                <><Eye className="h-3 w-3" /> Annotations visible</>
              ) : (
                <><EyeOff className="h-3 w-3" /> Annotations hidden</>
              )}
            </span>
          </div>
        </div>

        {/* Layer Panel */}
        {showLayerPanel && (
          <div className="w-48 border-l bg-muted/20">
            <div className="p-2 border-b flex items-center justify-between bg-muted/30">
              <h4 className="font-semibold text-xs uppercase tracking-wide text-muted-foreground">Default Layers</h4>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setShowLayerPanel(false)}>×</Button>
            </div>
            <div className="p-3 space-y-3">
              <p className="text-[10px] text-muted-foreground">Layers for new anatomy diagrams:</p>
              {(["skin", "muscular", "skeletal", "vascular", "nervous", "organs", "labels"] as AnatomyLayer[]).map(layer => (
                <div key={layer} className="flex items-center justify-between">
                  <Label className="text-xs capitalize">{layer}</Label>
                  <Switch
                    checked={visibleLayers.includes(layer)}
                    onCheckedChange={() => toggleLayer(layer)}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Version History Panel */}
        {showVersions && (
          <div className="w-52 border-l bg-muted/20">
            <div className="p-2 border-b flex items-center justify-between bg-muted/30">
              <h4 className="font-semibold text-xs uppercase tracking-wide text-muted-foreground">Versions</h4>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setShowVersions(false)}>×</Button>
            </div>
            <ScrollArea className="h-full">
              <div className="p-2 space-y-2">
                {drawings.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-6">No versions saved yet</p>
                ) : (
                  drawings.map((drawing) => (
                    <div
                      key={drawing.id}
                      className={cn(
                        "p-2 rounded-lg border cursor-pointer hover:bg-accent transition-colors",
                        currentDrawing?.id === drawing.id && "border-primary bg-primary/5"
                      )}
                      onClick={() => loadVersion(drawing.version)}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-xs">v{drawing.version}</span>
                        {drawing.is_current && <Badge variant="default" className="text-[10px] h-4">Current</Badge>}
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {format(new Date(drawing.created_at), "MMM d, yyyy HH:mm")}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        )}
      </div>
    </div>
  );
}
