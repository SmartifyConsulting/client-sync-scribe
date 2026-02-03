import React, { useRef, useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
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
  X,
} from "lucide-react";
import { anatomyAssets, AnatomyAsset } from "./AnatomyAssets";
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

type Tool = "pen" | "eraser" | "text" | "select" | "line" | "circle" | "rectangle" | "arrow";

const COLORS = [
  "#000000", "#EF4444", "#F97316", "#EAB308", "#22C55E", 
  "#14B8A6", "#3B82F6", "#8B5CF6", "#EC4899", "#6B7280"
];

export function DrawingPad({ patientId, sessionId, patientName, onClose, isModal = false }: DrawingPadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState("#000000");
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [isDrawing, setIsDrawing] = useState(false);
  const [elements, setElements] = useState<CanvasElement[]>([]);
  const [history, setHistory] = useState<CanvasElement[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [draggedAnatomy, setDraggedAnatomy] = useState<AnatomyAsset | null>(null);
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

  // Render elements to canvas
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Render each element
    elements.forEach((element) => {
      ctx.save();
      
      if (element.type === "path") {
        ctx.strokeStyle = element.color || "#000000";
        ctx.lineWidth = element.strokeWidth || 2;
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
        ctx.font = `${element.strokeWidth || 16}px sans-serif`;
        ctx.fillText(element.data.text, element.x, element.y);
      } else if (element.type === "anatomy") {
        // Anatomy elements are rendered as overlays in React
      } else if (element.type === "shape") {
        ctx.strokeStyle = element.color || "#000000";
        ctx.lineWidth = element.strokeWidth || 2;
        
        if (element.data.shapeType === "line" || element.data.shapeType === "arrow") {
          ctx.beginPath();
          ctx.moveTo(element.x, element.y);
          ctx.lineTo(element.data.endX, element.data.endY);
          ctx.stroke();
          
          if (element.data.shapeType === "arrow") {
            const angle = Math.atan2(element.data.endY - element.y, element.data.endX - element.x);
            const headLen = 15;
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
  }, [elements]);

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
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const [currentPath, setCurrentPath] = useState<{ x: number; y: number }[]>([]);
  const [shapeStart, setShapeStart] = useState<{ x: number; y: number } | null>(null);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoords(e);
    setIsDrawing(true);

    if (tool === "pen" || tool === "eraser") {
      setCurrentPath([coords]);
    } else if (tool === "text") {
      setTextPosition(coords);
    } else if (["line", "circle", "rectangle", "arrow"].includes(tool)) {
      setShapeStart(coords);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const coords = getCanvasCoords(e);

    if (tool === "pen" || tool === "eraser") {
      setCurrentPath((prev) => [...prev, coords]);
      
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (ctx && currentPath.length > 0) {
        ctx.strokeStyle = tool === "eraser" ? "#ffffff" : color;
        ctx.lineWidth = tool === "eraser" ? strokeWidth * 3 : strokeWidth;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(currentPath[currentPath.length - 1].x, currentPath[currentPath.length - 1].y);
        ctx.lineTo(coords.x, coords.y);
        ctx.stroke();
      }
    }
  };

  const handleMouseUp = () => {
    if (!isDrawing) return;
    setIsDrawing(false);

    if ((tool === "pen" || tool === "eraser") && currentPath.length > 1) {
      const newElement: CanvasElement = {
        id: crypto.randomUUID(),
        type: "path",
        data: { points: currentPath },
        x: 0,
        y: 0,
        color: tool === "eraser" ? "#ffffff" : color,
        strokeWidth: tool === "eraser" ? strokeWidth * 3 : strokeWidth,
      };
      const newElements = [...elements, newElement];
      setElements(newElements);
      addToHistory(newElements);
    }
    
    setCurrentPath([]);
    setShapeStart(null);
  };

  const handleAddText = () => {
    if (!textInput || !textPosition) return;
    
    const newElement: CanvasElement = {
      id: crypto.randomUUID(),
      type: "text",
      data: { text: textInput },
      x: textPosition.x,
      y: textPosition.y,
      color,
      strokeWidth: 16,
    };
    const newElements = [...elements, newElement];
    setElements(newElements);
    addToHistory(newElements);
    setTextInput("");
    setTextPosition(null);
    setTool("pen");
  };

  const handleDragStart = (asset: AnatomyAsset) => {
    setDraggedAnatomy(asset);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!draggedAnatomy || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - draggedAnatomy.width / 2;
    const y = e.clientY - rect.top - draggedAnatomy.height / 2;

    const newElement: CanvasElement = {
      id: crypto.randomUUID(),
      type: "anatomy",
      data: { assetId: draggedAnatomy.id },
      x,
      y,
      width: draggedAnatomy.width,
      height: draggedAnatomy.height,
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

  const exportImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const link = document.createElement("a");
    link.download = `drawing-${patientName || "patient"}-${format(new Date(), "yyyy-MM-dd")}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  // Element manipulation functions
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
    const newX = e.clientX - rect.left - dragOffset.x;
    const newY = e.clientY - rect.top - dragOffset.y;
    
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

  // Resize functions
  const handleResizeStart = (e: React.MouseEvent, corner: string) => {
    e.stopPropagation();
    setIsResizing(true);
    setResizeCorner(corner);
  };

  const handleResize = (e: React.MouseEvent) => {
    if (!isResizing || !selectedElement || !containerRef.current || !resizeCorner) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    setElements(prev => prev.map(el => {
      if (el.id !== selectedElement) return el;
      
      let newWidth = el.width || 100;
      let newHeight = el.height || 100;
      let newX = el.x;
      let newY = el.y;
      
      if (resizeCorner.includes("e")) {
        newWidth = Math.max(40, mouseX - el.x);
      }
      if (resizeCorner.includes("w")) {
        const widthDiff = el.x - mouseX;
        newWidth = Math.max(40, (el.width || 100) + widthDiff);
        newX = mouseX;
      }
      if (resizeCorner.includes("s")) {
        newHeight = Math.max(40, mouseY - el.y);
      }
      if (resizeCorner.includes("n")) {
        const heightDiff = el.y - mouseY;
        newHeight = Math.max(40, (el.height || 100) + heightDiff);
        newY = mouseY;
      }
      
      return { ...el, x: newX, y: newY, width: newWidth, height: newHeight };
    }));
  };

  // Scale element
  const scaleElement = (scale: number) => {
    if (!selectedElement) return;
    
    setElements(prev => prev.map(el => {
      if (el.id !== selectedElement) return el;
      return {
        ...el,
        width: (el.width || 100) * scale,
        height: (el.height || 100) * scale
      };
    }));
    addToHistory(elements);
  };

  // Delete selected element
  const deleteSelectedElement = () => {
    if (!selectedElement) return;
    const newElements = elements.filter(el => el.id !== selectedElement);
    setElements(newElements);
    addToHistory(newElements);
    setSelectedElement(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const selectedEl = elements.find(el => el.id === selectedElement);

  return (
    <div 
      className={cn("flex flex-col h-full", isModal && "max-h-[80vh]")}
      onMouseMove={(e) => {
        if (isDraggingElement) handleElementMouseMove(e);
        if (isResizing) handleResize(e);
      }}
      onMouseUp={handleElementMouseUp}
      onMouseLeave={handleElementMouseUp}
    >
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 p-2 bg-muted/50 border-b">
        <div className="flex items-center gap-0.5 border-r pr-2">
          <Button
            variant={tool === "pen" ? "default" : "ghost"}
            size="icon"
            className="h-8 w-8"
            onClick={() => setTool("pen")}
            title="Pen"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant={tool === "eraser" ? "default" : "ghost"}
            size="icon"
            className="h-8 w-8"
            onClick={() => setTool("eraser")}
            title="Eraser"
          >
            <Eraser className="h-4 w-4" />
          </Button>
          <Button
            variant={tool === "text" ? "default" : "ghost"}
            size="icon"
            className="h-8 w-8"
            onClick={() => setTool("text")}
            title="Text"
          >
            <Type className="h-4 w-4" />
          </Button>
          <Button
            variant={tool === "select" ? "default" : "ghost"}
            size="icon"
            className="h-8 w-8"
            onClick={() => setTool("select")}
            title="Select/Move"
          >
            <Move className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-0.5 border-r pr-2">
          <Button
            variant={tool === "line" ? "default" : "ghost"}
            size="icon"
            className="h-8 w-8"
            onClick={() => setTool("line")}
            title="Line"
          >
            <Minus className="h-4 w-4" />
          </Button>
          <Button
            variant={tool === "arrow" ? "default" : "ghost"}
            size="icon"
            className="h-8 w-8"
            onClick={() => setTool("arrow")}
            title="Arrow"
          >
            <ArrowRight className="h-4 w-4" />
          </Button>
          <Button
            variant={tool === "circle" ? "default" : "ghost"}
            size="icon"
            className="h-8 w-8"
            onClick={() => setTool("circle")}
            title="Circle"
          >
            <Circle className="h-4 w-4" />
          </Button>
          <Button
            variant={tool === "rectangle" ? "default" : "ghost"}
            size="icon"
            className="h-8 w-8"
            onClick={() => setTool("rectangle")}
            title="Rectangle"
          >
            <Square className="h-4 w-4" />
          </Button>
        </div>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" title="Color">
              <div 
                className="h-5 w-5 rounded border"
                style={{ backgroundColor: color }}
              />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2">
            <div className="grid grid-cols-5 gap-1">
              {COLORS.map((c) => (
                <button
                  key={c}
                  className={cn(
                    "h-6 w-6 rounded border-2",
                    color === c ? "border-primary" : "border-transparent"
                  )}
                  style={{ backgroundColor: c }}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
          </PopoverContent>
        </Popover>

        <div className="flex items-center gap-2 w-24">
          <span className="text-xs text-muted-foreground">Size:</span>
          <Slider
            value={[strokeWidth]}
            onValueChange={(v) => setStrokeWidth(v[0])}
            min={1}
            max={20}
            step={1}
            className="flex-1"
          />
        </div>

        <div className="flex items-center gap-0.5 border-l pl-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={undo}
            disabled={historyIndex <= 0}
            title="Undo"
          >
            <Undo className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={redo}
            disabled={historyIndex >= history.length - 1}
            title="Redo"
          >
            <Redo className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-0.5 border-l pl-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={clearCanvas}
            title="Clear"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={exportImage}
            title="Export"
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-1 ml-auto">
          <Button
            variant="ghost"
            size="sm"
            className="h-8"
            onClick={() => setShowVersions(!showVersions)}
          >
            <History className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">Versions</span>
            {drawings.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5">
                {drawings.length}
              </Badge>
            )}
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

      {/* Selected element controls */}
      {selectedElement && selectedEl?.type === "anatomy" && (
        <div className="flex items-center gap-2 px-3 py-2 bg-primary/5 border-b">
          <span className="text-sm font-medium">Selected: {anatomyAssets.find(a => a.id === selectedEl.data.assetId)?.name}</span>
          <div className="flex items-center gap-1 ml-auto">
            <Button
              variant="outline"
              size="sm"
              className="h-7"
              onClick={() => scaleElement(0.9)}
              title="Shrink"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7"
              onClick={() => scaleElement(1.1)}
              title="Enlarge"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7"
              onClick={() => {
                setElements(prev => prev.map(el => 
                  el.id === selectedElement 
                    ? { ...el, data: { ...el.data, rotation: ((el.data.rotation || 0) + 90) % 360 } }
                    : el
                ));
                addToHistory(elements);
              }}
              title="Rotate 90°"
            >
              <RotateCw className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="h-7"
              onClick={deleteSelectedElement}
              title="Delete"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-1 min-h-0">
        {/* Anatomy panel */}
        <div className="w-44 border-r bg-muted/30 flex flex-col">
          <div className="p-2 border-b">
            <h4 className="font-medium text-xs">Anatomy Diagrams</h4>
          </div>
          <Tabs defaultValue="body" className="flex-1 flex flex-col">
            <TabsList className="grid grid-cols-3 m-1 h-7">
              <TabsTrigger value="body" className="text-[10px] px-1 h-6">Body</TabsTrigger>
              <TabsTrigger value="spine" className="text-[10px] px-1 h-6">Spine</TabsTrigger>
              <TabsTrigger value="face" className="text-[10px] px-1 h-6">Face</TabsTrigger>
            </TabsList>
            <TabsList className="grid grid-cols-3 mx-1 mb-1 h-7">
              <TabsTrigger value="joints" className="text-[10px] px-1 h-6">Joints</TabsTrigger>
              <TabsTrigger value="cosmetic" className="text-[10px] px-1 h-6">Cosmetic</TabsTrigger>
              <TabsTrigger value="dental" className="text-[10px] px-1 h-6">Dental</TabsTrigger>
            </TabsList>
            {["body", "spine", "face", "joints", "cosmetic", "dental"].map((category) => (
              <TabsContent key={category} value={category} className="flex-1 m-0">
                <ScrollArea className="h-full">
                  <div className="p-2 space-y-2">
                    {anatomyAssets
                      .filter((a) => a.category === category)
                      .map((asset) => (
                        <div
                          key={asset.id}
                          className="p-2 bg-background rounded border cursor-grab hover:border-primary hover:shadow-sm transition-all"
                          draggable
                          onDragStart={() => handleDragStart(asset)}
                        >
                          <div className="h-14 flex items-center justify-center text-foreground">
                            <asset.component />
                          </div>
                          <p className="text-[10px] text-center mt-1 font-medium">{asset.name}</p>
                        </div>
                      ))}
                  </div>
                </ScrollArea>
              </TabsContent>
            ))}
          </Tabs>
        </div>

        {/* Canvas area */}
        <div 
          ref={containerRef}
          className="flex-1 relative bg-background overflow-hidden"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => tool !== "select" && setSelectedElement(null)}
        >
          <canvas
            ref={canvasRef}
            className="absolute inset-0 bg-background"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          />
          
          {/* Anatomy overlays */}
          {elements
            .filter((el) => el.type === "anatomy")
            .map((el) => {
              const asset = anatomyAssets.find((a) => a.id === el.data.assetId);
              if (!asset) return null;
              const isSelected = selectedElement === el.id;
              return (
                <div
                  key={el.id}
                  className={cn(
                    "absolute cursor-move text-foreground transition-shadow",
                    isSelected && "ring-2 ring-primary ring-offset-2 shadow-lg"
                  )}
                  style={{
                    left: el.x,
                    top: el.y,
                    width: el.width,
                    height: el.height,
                    transform: el.data.rotation ? `rotate(${el.data.rotation}deg)` : undefined,
                  }}
                  onMouseDown={(e) => handleElementMouseDown(e, el.id)}
                >
                  <asset.component />
                  
                  {/* Resize handles */}
                  {isSelected && (
                    <>
                      {/* Corner handles */}
                      <div
                        className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-primary rounded-full cursor-nw-resize border-2 border-background"
                        onMouseDown={(e) => handleResizeStart(e, "nw")}
                      />
                      <div
                        className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-primary rounded-full cursor-ne-resize border-2 border-background"
                        onMouseDown={(e) => handleResizeStart(e, "ne")}
                      />
                      <div
                        className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-primary rounded-full cursor-sw-resize border-2 border-background"
                        onMouseDown={(e) => handleResizeStart(e, "sw")}
                      />
                      <div
                        className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-primary rounded-full cursor-se-resize border-2 border-background"
                        onMouseDown={(e) => handleResizeStart(e, "se")}
                      />
                      {/* Edge handles */}
                      <div
                        className="absolute -top-1 left-1/2 -translate-x-1/2 w-6 h-2 bg-primary/50 rounded cursor-n-resize"
                        onMouseDown={(e) => handleResizeStart(e, "n")}
                      />
                      <div
                        className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-6 h-2 bg-primary/50 rounded cursor-s-resize"
                        onMouseDown={(e) => handleResizeStart(e, "s")}
                      />
                      <div
                        className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-6 bg-primary/50 rounded cursor-w-resize"
                        onMouseDown={(e) => handleResizeStart(e, "w")}
                      />
                      <div
                        className="absolute top-1/2 -right-1 -translate-y-1/2 w-2 h-6 bg-primary/50 rounded cursor-e-resize"
                        onMouseDown={(e) => handleResizeStart(e, "e")}
                      />
                    </>
                  )}
                </div>
              );
            })}

          {/* Text input popover */}
          {textPosition && (
            <div
              className="absolute bg-background border rounded-lg shadow-lg p-2 z-10"
              style={{ left: textPosition.x, top: textPosition.y }}
            >
              <input
                type="text"
                className="border rounded px-2 py-1 text-sm w-40 bg-background"
                placeholder="Enter text..."
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddText();
                  if (e.key === "Escape") {
                    setTextPosition(null);
                    setTextInput("");
                  }
                }}
              />
              <div className="flex gap-1 mt-1">
                <Button size="sm" variant="default" onClick={handleAddText}>
                  Add
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={() => {
                    setTextPosition(null);
                    setTextInput("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Version history panel */}
        {showVersions && (
          <div className="w-48 border-l bg-muted/30">
            <div className="p-2 border-b flex items-center justify-between">
              <h4 className="font-medium text-xs">Version History</h4>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => setShowVersions(false)}
              >
                ×
              </Button>
            </div>
            <ScrollArea className="h-full">
              <div className="p-2 space-y-2">
                {drawings.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    No versions saved yet
                  </p>
                ) : (
                  drawings.map((drawing) => (
                    <div
                      key={drawing.id}
                      className={cn(
                        "p-2 rounded border cursor-pointer hover:bg-accent transition-colors",
                        currentDrawing?.id === drawing.id && "border-primary bg-primary/5"
                      )}
                      onClick={() => loadVersion(drawing.version)}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-xs">
                          Version {drawing.version}
                        </span>
                        {drawing.is_current && (
                          <Badge variant="default" className="text-[10px] h-4">
                            Current
                          </Badge>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {format(new Date(drawing.created_at), "MMM d, yyyy h:mm a")}
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
