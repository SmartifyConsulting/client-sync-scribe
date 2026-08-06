import { useState } from "react";
import { ChevronDown, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  transcript: string;
  doctorName?: string;
}

/**
 * Collapsed-by-default "Session Transcript" accordion. The transcript is never
 * streamed live on screen — it only appears here once transcription finishes.
 */
export function SessionTranscriptAccordion({ transcript, doctorName }: Props) {
  const [open, setOpen] = useState(false);
  if (!transcript) return null;

  const lines = transcript.split("\n").filter((l) => l.trim());

  return (
    <div className="border-t">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-1.5 px-3 py-2 text-left hover:bg-muted/40 transition-colors"
      >
        <FileText className="h-3.5 w-3.5 text-primary" />
        <span className="text-sm font-medium text-foreground">Session Transcript</span>
        <ChevronDown
          className={cn("ml-auto h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")}
        />
      </button>
      {open && (
        <div className="max-h-[260px] overflow-y-auto bg-muted/30 px-3 py-2 space-y-2">
          {lines.map((line, index) => {
            const colonIndex = line.indexOf(":");
            if (colonIndex > 0 && colonIndex < 50) {
              const speaker = line.substring(0, colonIndex);
              const text = line.substring(colonIndex + 1);
              const speakerLower = speaker.toLowerCase().trim();
              const isDoctor =
                speakerLower.includes("dr") ||
                speakerLower.includes("doctor") ||
                (doctorName && speakerLower.includes(doctorName.toLowerCase()));
              return (
                <p
                  key={index}
                  className={cn("text-sm leading-relaxed", isDoctor ? "text-primary" : "text-foreground")}
                >
                  <span className="font-bold">{speaker}</span>:{text}
                </p>
              );
            }
            return (
              <p key={index} className="text-sm text-foreground leading-relaxed">
                {line}
              </p>
            );
          })}
        </div>
      )}
    </div>
  );
}
