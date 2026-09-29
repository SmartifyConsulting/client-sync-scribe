import React, { useState, type ReactNode } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Pencil, Check } from "lucide-react";

interface SessionNotepadProps {
  patientId: string;
  sessionId?: string | null;
  patientName?: string;
  notes: string;
  onNotesChange: (notes: string) => void;
  isRecording?: boolean;
  /** Banner rendered at the top of the frame (disclaimer). */
  disclaimer?: ReactNode;
}

export function SessionNotepad({
  notes,
  onNotesChange,
  isRecording = false,
  disclaimer,
}: SessionNotepadProps) {
  const [editing, setEditing] = useState(false);
  const lines = notes.split("\n").filter((l) => l.trim());
  const showColumns = !editing && lines.length > 0;

  return (
    <div className="rounded-xl border border-primary bg-card shadow-sm flex flex-col">
      <div className="flex items-center justify-between p-3 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground">AI Wealth Manager Notes</h3>
          {isRecording && (
            <span className="text-xs bg-destructive/15 text-destructive px-2 py-0.5 rounded-full animate-pulse">
              Recording
            </span>
          )}
        </div>
        {lines.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 text-xs"
            onClick={() => setEditing((e) => !e)}
          >
            {editing ? <Check className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}
            {editing ? "Done" : "Edit"}
          </Button>
        )}
      </div>

      {disclaimer && (
        <div className="border-b bg-muted/20 px-3 py-2">{disclaimer}</div>
      )}

      <div className="p-3">
        {showColumns ? (
          <div className="columns-1 md:columns-2 xl:columns-4 gap-4 [column-fill:balance]">
            {lines.map((line, i) => {
              const match = line.match(/^([^:]{2,30}):\s*(.+)$/);
              if (match) {
                const [, heading, content] = match;
                return (
                  <div key={i} className="mb-2 break-inside-avoid">
                    <p className="font-semibold text-foreground text-sm mt-3 mb-1">{heading}</p>
                    <p className="text-sm text-foreground leading-relaxed mb-2">{content}</p>
                  </div>
                );
              }
              return (
                <p
                  key={i}
                  className="mb-2 break-inside-avoid text-sm text-foreground leading-relaxed"
                >
                  {line}
                </p>
              );
            })}
          </div>
        ) : (
          <Textarea
            placeholder="AI-generated advice notes will appear here as the consultation is recorded — you can also type or edit freely..."
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
            className="min-h-[220px] resize-y border-0 focus-visible:ring-0 p-2 text-sm"
          />
        )}
      </div>
    </div>
  );
}
