import { useState } from "react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import {
  Clock,
  CheckCircle,
  Mic,
  Sparkles,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { Session } from "@/hooks/useSessions";

interface SessionCardProps {
  session: Session;
  index: number;
}

export function SessionCard({ session, index }: SessionCardProps) {
  const navigate = useNavigate();
  const [isTranscriptOpen, setIsTranscriptOpen] = useState(false);

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't navigate if clicking on interactive elements
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('[data-no-navigate]')) {
      return;
    }
    navigate(`/sessions/${session.id}`);
  };

  return (
    <div
      onClick={handleCardClick}
      className="rounded-xl border border-primary bg-card p-3 transition-all hover:shadow-md hover:border-primary/30 animate-fade-in group cursor-pointer"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent">
            <Clock className="h-4 w-4 text-accent-foreground" />
          </div>
          <div>
            <p className="font-medium text-foreground group-hover:text-primary transition-colors">
              {format(new Date(session.started_at), "MMM d, yyyy")}
            </p>
            <p className="text-sm text-muted-foreground">
              {format(new Date(session.started_at), "h:mm a")}
              {session.duration_minutes && ` · ${session.duration_minutes} min`}
            </p>
          </div>
        </div>
        <ExternalLink className="h-4 w-4 text-muted-foreground transition-opacity" />
      </div>
      
      {/* AI Summary */}
      {session.summary && (
        <div className="mt-4 p-3 rounded-lg bg-primary/5 border border-primary/10">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <p className="text-xs font-medium text-primary">AI Summary</p>
          </div>
          <p className="text-sm text-muted-foreground">{session.summary}</p>
        </div>
      )}

      {/* Transcription - Collapsible */}
      {session.transcript && (
        <Collapsible open={isTranscriptOpen} onOpenChange={setIsTranscriptOpen} className="mt-3">
          <CollapsibleTrigger asChild>
            <button className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors w-full justify-between p-2 rounded-lg hover:bg-muted/50">
              <div className="flex items-center gap-2">
                <Mic className="h-3.5 w-3.5" />
                <span>View Transcription</span>
              </div>
              {isTranscriptOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div data-no-navigate className="mt-2 p-3 rounded-lg bg-muted/30 border border-border max-h-[200px] overflow-y-auto">
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{session.transcript}</p>
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}
      
      {/* Action Points */}
      {session.action_points && session.action_points.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Action Points
          </p>
          <ul className="mt-2 space-y-1">
            {session.action_points.map((point, i) => (
              <li
                key={i}
                className="flex items-center gap-2 text-sm text-foreground"
              >
                <CheckCircle className="h-4 w-4 text-success shrink-0" />
                {point}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
