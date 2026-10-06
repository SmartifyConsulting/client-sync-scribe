import React, { useRef, useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Palette,
  Download,
  Loader2,
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
  "#D1873C", "#3B82F6", "#8B5CF6", "#EC4899", "#6B7280"
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
  const [anatomyCategory, setAnatomyCategory] = useState("face");

  // Resize state
  const [resizing, setResizing] = useState<{ elementId: string; startX: number; startY: number; startW: number; startH: number } | null>(null);
  // Drag/move state for anatomy overlays
  const [draggingElement, setDraggingElement] = useState<{ elementId: string; startX: number; startY: number; elStartX: number; elStartY: number } | null>(null);
  // Track last mouse position for shapes
  const lastMousePos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

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
        // Text elements are rendered as overlays in React
      } else if (element.type === "anatomy") {
        // Anatomy elements are rendered as overlays in React
      } else if (element.type === "shape") {
        // Shape elements are rendered as overlays in React
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

  const getTouchCanvasCoords = (touch: React.Touch) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top,
    };
  };

  const [currentPath, setCurrentPath] = useState<{ x: number; y: number }[]>([]);
  const [shapeStart, setShapeStart] = useState<{ x: number; y: number } | null>(null);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoords(e);

    if (tool === "select") {
      setSelectedElement(null);
      return;
    }

    setIsDrawing(true);

    if (tool === "pen" || tool === "eraser") {
      setCurrentPath([coords]);
    } else if (tool === "text") {
      setTextPosition(coords);
    } else if (["line", "circle", "rectangle", "arrow"].includes(tool)) {
      setShapeStart(coords);
      lastMousePos.current = coords;
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const coords = getCanvasCoords(e);
    lastMousePos.current = coords;

    if (tool === "pen" || tool === "eraser") {
      setCurrentPath((prev) => [...prev, coords]);
      
      // Real-time drawing
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
    } else if (shapeStart && ["line", "circle", "rectangle", "arrow"].includes(tool)) {
      // Real-time shape preview
      renderCanvas();
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (ctx) {
        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = strokeWidth;
        ctx.setLineDash([5, 5]);

        if (tool === "line" || tool === "arrow") {
          ctx.beginPath();
          ctx.moveTo(shapeStart.x, shapeStart.y);
          ctx.lineTo(coords.x, coords.y);
          ctx.stroke();
          if (tool === "arrow") {
            const angle = Math.atan2(coords.y - shapeStart.y, coords.x - shapeStart.x);
            const headLen = 15;
            ctx.beginPath();
            ctx.moveTo(coords.x, coords.y);
            ctx.lineTo(coords.x - headLen * Math.cos(angle - Math.PI / 6), coords.y - headLen * Math.sin(angle - Math.PI / 6));
            ctx.moveTo(coords.x, coords.y);
            ctx.lineTo(coords.x - headLen * Math.cos(angle + Math.PI / 6), coords.y - headLen * Math.sin(angle + Math.PI / 6));
            ctx.stroke();
          }
        } else if (tool === "circle") {
          const radius = Math.sqrt(Math.pow(coords.x - shapeStart.x, 2) + Math.pow(coords.y - shapeStart.y, 2));
          ctx.beginPath();
          ctx.arc(shapeStart.x, shapeStart.y, radius, 0, 2 * Math.PI);
          ctx.stroke();
        } else if (tool === "rectangle") {
          ctx.beginPath();
          ctx.rect(shapeStart.x, shapeStart.y, coords.x - shapeStart.x, coords.y - shapeStart.y);
          ctx.stroke();
        }
        ctx.restore();
      }
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const coords = getCanvasCoords(e);

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
    } else if (shapeStart && ["line", "circle", "rectangle", "arrow"].includes(tool)) {
      const endX = coords.x;
      const endY = coords.y;
      // Only create if moved at least a few pixels
      const dist = Math.sqrt(Math.pow(endX - shapeStart.x, 2) + Math.pow(endY - shapeStart.y, 2));
      if (dist > 3) {
        const newElement: CanvasElement = {
          id: crypto.randomUUID(),
          type: "shape",
          data: { shapeType: tool, endX, endY },
          x: shapeStart.x,
          y: shapeStart.y,
          color,
          strokeWidth,
        };
        const newElements = [...elements, newElement];
        setElements(newElements);
        addToHistory(newElements);
      }
    }
    
    setCurrentPath([]);
    setShapeStart(null);
  };

  // Touch handlers for iPad drawing support
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 1) {
      e.preventDefault();
      const coords = getTouchCanvasCoords(e.touches[0]);
      setIsDrawing(true);
      if (tool === "pen" || tool === "eraser") {
        setCurrentPath([coords]);
      } else if (tool === "text") {
        setTextPosition(coords);
    } else if (["line", "circle", "rectangle", "arrow"].includes(tool)) {
        setShapeStart(coords);
        lastMousePos.current = coords;
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 1 && isDrawing) {
      e.preventDefault();
      const coords = getTouchCanvasCoords(e.touches[0]);
      lastMousePos.current = coords;

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
      } else if (shapeStart && ["line", "circle", "rectangle", "arrow"].includes(tool)) {
        renderCanvas();
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (ctx) {
          ctx.save();
          ctx.strokeStyle = color;
          ctx.lineWidth = strokeWidth;
          ctx.setLineDash([5, 5]);
          if (tool === "line" || tool === "arrow") {
            ctx.beginPath();
            ctx.moveTo(shapeStart.x, shapeStart.y);
            ctx.lineTo(coords.x, coords.y);
            ctx.stroke();
          } else if (tool === "circle") {
            const radius = Math.sqrt(Math.pow(coords.x - shapeStart.x, 2) + Math.pow(coords.y - shapeStart.y, 2));
            ctx.beginPath();
            ctx.arc(shapeStart.x, shapeStart.y, radius, 0, 2 * Math.PI);
            ctx.stroke();
          } else if (tool === "rectangle") {
            ctx.beginPath();
            ctx.rect(shapeStart.x, shapeStart.y, coords.x - shapeStart.x, coords.y - shapeStart.y);
            ctx.stroke();
          }
          ctx.restore();
        }
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const coords = lastMousePos.current;

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
    } else if (shapeStart && ["line", "circle", "rectangle", "arrow"].includes(tool)) {
      const dist = Math.sqrt(Math.pow(coords.x - shapeStart.x, 2) + Math.pow(coords.y - shapeStart.y, 2));
      if (dist > 3) {
        const newElement: CanvasElement = {
          id: crypto.randomUUID(),
          type: "shape",
          data: { shapeType: tool, endX: coords.x, endY: coords.y },
          x: shapeStart.x,
          y: shapeStart.y,
          color,
          strokeWidth,
        };
        const newElements = [...elements, newElement];
        setElements(newElements);
        addToHistory(newElements);
      }
    }

    setCurrentPath([]);
    setShapeStart(null);
  };

  // Resize handlers for overlays (anatomy, shapes, text)
  const handleResizeStart = (e: React.MouseEvent | React.TouchEvent, elementId: string) => {
    e.stopPropagation();
    e.preventDefault();
    const el = elements.find((el) => el.id === elementId);
    if (!el) return;

    let clientX: number, clientY: number;
    if ("touches" in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    // Compute initial width/height for shapes
    let startW = el.width || 120;
    let startH = el.height || 120;
    if (el.type === "shape") {
      const { shapeType, endX, endY } = el.data;
      if (shapeType === "circle") {
        const radius = Math.sqrt(Math.pow(endX - el.x, 2) + Math.pow(endY - el.y, 2));
        startW = radius * 2;
        startH = radius * 2;
      } else if (shapeType === "rectangle") {
        startW = Math.abs(endX - el.x);
        startH = Math.abs(endY - el.y);
      } else {
        startW = Math.abs(endX - el.x) + 8;
        startH = Math.abs(endY - el.y) + 8;
      }
    } else if (el.type === "text") {
      const fontSize = el.strokeWidth || 16;
      const text = el.data.text || "";
      startW = Math.max(text.length * fontSize * 0.6, 40);
      startH = fontSize * 1.4;
    }

    setResizing({
      elementId,
      startX: clientX,
      startY: clientY,
      startW,
      startH,
    });
  };

  useEffect(() => {
    if (!resizing) return;

    const handleMove = (e: MouseEvent | TouchEvent) => {
      let clientX: number, clientY: number;
      if ("touches" in e) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }

      const dx = clientX - resizing.startX;
      const dy = clientY - resizing.startY;
      // Maintain aspect ratio: use the larger delta
      const aspectRatio = resizing.startW / resizing.startH;
      const delta = Math.abs(dx) > Math.abs(dy) ? dx : dy * aspectRatio;
      const newW = Math.max(40, resizing.startW + delta);
      const newH = newW / aspectRatio;

      setElements((prev) =>
        prev.map((el) => {
          if (el.id !== resizing.elementId) return el;
          const updated = { ...el, width: newW, height: newH };
          // For shapes, scale endX/endY proportionally
          if (el.type === "shape") {
            const scale = newW / resizing.startW;
            const { shapeType, endX, endY } = el.data;
            if (shapeType === "circle") {
              const newRadius = newW / 2;
              updated.data = { ...el.data, endX: el.x + newRadius, endY: el.y };
            } else if (shapeType === "rectangle") {
              const dirX = endX >= el.x ? 1 : -1;
              const dirY = endY >= el.y ? 1 : -1;
              updated.data = { ...el.data, endX: el.x + dirX * newW, endY: el.y + dirY * newH };
            } else {
              // line / arrow
              const dx = endX - el.x;
              const dy = endY - el.y;
              updated.data = { ...el.data, endX: el.x + dx * scale, endY: el.y + dy * scale };
            }
          } else if (el.type === "text") {
            // Scale font size
            const origFontSize = el.strokeWidth || 16;
            const scale = newW / resizing.startW;
            updated.strokeWidth = Math.max(8, Math.round(origFontSize * scale));
          }
          return updated;
        })
      );
    };

    const handleEnd = () => {
      addToHistory(elements);
      setResizing(null);
    };

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleEnd);
    window.addEventListener("touchmove", handleMove);
    window.addEventListener("touchend", handleEnd);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleEnd);
      window.removeEventListener("touchmove", handleMove);
      window.removeEventListener("touchend", handleEnd);
    };
  }, [resizing, elements]);

  // Drag/move handlers for anatomy overlays
  const handleElementDragStart = (e: React.MouseEvent | React.TouchEvent, elementId: string) => {
    e.stopPropagation();
    e.preventDefault();
    const el = elements.find((el) => el.id === elementId);
    if (!el) return;

    let clientX: number, clientY: number;
    if ("touches" in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    setDraggingElement({
      elementId,
      startX: clientX,
      startY: clientY,
      elStartX: el.x,
      elStartY: el.y,
    });
  };

  useEffect(() => {
    if (!draggingElement) return;

    const handleMove = (e: MouseEvent | TouchEvent) => {
      let clientX: number, clientY: number;
      if ("touches" in e) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }

      const dx = clientX - draggingElement.startX;
      const dy = clientY - draggingElement.startY;

      setElements((prev) =>
        prev.map((el) => {
          if (el.id !== draggingElement.elementId) return el;
          const updated = { ...el, x: draggingElement.elStartX + dx, y: draggingElement.elStartY + dy };
          // For shapes, also move endX/endY
          if (el.type === "shape" && el.data.endX !== undefined && el.data.endY !== undefined) {
            const origDx = el.data.endX - el.x;
            const origDy = el.data.endY - el.y;
            updated.data = { ...el.data, endX: updated.x + origDx, endY: updated.y + origDy };
          }
          return updated;
        })
      );
    };

    const handleEnd = () => {
      addToHistory(elements);
      setDraggingElement(null);
    };

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleEnd);
    window.addEventListener("touchmove", handleMove);
    window.addEventListener("touchend", handleEnd);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleEnd);
      window.removeEventListener("touchmove", handleMove);
      window.removeEventListener("touchend", handleEnd);
    };
  }, [draggingElement, elements]);

  // Delete selected element with Delete/Backspace key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === "Delete" || e.key === "Backspace") && selectedElement && !textPosition) {
        e.preventDefault();
        const newElements = elements.filter((el) => el.id !== selectedElement);
        setElements(newElements);
        addToHistory(newElements);
        setSelectedElement(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedElement, elements, textPosition]);

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
  };

  const handleSave = async (createNewVersion = false) => {
    const canvasData: CanvasData = { elements };
    await saveDrawing(canvasData, createNewVersion);
  };

  const clearCanvas = () => {
    setElements([]);
    addToHistory([]);
  };

  const exportImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const link = document.createElement("a");
    link.download = `drawing-${patientName || "patient"}-${format(new Date(), "yyyy-MM-dd")}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col h-full", isModal && "max-h-[80vh]")}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 p-3 bg-muted/50 border-b">
        <div className="flex items-center gap-1 border-r pr-2">
          <Button
            variant={tool === "pen" ? "default" : "ghost"}
            size="icon"
            onClick={() => setTool("pen")}
            title="Pen"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant={tool === "eraser" ? "default" : "ghost"}
            size="icon"
            onClick={() => setTool("eraser")}
            title="Eraser"
          >
            <Eraser className="h-4 w-4" />
          </Button>
          <Button
            variant={tool === "text" ? "default" : "ghost"}
            size="icon"
            onClick={() => setTool("text")}
            title="Text"
          >
            <Type className="h-4 w-4" />
          </Button>
          <Button
            variant={tool === "select" ? "default" : "ghost"}
            size="icon"
            onClick={() => setTool("select")}
            title="Select/Move"
          >
            <Move className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-1 border-r pr-2">
          <Button
            variant={tool === "line" ? "default" : "ghost"}
            size="icon"
            onClick={() => setTool("line")}
            title="Line"
          >
            <Minus className="h-4 w-4" />
          </Button>
          <Button
            variant={tool === "arrow" ? "default" : "ghost"}
            size="icon"
            onClick={() => setTool("arrow")}
            title="Arrow"
          >
            <ArrowRight className="h-4 w-4" />
          </Button>
          <Button
            variant={tool === "circle" ? "default" : "ghost"}
            size="icon"
            onClick={() => setTool("circle")}
            title="Circle"
          >
            <Circle className="h-4 w-4" />
          </Button>
          <Button
            variant={tool === "rectangle" ? "default" : "ghost"}
            size="icon"
            onClick={() => setTool("rectangle")}
            title="Rectangle"
          >
            <Square className="h-4 w-4" />
          </Button>
        </div>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" title="Color">
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

        <div className="flex items-center gap-2 w-32">
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

        <div className="flex items-center gap-1 border-l pl-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={undo}
            disabled={historyIndex <= 0}
            title="Undo"
          >
            <Undo className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={redo}
            disabled={historyIndex >= history.length - 1}
            title="Redo"
          >
            <Redo className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-1 border-l pl-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={clearCanvas}
            title="Clear"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
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
            onClick={() => setShowVersions(!showVersions)}
          >
            <History className="h-4 w-4 mr-1" />
            Versions
            {drawings.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {drawings.length}
              </Badge>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleSave(false)}
            disabled={saving}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
            Save
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={() => handleSave(true)}
            disabled={saving}
          >
            Save New Version
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 min-h-0">
        {/* Anatomy panel */}
        <div className="w-48 border-r bg-muted/30 flex flex-col">
          <div className="p-2 border-b space-y-2">
            <h4 className="font-medium text-sm">Anatomy</h4>
            <Select defaultValue="face" onValueChange={(val) => setAnatomyCategory(val)}>
              <SelectTrigger className="w-full h-8 text-xs">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="face">Face</SelectItem>
                <SelectItem value="joints">Joints</SelectItem>
                <SelectItem value="systems">Systems</SelectItem>
                <SelectItem value="neuro">Neuro</SelectItem>
                <SelectItem value="plastic-surgery">Plastic Surgery</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-2">
              {anatomyAssets
                .filter((a) => a.category === anatomyCategory)
                .map((asset) => (
                  <div
                    key={asset.id}
                    className="p-2 bg-background rounded border cursor-grab hover:border-primary transition-colors"
                    draggable
                    onDragStart={() => handleDragStart(asset)}
                  >
                    <div className="h-16 flex items-center justify-center text-muted-foreground overflow-hidden">
                      {asset.imageSrc ? (
                        <img src={asset.imageSrc} alt={asset.name} className="h-full w-auto object-contain" />
                      ) : (
                        <asset.component />
                      )}
                    </div>
                    <p className="text-xs text-center mt-1">{asset.name}</p>
                  </div>
                ))}
            </div>
          </ScrollArea>
        </div>

        {/* Canvas area */}
        <div 
          ref={containerRef}
          className="flex-1 relative bg-background overflow-hidden"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
        >
          <canvas
            ref={canvasRef}
            className="absolute inset-0 bg-background touch-none"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={() => { if (isDrawing) { setIsDrawing(false); setCurrentPath([]); setShapeStart(null); } }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          />
          
          {/* Anatomy overlays with resize handles */}
          {elements
            .filter((el) => el.type === "anatomy")
            .map((el) => {
              const asset = anatomyAssets.find((a) => a.id === el.data.assetId);
              if (!asset) return null;
              return (
                <div
                  key={el.id}
                  className="absolute cursor-move text-muted-foreground group"
                  style={{
                    left: el.x,
                    top: el.y,
                    width: el.width,
                    height: el.height,
                  }}
                  onMouseDown={(e) => handleElementDragStart(e, el.id)}
                  onTouchStart={(e) => handleElementDragStart(e, el.id)}
                >
                  {asset.imageSrc ? (
                    <img src={asset.imageSrc} alt={asset.name} className="w-full h-full object-contain pointer-events-none" />
                  ) : (
                    <asset.component />
                  )}
                  {/* Selection border */}
                  <div className={cn(
                    "absolute inset-0 border-2 pointer-events-none transition-colors",
                    selectedElement === el.id ? "border-primary" : "border-transparent group-hover:border-primary/40"
                  )} />
                  {/* Corner resize handles - always visible when selected */}
                  {[
                    "top-0 left-0 cursor-nw-resize",
                    "top-0 right-0 cursor-ne-resize", 
                    "bottom-0 left-0 cursor-sw-resize",
                    "bottom-0 right-0 cursor-se-resize",
                  ].map((pos, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        "absolute w-3 h-3 bg-primary border border-primary-foreground rounded-sm touch-none",
                        pos,
                        selectedElement === el.id ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                      )}
                      style={{ transform: "translate(-50%, -50%)" }}
                      onMouseDown={(e) => handleResizeStart(e, el.id)}
                      onTouchStart={(e) => handleResizeStart(e, el.id)}
                    />
                  ))}
                </div>
              );
            })}

          {/* Shape overlays — rendered as DOM elements for interactivity */}
          {elements
            .filter((el) => el.type === "shape")
            .map((el) => {
              const { shapeType, endX, endY } = el.data;
              let left: number, top: number, width: number, height: number;
              const pad = 4;

              if (shapeType === "circle") {
                const radius = Math.sqrt(Math.pow(endX - el.x, 2) + Math.pow(endY - el.y, 2));
                left = el.x - radius;
                top = el.y - radius;
                width = radius * 2;
                height = radius * 2;
              } else if (shapeType === "rectangle") {
                left = Math.min(el.x, endX);
                top = Math.min(el.y, endY);
                width = Math.abs(endX - el.x);
                height = Math.abs(endY - el.y);
              } else {
                // line / arrow
                left = Math.min(el.x, endX) - pad;
                top = Math.min(el.y, endY) - pad;
                width = Math.abs(endX - el.x) + pad * 2;
                height = Math.abs(endY - el.y) + pad * 2;
              }

              // Ensure minimum dimensions
              width = Math.max(width, 10);
              height = Math.max(height, 10);

              const svgContent = (() => {
                const sw = el.strokeWidth || 2;
                const c = el.color || "#000000";
                if (shapeType === "circle") {
                  const r = width / 2;
                  return (
                    <svg width={width} height={height} className="pointer-events-none">
                      <ellipse cx={r} cy={r} rx={r - sw / 2} ry={height / 2 - sw / 2} fill="none" stroke={c} strokeWidth={sw} />
                    </svg>
                  );
                } else if (shapeType === "rectangle") {
                  return (
                    <svg width={width} height={height} className="pointer-events-none">
                      <rect x={sw / 2} y={sw / 2} width={Math.max(0, width - sw)} height={Math.max(0, height - sw)} fill="none" stroke={c} strokeWidth={sw} />
                    </svg>
                  );
                } else {
                  // line / arrow
                  const x1 = el.x - left;
                  const y1 = el.y - top;
                  const x2 = endX - left;
                  const y2 = endY - top;
                  return (
                    <svg width={width} height={height} className="pointer-events-none">
                      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={c} strokeWidth={sw} />
                      {shapeType === "arrow" && (() => {
                        const angle = Math.atan2(y2 - y1, x2 - x1);
                        const headLen = 15;
                        const ax1 = x2 - headLen * Math.cos(angle - Math.PI / 6);
                        const ay1 = y2 - headLen * Math.sin(angle - Math.PI / 6);
                        const ax2 = x2 - headLen * Math.cos(angle + Math.PI / 6);
                        const ay2 = y2 - headLen * Math.sin(angle + Math.PI / 6);
                        return (
                          <>
                            <line x1={x2} y1={y2} x2={ax1} y2={ay1} stroke={c} strokeWidth={sw} />
                            <line x1={x2} y1={y2} x2={ax2} y2={ay2} stroke={c} strokeWidth={sw} />
                          </>
                        );
                      })()}
                    </svg>
                  );
                }
              })();

              return (
                <div
                  key={el.id}
                  className="absolute cursor-move group"
                  style={{ left, top, width, height }}
                  onClick={(e) => { e.stopPropagation(); setSelectedElement(el.id); }}
                  onMouseDown={(e) => { setSelectedElement(el.id); handleElementDragStart(e, el.id); }}
                  onTouchStart={(e) => { setSelectedElement(el.id); handleElementDragStart(e, el.id); }}
                >
                  {svgContent}
                  {/* Selection border */}
                  <div className={cn(
                    "absolute inset-0 border-2 pointer-events-none transition-colors",
                    selectedElement === el.id ? "border-primary" : "border-transparent group-hover:border-primary/40"
                  )} />
                  {/* Corner resize handles */}
                  {["top-0 left-0 cursor-nw-resize", "top-0 right-0 cursor-ne-resize", "bottom-0 left-0 cursor-sw-resize", "bottom-0 right-0 cursor-se-resize"].map((pos, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        "absolute w-3 h-3 bg-primary border border-primary-foreground rounded-sm touch-none",
                        pos,
                        selectedElement === el.id ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                      )}
                      style={{ transform: "translate(-50%, -50%)" }}
                      onMouseDown={(e) => handleResizeStart(e, el.id)}
                      onTouchStart={(e) => handleResizeStart(e, el.id)}
                    />
                  ))}
                </div>
              );
            })}

          {/* Text overlays — rendered as DOM elements for interactivity */}
          {elements
            .filter((el) => el.type === "text")
            .map((el) => {
              const fontSize = el.strokeWidth || 16;
              const text = el.data.text || "";
              // Approximate width/height
              const approxWidth = Math.max(text.length * fontSize * 0.6, 40);
              const approxHeight = fontSize * 1.4;

              return (
                <div
                  key={el.id}
                  className="absolute cursor-move group"
                  style={{
                    left: el.x,
                    top: el.y - fontSize,
                    minWidth: approxWidth,
                    minHeight: approxHeight,
                  }}
                  onClick={(e) => { e.stopPropagation(); setSelectedElement(el.id); }}
                  onMouseDown={(e) => { setSelectedElement(el.id); handleElementDragStart(e, el.id); }}
                  onTouchStart={(e) => { setSelectedElement(el.id); handleElementDragStart(e, el.id); }}
                >
                  <span
                    className="pointer-events-none select-none whitespace-nowrap"
                    style={{
                      color: el.color || "#000000",
                      fontSize: `${fontSize}px`,
                      fontFamily: "sans-serif",
                    }}
                  >
                    {text}
                  </span>
                  {/* Selection border */}
                  <div className={cn(
                    "absolute inset-0 border-2 pointer-events-none transition-colors",
                    selectedElement === el.id ? "border-primary" : "border-transparent group-hover:border-primary/40"
                  )} />
                  {/* Corner resize handles */}
                  {["top-0 left-0 cursor-nw-resize", "top-0 right-0 cursor-ne-resize", "bottom-0 left-0 cursor-sw-resize", "bottom-0 right-0 cursor-se-resize"].map((pos, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        "absolute w-3 h-3 bg-primary border border-primary-foreground rounded-sm touch-none",
                        pos,
                        selectedElement === el.id ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                      )}
                      style={{ transform: "translate(-50%, -50%)" }}
                      onMouseDown={(e) => handleResizeStart(e, el.id)}
                      onTouchStart={(e) => handleResizeStart(e, el.id)}
                    />
                  ))}
                </div>
              );
            })}

          {/* Text input popover */}
          {textPosition && (
            <div
              className="absolute bg-background border rounded-lg shadow-lg p-2"
              style={{ left: textPosition.x, top: textPosition.y }}
            >
              <input
                type="text"
                className="border rounded px-2 py-1 text-sm w-40"
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
          <div className="w-56 border-l bg-muted/30">
            <div className="p-2 border-b flex items-center justify-between">
              <h4 className="font-medium text-sm">Version History</h4>
              <Button
                variant="ghost"
                size="sm"
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
                        <span className="font-medium text-sm">
                          Version {drawing.version}
                        </span>
                        {drawing.is_current && (
                          <Badge variant="default" className="text-xs">
                            Current
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
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
