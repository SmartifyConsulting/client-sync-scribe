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
    <div className="rounded-xl border border-primary bg-card shadow-sm flex flex-col">
      <div className="flex items-center justify-between p-3 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground">AI Clinician Notes</h3>
          {isRecording && (
            <span className="text-xs bg-destructive/15 text-destructive px-2 py-0.5 rounded-full animate-pulse">
              Recording
            </span>
          )}
        </div>
      </div>
      <div className="p-3">
        <Textarea
          placeholder="AI-generated clinical notes will appear here as the session is recorded — you can also type or edit freely..."
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          className="min-h-[260px] resize-y border-0 focus-visible:ring-0 p-2"
        />
      </div>
    </div>
  );
}
