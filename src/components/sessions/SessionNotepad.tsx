import React from "react";
import { DrawingPad } from "@/components/drawings/DrawingPad";

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
}: SessionNotepadProps) {
  return (
    <div className="rounded-lg border border-border bg-white shadow-sm flex flex-col h-full min-h-[500px]">
      <DrawingPad
        patientId={patientId}
        sessionId={sessionId}
        patientName={patientName}
        isModal={false}
      />
    </div>
  );
}
