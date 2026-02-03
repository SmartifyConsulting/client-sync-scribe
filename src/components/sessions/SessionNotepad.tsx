import React, { useState } from "react";
import { FileText, PenTool } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Toggle } from "@/components/ui/toggle";
import { DrawingPad } from "@/components/drawings/DrawingPad";
import { cn } from "@/lib/utils";

interface SessionNotepadProps {
  patientId: string;
  sessionId?: string | null;
  patientName?: string;
  notes: string;
  onNotesChange: (notes: string) => void;
  isRecording?: boolean;
}

export function SessionNotepad({
  patientId,
  sessionId,
  patientName,
  notes,
  onNotesChange,
  isRecording = false,
}: SessionNotepadProps) {
  const [mode, setMode] = useState<"text" | "drawing">("text");

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm flex flex-col h-full">
      {/* Header with mode toggle */}
      <div className="flex items-center justify-between p-3 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground">Session Notes</h3>
          {isRecording && (
            <span className="text-xs bg-destructive/15 text-destructive px-2 py-0.5 rounded-full animate-pulse">
              Recording
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
          <Toggle
            pressed={mode === "text"}
            onPressedChange={() => setMode("text")}
            size="sm"
            className={cn(
              "h-8 px-3 gap-1.5 data-[state=on]:bg-background data-[state=on]:shadow-sm",
              mode === "text" && "text-foreground"
            )}
          >
            <FileText className="h-3.5 w-3.5" />
            <span className="text-xs">Type</span>
          </Toggle>
          <Toggle
            pressed={mode === "drawing"}
            onPressedChange={() => setMode("drawing")}
            size="sm"
            className={cn(
              "h-8 px-3 gap-1.5 data-[state=on]:bg-background data-[state=on]:shadow-sm",
              mode === "drawing" && "text-foreground"
            )}
          >
            <PenTool className="h-3.5 w-3.5" />
            <span className="text-xs">Draw</span>
          </Toggle>
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 min-h-0">
        {mode === "text" ? (
          <div className="p-3 h-full">
            <Textarea
              placeholder="Type your clinical notes here..."
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
              className="min-h-full h-full resize-none border-0 focus-visible:ring-0 p-0"
            />
          </div>
        ) : (
          <div className="h-full">
            <DrawingPad
              patientId={patientId}
              sessionId={sessionId}
              patientName={patientName}
              isModal={false}
            />
          </div>
        )}
      </div>
    </div>
  );
}
