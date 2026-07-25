import React from "react";
import { Textarea } from "@/components/ui/textarea";

interface SessionNotepadProps {
  patientId: string;
  sessionId?: string | null;
  patientName?: string;
  notes: string;
  onNotesChange: (notes: string) => void;
  isRecording?: boolean;
}

export function SessionNotepad({
  notes,
  onNotesChange,
  isRecording = false,
}: SessionNotepadProps) {
  return (
    <div className="rounded-xl border border-primary bg-card shadow-sm flex flex-col h-full">
      <div className="flex items-center justify-between p-3 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground">Session Notes</h3>
          {isRecording && (
            <span className="text-sm bg-destructive/15 text-destructive px-2 py-0.5 rounded-full animate-pulse">
              Recording
            </span>
          )}
        </div>
      </div>
      <div className="flex-1 min-h-0">
        <div className="p-3 h-full">
          <Textarea
            placeholder="Type your notes here during the session. Voice transcriptions will be appended automatically..."
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
            className="min-h-full h-full resize-none border-0 focus-visible:ring-0 p-2"
          />
        </div>
      </div>
    </div>
  );
}

