import { FileText } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  transcript: string;
  advisorName?: string;
}

/**
 * Session Transcript document — always visible, not collapsible. The
 * transcript is never streamed live on screen; it only appears here once
 * transcription finishes.
 */
export function SessionTranscriptAccordion({ transcript, advisorName }: Props) {
  if (!transcript) return null;

  const lines = transcript.split("\n").filter((l) => l.trim());

  return (
    <div className="rounded-xl border border-primary bg-card overflow-hidden">
      <div className="flex items-center gap-1.5 border-b bg-muted/30 px-3 py-2">
        <FileText className="h-3.5 w-3.5 text-primary" />
        <span className="text-sm font-medium text-foreground">Consultation Transcript</span>
      </div>
      <div className="max-h-[260px] overflow-y-auto px-3 py-2 space-y-2">
        {lines.map((line, index) => {
          const colonIndex = line.indexOf(":");
          if (colonIndex > 0 && colonIndex < 50) {
            const speaker = line.substring(0, colonIndex);
            const text = line.substring(colonIndex + 1);
            const speakerLower = speaker.toLowerCase().trim();
            const isAdvisor =
              speakerLower.includes("dr") ||
              speakerLower.includes("doctor") ||
              (advisorName && speakerLower.includes(advisorName.toLowerCase()));
            return (
              <p
                key={index}
                className={cn("text-sm leading-relaxed", isAdvisor ? "text-primary" : "text-foreground")}
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
    </div>
  );
}
